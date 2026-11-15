<?php

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Merchant;
use App\Models\Report;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->merchant = Merchant::create(['name' => 'Boutique Démo']);
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->product = $this->merchant->products()->create(['name' => 'Produit 1', 'reference_price' => 10000]);
    $this->togo = $this->merchant->countries()->create(['name' => 'Togo', 'code' => 'TG']);
    $this->benin = $this->merchant->countries()->create(['name' => 'Bénin', 'code' => 'BJ']);
    $this->agencyTogo = $this->togo->agencies()->create(['name' => 'Agence 1']);
    $this->agencyBenin = $this->benin->agencies()->create(['name' => 'Agence 2']);
});

/**
 * A counted one-day report: products sold at 10 000 F, bought 3 000 F each, plus delivery fees.
 */
function sold(Agency $agency, string $day, int $quantity, int $deliveryFees = 0): void
{
    $report = $agency->reports()->create([
        'period_start' => $day,
        'period_end' => $day,
        'delivery_fees' => $deliveryFees,
        'status' => Report::STATUS_COUNTED,
    ]);
    $report->lines()->create([
        'product_id' => test()->product->id,
        'quantity' => $quantity,
        'amount' => $quantity * 10000,
        'unit_cost_applied' => 3000,
    ]);
}

it('additionne tous les pays sans conversion dans la vue générale', function () {
    sold($this->agencyTogo, '2026-10-13', 10);
    sold($this->agencyBenin, '2026-10-14', 4);
    AdSpend::create([
        'country_id' => $this->togo->id,
        'product_id' => $this->product->id,
        'period_start' => '2026-10-13',
        'period_end' => '2026-10-13',
        'platform' => 'facebook',
        'amount' => 10000,
    ]);
    // The week before, in Togo only.
    sold($this->agencyTogo, '2026-10-06', 2);

    $this->actingAs($this->user)
        ->get('/rapports?vue=generale&period=week&date=2026-10-14')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/index')
            ->where('view', 'generale')
            ->where('overview.total.revenue', 140000)
            ->where('overview.total.ad_spend', 10000)
            ->where('overview.total.delivered', 14)
            // 140 000 − 42 000 bought − 10 000 of ad.
            ->where('overview.total.profit', 88000)
            ->where('overview.total.split.0.amount', 35200)
            ->where('overview.previous_profit', 14000)
            ->where('overview.countries.0.name', 'Togo')
            ->where('overview.countries.0.profit', 60000)
            ->where('overview.countries.1.name', 'Bénin')
            ->where('overview.products.0.profit', 88000)
            ->where('overview.platforms.0.platform', 'facebook')
            ->where('overview.platforms.0.cost_per_delivery', 1000)
        );
});

it('classe les pays du plus rentable au moins rentable, avec un pays en perte', function () {
    sold($this->agencyTogo, '2026-10-13', 1, deliveryFees: 20000);
    sold($this->agencyBenin, '2026-10-14', 5);

    $this->actingAs($this->user)
        ->get('/rapports?vue=pays&period=week&date=2026-10-14')
        ->assertInertia(fn (Assert $page) => $page
            ->where('view', 'pays')
            ->where('overview.countries.0.name', 'Bénin')
            ->where('overview.countries.0.share', 1)
            ->where('overview.countries.1.name', 'Togo')
            ->where('overview.countries.1.profit', -13000)
            ->where('overview.countries.1.share', 0)
            ->where('overview.total.profit', 22000)
        );
});

it('se souvient de la vue choisie et la quitte en choisissant un pays', function () {
    $this->actingAs($this->user)->get('/rapports?vue=pays&period=week&date=2026-10-14');
    $this->actingAs($this->user)->get('/rapports')->assertInertia(fn (Assert $page) => $page->where('view', 'pays'));

    $this->actingAs($this->user)
        ->get('/rapports?country='.$this->togo->id.'&period=week&date=2026-10-14')
        ->assertInertia(fn (Assert $page) => $page->where('view', 'country')->where('countryId', $this->togo->id));
    $this->actingAs($this->user)->get('/rapports')->assertInertia(fn (Assert $page) => $page->where('view', 'country'));
});
