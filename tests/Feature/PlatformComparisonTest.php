<?php

use App\Models\AdSpend;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use App\Services\PlatformComparison;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->merchant = Merchant::create(['name' => 'Boutique Démo']);
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->country = $this->merchant->countries()->create(['name' => 'Pays démo', 'code' => 'PD']);
    $this->agency = $this->country->agencies()->create(['name' => 'Agence 1']);
    $this->product1 = $this->merchant->products()->create(['name' => 'Produit 1', 'reference_price' => 10000]);
    $this->product4 = $this->merchant->products()->create(['name' => 'Produit 4', 'reference_price' => 20000]);
});

/**
 * A counted report of the agency: the given quantity of a product at its selling price, bought 3 000 F each.
 */
function deliver(Product $product, string $start, int $quantity, ?string $end = null): void
{
    $report = test()->agency->reports()->create([
        'period_start' => $start,
        'period_end' => $end ?? $start,
        'status' => Report::STATUS_COUNTED,
    ]);
    $report->lines()->create([
        'product_id' => $product->id,
        'quantity' => $quantity,
        'amount' => $quantity * $product->reference_price,
        'unit_cost_applied' => 3000,
    ]);
}

function advertise(Product $product, string $day, ?string $platform, int $amount, ?int $orders = null): void
{
    AdSpend::create([
        'country_id' => test()->country->id,
        'product_id' => $product->id,
        'period_start' => $day,
        'period_end' => $day,
        'platform' => $platform,
        'amount' => $amount,
        'orders_received' => $orders,
    ]);
}

function compareOctober(): array
{
    return collect((new PlatformComparison)->forCountry(test()->country, '2026-10-01', '2026-10-31'))->keyBy('product')->all();
}

it('regroupe les jours par plateforme et désigne celle qui laisse le plus par jour', function () {
    // Facebook et TikTok : 2 days, 4 then 6 delivered, 5 000 F of ad each day.
    advertise($this->product1, '2026-10-01', 'facebook_tiktok', 5000, 8);
    advertise($this->product1, '2026-10-02', 'facebook_tiktok', 5000, 9);
    deliver($this->product1, '2026-10-01', 4);
    deliver($this->product1, '2026-10-02', 6);
    // TikTok : 1 day, 3 delivered, 2 000 F.
    advertise($this->product1, '2026-10-03', 'tiktok', 2000);
    deliver($this->product1, '2026-10-03', 3);
    // Facebook and TikTok noted separately the same day count as both together.
    advertise($this->product1, '2026-10-04', 'facebook', 1000);
    advertise($this->product1, '2026-10-04', 'tiktok', 1000);

    $product = compareOctober()['Produit 1'];

    expect($product['winner'])->toBe('facebook_tiktok')
        ->and($product['groups'])->toHaveCount(2)
        ->and($product['groups'][0])->toMatchArray([
            'platform' => 'facebook_tiktok',
            'days' => 3,
            'ad_spend' => 12000,
            'orders' => 17,
            'delivered' => 10,
            // 100 000 F sold − 30 000 F bought − 12 000 F of ad.
            'profit' => 58000,
            'profit_per_day' => 19333,
            'cost_per_delivery' => 1200,
        ])
        ->and($product['groups'][1])->toMatchArray([
            'platform' => 'tiktok',
            'days' => 1,
            'delivered' => 3,
            'profit' => 19000,
            'profit_per_day' => 19000,
            'orders' => null,
        ]);
});

it('n\'a rien à comparer avec une seule plateforme', function () {
    advertise($this->product4, '2026-10-05', 'facebook', 3000, 4);
    deliver($this->product4, '2026-10-05', 2);

    $product = compareOctober()['Produit 4'];

    expect($product['winner'])->toBeNull()
        ->and($product['groups'])->toHaveCount(1)
        ->and($product['groups'][0]['cost_per_order'])->toBe(750);
});

it('signale les jours de pub sans plateforme notée sans les compter', function () {
    advertise($this->product1, '2026-10-06', null, 3000);
    advertise($this->product1, '2026-10-07', null, 3000);
    advertise($this->product1, '2026-10-08', 'facebook', 3000);

    $product = compareOctober()['Produit 1'];

    expect($product['unnoted_days'])->toBe(2)
        ->and($product['groups'])->toHaveCount(1)
        ->and($product['groups'][0]['ad_spend'])->toBe(3000);
});

it('ne compte pas les livraisons d\'un rapport à cheval sur deux plateformes', function () {
    advertise($this->product1, '2026-10-10', 'facebook', 2000);
    advertise($this->product1, '2026-10-11', 'tiktok', 2000);
    deliver($this->product1, '2026-10-10', 5, end: '2026-10-11');

    $groups = collect(compareOctober()['Produit 1']['groups']);

    expect($groups->sum('delivered'))->toBe(0);
});

it('affiche l\'onglet « Quelle plateforme rapporte le plus »', function () {
    advertise($this->product1, '2026-10-01', 'facebook', 2000);

    $this->actingAs($this->user)
        ->get('/pub/plateformes?pays='.$this->country->id.'&period=month&date=2026-10-15')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ad-spends/platforms')
            ->where('period.from', '2026-10-01')
            ->has('products', 1)
            ->where('products.0.product', 'Produit 1')
        );
});

it('filtre les pubs sans plateforme notée pour les compléter', function () {
    advertise($this->product1, '2026-10-06', null, 3000);
    advertise($this->product1, '2026-10-08', 'facebook', 3000);

    $this->actingAs($this->user)
        ->get('/pub?sans_plateforme=1&produit='.$this->product1->id)
        ->assertInertia(fn (Assert $page) => $page->has('adSpends', 1)->where('adSpends.0.platform', null));
});
