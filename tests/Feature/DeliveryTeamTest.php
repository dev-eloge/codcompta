<?php

use App\Models\Agency;
use App\Models\Closer;
use App\Models\Courier;
use App\Models\Merchant;
use App\Models\Report;
use App\Models\User;
use App\Services\PeriodReport;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->merchant = Merchant::create(['name' => 'Boutique Démo']);
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->country = $this->merchant->countries()->create(['name' => 'Togo', 'code' => 'TG']);
    $this->product = $this->merchant->products()->create(['name' => 'Produit 1', 'reference_price' => 10000]);
    $this->product->costs()->create(['unit_cost' => 3000, 'valid_from' => '2026-01-01']);
});

/**
 * Sets the country to "own team" with two couriers and two closers, and monthly fixed costs of 35 000 F.
 */
function withTeam(): Agency
{
    test()->actingAs(test()->user)->put('/referentiel/pays/'.test()->country->id.'/equipe', [
        'delivery_mode' => 'team',
        'couriers' => [
            ['name' => 'Livreur 1', 'pay_mode' => 'per_delivery', 'pay_amount' => 1000],
            ['name' => 'Livreur 2', 'pay_mode' => 'monthly', 'pay_amount' => 60000],
        ],
        'closers' => [
            ['name' => 'Closeuse 1', 'pay_mode' => 'per_delivered_order', 'pay_amount' => 500],
            ['name' => 'Closeuse 2', 'pay_mode' => 'monthly', 'pay_amount' => 40000],
        ],
        'bike_rent' => 30000,
        'phone_credit' => 5000,
    ])->assertSessionHasNoErrors();

    test()->country->refresh();

    return test()->country->ownTeam()->firstOrFail();
}

function teamReport(Agency $team, string $day, int $delivered, array $counts, int $fuel = 0): void
{
    $courier = fn (string $name) => Courier::where('name', $name)->value('id');
    $closer = fn (string $name) => Closer::where('name', $name)->value('id');

    test()->actingAs(test()->user)->post('/rapports', [
        'agency_id' => $team->id,
        'period_start' => $day,
        'period_end' => $day,
        'status' => Report::STATUS_COUNTED,
        'lines' => [['product_id' => test()->product->id, 'quantity' => $delivered, 'amount' => $delivered * 10000]],
        'fuel_fees' => $fuel,
        'team' => [
            ['type' => 'courier', 'id' => $courier('Livreur 1'), 'count' => $counts[0]],
            ['type' => 'courier', 'id' => $courier('Livreur 2'), 'count' => $counts[1]],
            ['type' => 'closer', 'id' => $closer('Closeuse 1'), 'count' => $counts[2]],
            ['type' => 'closer', 'id' => $closer('Closeuse 2'), 'count' => $counts[3]],
        ],
    ])->assertSessionHasNoErrors();
}

it('enregistre qui livre et l\'équipe du pays, et crée la ligne « Mon équipe »', function () {
    $team = withTeam();

    expect($this->country->fresh())->delivery_mode->toBe('team')->bike_rent->toBe(30000)
        ->and($team->name)->toBe('Mon équipe')
        ->and($this->country->couriers()->count())->toBe(2)
        ->and($this->country->closers()->count())->toBe(2);

    // Saving again keeps the members, updates them and removes those taken off.
    $livreur1 = Courier::where('name', 'Livreur 1')->firstOrFail();
    $this->actingAs($this->user)->put('/referentiel/pays/'.$this->country->id.'/equipe', [
        'delivery_mode' => 'both',
        'couriers' => [['id' => $livreur1->id, 'name' => 'Livreur 1', 'pay_mode' => 'per_day', 'pay_amount' => 3000]],
        'closers' => [],
    ])->assertSessionHasNoErrors();

    expect($livreur1->fresh()->pay_mode)->toBe('per_day')
        ->and($this->country->couriers()->count())->toBe(1)
        ->and($this->country->closers()->count())->toBe(0)
        ->and($this->country->agencies()->where('is_own_team', true)->count())->toBe(1);

    $this->get('/referentiel/pays/'.$this->country->id.'/equipe')
        ->assertInertia(fn (Assert $page) => $page->component('reference/team')->where('country.delivery_mode', 'both')->has('couriers', 1));
});

it('calcule les paiements du jour : par livraison, par commande, par jour, et rien pour un salaire du mois', function () {
    $courier = new Courier(['pay_mode' => Courier::PAY_PER_DELIVERY, 'pay_amount' => 1000]);
    $dailyCourier = new Courier(['pay_mode' => Courier::PAY_PER_DAY, 'pay_amount' => 3000]);
    $monthlyCourier = new Courier(['pay_mode' => Courier::PAY_MONTHLY, 'pay_amount' => 60000]);
    $closer = new Closer(['pay_mode' => Closer::PAY_PER_DELIVERED_ORDER, 'pay_amount' => 500]);
    $confirmedCloser = new Closer(['pay_mode' => Closer::PAY_PER_CONFIRMED_ORDER, 'pay_amount' => 300]);

    expect($courier->payFor(3))->toBe(3000)
        ->and($dailyCourier->payFor(4))->toBe(3000)
        ->and($dailyCourier->payFor(0))->toBe(0)
        ->and($monthlyCourier->payFor(5))->toBe(0)
        ->and($closer->payFor(3))->toBe(1500)
        ->and($confirmedCloser->payFor(10))->toBe(3000);
});

it('retire du rapport du jour ce qui est payé chaque jour, avec le carburant', function () {
    $team = withTeam();
    teamReport($team, '2026-11-03', 5, [3, 2, 3, 2], fuel: 2000);

    $report = Report::firstOrFail();

    expect($report)->delivery_fees->toBe(3000)->closing_fees->toBe(1500)->fuel_fees->toBe(2000)
        ->and($report->teamEntries)->toHaveCount(4)
        ->and($report->teamEntries->firstWhere('name', 'Livreur 2')->amount)->toBe(0);

    // 50 000 sold − 15 000 bought − 3 000 couriers − 1 500 closers − 2 000 fuel.
    $day = (new PeriodReport)->forCountry($this->country, '2026-11-03', '2026-11-03');
    expect($day['total']['profit'])->toBe(28500);
});

it('retire les salaires du mois et les frais fixes une seule fois, dans le bénéfice du mois', function () {
    Carbon::setTestNow('2026-10-15');
    $team = withTeam();
    Carbon::setTestNow();

    teamReport($team, '2026-11-03', 5, [3, 2, 3, 2]);
    teamReport($team, '2026-11-04', 5, [3, 2, 3, 2]);

    $calculator = new PeriodReport;
    $week = $calculator->forCountry($this->country, '2026-11-02', '2026-11-08')['total'];
    $november = $calculator->forCountry($this->country, '2026-11-01', '2026-11-30')['total'];
    $twoMonths = $calculator->forCountry($this->country, '2026-10-01', '2026-11-30')['total'];

    // Each day: 50 000 − 15 000 − 3 000 − 1 500 = 30 500.
    expect($week['profit'])->toBe(61000)
        // Once in the month: 60 000 + 40 000 of salaries, 35 000 of fixed costs.
        ->and($november['profit'])->toBe(61000 - 135000)
        ->and($november['delivery_fees'])->toBe(6000 + 60000)
        ->and($november['closing_fees'])->toBe(3000 + 40000)
        ->and($november['other_fees'])->toBe(35000)
        // October and November each count once.
        ->and($twoMonths['profit'])->toBe(61000 - 2 * 135000);
});

it('refuse un membre d\'un autre pays et l\'équipe dans le rapport d\'une agence', function () {
    $team = withTeam();
    $agency = $this->country->agencies()->create(['name' => 'Agence 1']);
    $other = $this->merchant->countries()->create(['name' => 'Bénin', 'code' => 'BJ']);
    $stranger = Courier::factory()->create(['country_id' => $other->id]);

    $post = fn (Agency $to, int $courierId) => $this->actingAs($this->user)->post('/rapports', [
        'agency_id' => $to->id,
        'period_start' => '2026-11-03',
        'period_end' => '2026-11-03',
        'status' => Report::STATUS_COUNTED,
        'lines' => [['product_id' => $this->product->id, 'quantity' => 1, 'amount' => 10000]],
        'team' => [['type' => 'courier', 'id' => $courierId, 'count' => 1]],
    ]);

    $post($team, $stranger->id)->assertSessionHasErrors('team.0.id');
    $post($agency, Courier::where('name', 'Livreur 1')->value('id'))->assertSessionHasErrors('team');

    expect(Report::count())->toBe(0);
});

it('propose « Mon équipe » en premier dans le formulaire, avec ses livreurs et closeuses', function () {
    withTeam();
    $this->country->agencies()->create(['name' => 'Agence 1']);

    $this->actingAs($this->user)->get('/rapports/saisie')
        ->assertInertia(fn (Assert $page) => $page
            ->where('agencies.0.name', 'Mon équipe')
            ->where('agencies.0.is_own_team', true)
            ->has('agencies.0.couriers', 2)
            ->has('agencies.0.closers', 2)
            ->where('agencies.1.is_own_team', false)
        );
});
