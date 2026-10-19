<?php

use App\Models\Agency;
use App\Models\Country;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\DemoWeekSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->merchant = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->country = Country::where('code', 'PD')->firstOrFail();
    $this->agency1 = Agency::where('name', 'Agence 1')->firstOrFail();
});

it('renvoie les visiteurs non connectés vers la connexion', function () {
    $this->get('/rapports')->assertRedirect('/login');
});

it('affiche le rapport de la semaine du 12 au 18/10 avec 300 626 F de bénéfice', function () {
    $this->actingAs($this->user)
        ->get('/rapports?period=week&date=2026-10-14')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/index')
            ->where('countryId', $this->country->id)
            ->where('period.from', '2026-10-12')
            ->where('period.to', '2026-10-18')
            ->where('period.label', 'du 12 au 18 octobre 2026')
            ->where('report.total.profit', 328000)
            ->where('report.agencies.0.ad_spend', 131538)
            ->has('entries', 8)
        );
});

it('affiche le rapport d\'un jour et d\'un mois', function () {
    $this->actingAs($this->user)
        ->get('/rapports?period=day&date=2026-10-12')
        ->assertInertia(fn (Assert $page) => $page
            ->where('report.agencies.0.revenue', 80000)
            ->has('entries', 1)
        );

    $this->actingAs($this->user)
        ->get('/rapports?period=month&date=2026-10-20')
        ->assertInertia(fn (Assert $page) => $page
            ->where('period.from', '2026-10-01')
            ->where('period.to', '2026-10-31')
            ->where('report.total.revenue', 650000)
        );
});

it('ne montre pas le pays d\'un autre commerçant', function () {
    $other = User::factory()->create(['merchant_id' => Merchant::create(['name' => 'Autre'])->id]);

    $this->actingAs($other)->get('/rapports?country='.$this->country->id)->assertNotFound();
});

it('enregistre un rapport saisi à la main avec le coût d\'achat du jour', function () {
    $product1 = Product::where('name', 'Produit 1')->firstOrFail();

    $this->actingAs($this->user)->post('/rapports', [
        'agency_id' => $this->agency1->id,
        'period_start' => '2026-10-19',
        'period_end' => '2026-10-19',
        'status' => 'counted',
        'delivery_fees' => 5000,
        'announced_total' => 26000,
        'lines' => [['product_id' => $product1->id, 'quantity' => 2, 'amount' => 26000]],
    ])->assertRedirect(route('reports.index', ['country' => $this->country->id, 'period' => 'week', 'date' => '2026-10-19']))
        ->assertSessionHas('success');

    $report = Report::latest('id')->first();

    expect($report->status)->toBe(Report::STATUS_COUNTED)
        ->and($report->source)->toBe(Report::SOURCE_MANUAL)
        ->and($report->validated_by)->toBe($this->user->id)
        ->and($report->lines->first()->unit_cost_applied)->toBe(500)
        ->and($this->agency1->fresh()->last_report_at->toDateString())->toBe('2026-10-19');
});

it('met de côté un rapport dont le total ne correspond pas à l\'annonce de l\'agence (RG-09)', function () {
    $product1 = Product::where('name', 'Produit 1')->firstOrFail();

    $this->actingAs($this->user)->post('/rapports', [
        'agency_id' => $this->agency1->id,
        'period_start' => '2026-10-19',
        'period_end' => '2026-10-19',
        'status' => 'counted',
        'announced_total' => 30000,
        'lines' => [['product_id' => $product1->id, 'quantity' => 2, 'amount' => 26000]],
    ])->assertSessionHas('warning');

    expect(Report::latest('id')->first()->status)->toBe(Report::STATUS_TO_VERIFY);
});

it('refuse un deuxième rapport compté sur des jours déjà saisis (RG-07)', function () {
    $product1 = Product::where('name', 'Produit 1')->firstOrFail();

    $payload = [
        'agency_id' => $this->agency1->id,
        'period_start' => '2026-10-12',
        'period_end' => '2026-10-18',
        'status' => 'counted',
        'lines' => [['product_id' => $product1->id, 'quantity' => 20, 'amount' => 258000]],
    ];

    $this->actingAs($this->user)->post('/rapports', $payload)->assertSessionHasErrors('period_start');

    $this->actingAs($this->user)->post('/rapports', [...$payload, 'status' => 'detail'])->assertSessionHasNoErrors();
});

it('refuse l\'agence ou le produit d\'un autre commerçant', function () {
    $other = Merchant::create(['name' => 'Autre']);
    $otherProduct = $other->products()->create(['name' => 'Autre produit']);

    $this->actingAs($this->user)->post('/rapports', [
        'agency_id' => 999999,
        'period_start' => '2026-10-19',
        'period_end' => '2026-10-19',
        'status' => 'counted',
        'lines' => [['product_id' => $otherProduct->id, 'quantity' => 1, 'amount' => 1000]],
    ])->assertSessionHasErrors(['agency_id', 'lines.0.product_id']);
});

it('demande le coût d\'achat d\'un produit qui n\'en a pas encore', function () {
    $newProduct = $this->merchant->products()->create(['name' => 'Nouveau produit']);

    $this->actingAs($this->user)->post('/rapports', [
        'agency_id' => $this->agency1->id,
        'period_start' => '2026-10-19',
        'period_end' => '2026-10-19',
        'status' => 'counted',
        'lines' => [['product_id' => $newProduct->id, 'quantity' => 1, 'amount' => 10000]],
    ])->assertSessionHasErrors('lines.0.product_id');
});

it('affiche le formulaire de saisie avec les agences et les produits', function () {
    $this->actingAs($this->user)
        ->get('/rapports/saisie')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/create')
            ->has('agencies', 2)
            ->has('products', 5)
        );
});
