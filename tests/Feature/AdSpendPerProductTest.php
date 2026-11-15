<?php

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use App\Services\PeriodReport;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->merchant = Merchant::create(['name' => 'Boutique Démo']);
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->country = $this->merchant->countries()->create(['name' => 'Pays démo', 'code' => 'PD']);
    $this->agency1 = $this->country->agencies()->create(['name' => 'Agence 1']);
    $this->agency2 = $this->country->agencies()->create(['name' => 'Agence 2']);

    $this->product1 = $this->merchant->products()->create(['name' => 'Produit 1', 'reference_price' => 10000]);
    $this->product4 = $this->merchant->products()->create(['name' => 'Produit 4', 'reference_price' => 20000]);
    $this->product1->costs()->create(['unit_cost' => 3000, 'valid_from' => '2026-01-01']);
    $this->product4->costs()->create(['unit_cost' => 6000, 'valid_from' => '2026-01-01']);
});

/**
 * Posts a one-day report of 3 November 2026 for an agency, with its lines and its ads.
 *
 * @param  array<int, int>  $quantities  Quantity delivered per product id.
 * @param  list<array<string, mixed>>  $ads
 */
function postDayReport(Agency $agency, array $quantities, array $ads = [], bool $noAds = false): TestResponse
{
    return test()->actingAs(test()->user)->post('/rapports', [
        'agency_id' => $agency->id,
        'period_start' => '2026-11-03',
        'period_end' => '2026-11-03',
        'status' => Report::STATUS_COUNTED,
        'lines' => collect($quantities)->map(fn (int $quantity, int $productId) => [
            'product_id' => $productId,
            'quantity' => $quantity,
            'amount' => $quantity * Product::findOrFail($productId)->reference_price,
        ])->values()->all(),
        'ads' => $ads,
        'no_ads' => $noAds,
    ]);
}

/**
 * @return array<string, int> Ad spend per agency name, and the country total under "Total".
 */
function adSpendOfTheDay(): array
{
    $report = (new PeriodReport)->forCountry(test()->country, '2026-11-03', '2026-11-03');

    return collect($report['agencies'])
        ->mapWithKeys(fn (array $row) => [$row['name'] => $row['ad_spend']])
        ->put('Total', $report['total']['ad_spend'])
        ->all();
}

it('partage une même pub entre deux agences selon leurs livraisons du produit', function () {
    postDayReport($this->agency2, [$this->product4->id => 3], [
        ['product_id' => $this->product4->id, 'platform' => 'facebook', 'amount' => 3000],
    ])->assertSessionHasNoErrors();

    postDayReport($this->agency1, [$this->product4->id => 1], [
        ['product_id' => $this->product4->id, 'choice' => 'same'],
    ])->assertSessionHasNoErrors();

    expect(AdSpend::count())->toBe(1)
        ->and(AdSpend::first())->agency_id->toBeNull()->product_id->toBe($this->product4->id)
        ->and(adSpendOfTheDay())->toBe(['Agence 1' => 750, 'Agence 2' => 2250, 'Total' => 3000]);
});

it('garde une pub payée à part sur son agence, sans lui donner une part de la pub partagée', function () {
    postDayReport($this->agency2, [$this->product4->id => 3], [
        ['product_id' => $this->product4->id, 'platform' => 'facebook', 'amount' => 3000],
    ])->assertSessionHasNoErrors();

    postDayReport($this->agency1, [$this->product4->id => 1], [
        ['product_id' => $this->product4->id, 'choice' => 'separate', 'platform' => 'tiktok', 'amount' => 2000],
    ])->assertSessionHasNoErrors();

    expect(AdSpend::count())->toBe(2)
        ->and(AdSpend::where('agency_id', $this->agency1->id)->value('amount'))->toBe(2000)
        ->and(adSpendOfTheDay())->toBe(['Agence 1' => 2000, 'Agence 2' => 3000, 'Total' => 5000]);
});

it('ne compte jamais deux fois la pub d\'un produit dans le total du pays', function () {
    postDayReport($this->agency2, [$this->product4->id => 3, $this->product1->id => 2], [
        ['product_id' => $this->product4->id, 'platform' => 'facebook', 'amount' => 3000],
    ])->assertSessionHasNoErrors();

    // Agence 1 types the same ad again instead of choosing "same ad": it is not created a second time.
    postDayReport($this->agency1, [$this->product4->id => 1], [
        ['product_id' => $this->product4->id, 'platform' => 'facebook', 'amount' => 3000],
    ])->assertSessionHasNoErrors();

    // Correcting Agence 2's report rewrites its ad, it does not add one.
    $report = Report::where('agency_id', $this->agency2->id)->firstOrFail();
    $this->actingAs($this->user)->put("/rapports/{$report->id}", [
        'agency_id' => $this->agency2->id,
        'period_start' => '2026-11-03',
        'period_end' => '2026-11-03',
        'status' => Report::STATUS_COUNTED,
        'lines' => [['product_id' => $this->product4->id, 'quantity' => 3, 'amount' => 60000]],
        'ads' => [['product_id' => $this->product4->id, 'platform' => 'facebook', 'amount' => 3000]],
    ])->assertSessionHasNoErrors();

    expect(AdSpend::count())->toBe(1)
        ->and(adSpendOfTheDay()['Total'])->toBe(3000);
});

it('enregistre deux montants et un seul nombre de commandes avec Facebook et TikTok', function () {
    postDayReport($this->agency1, [$this->product1->id => 4], [
        ['product_id' => $this->product1->id, 'platform' => 'facebook_tiktok', 'facebook_amount' => 6000, 'tiktok_amount' => 4500, 'orders_received' => 14],
    ])->assertSessionHasNoErrors();

    expect(AdSpend::count())->toBe(1)
        ->and(AdSpend::first())
        ->platform->toBe('facebook_tiktok')
        ->facebook_amount->toBe(6000)
        ->tiktok_amount->toBe(4500)
        ->amount->toBe(10500)
        ->orders_received->toBe(14)
        ->and(adSpendOfTheDay()['Agence 1'])->toBe(10500);
});

it('n\'enregistre aucune pub quand « Pas de publicité aujourd\'hui » est coché', function () {
    postDayReport($this->agency1, [$this->product1->id => 4], [
        ['product_id' => $this->product1->id, 'platform' => 'facebook', 'amount' => 5000],
    ], noAds: true)->assertSessionHasNoErrors();

    expect(AdSpend::count())->toBe(0)
        ->and(Report::count())->toBe(1);
});

it('demande un montant et refuse la pub d\'un produit absent du rapport', function () {
    postDayReport($this->agency1, [$this->product1->id => 4], [
        ['product_id' => $this->product1->id, 'platform' => 'facebook'],
        ['product_id' => $this->product4->id, 'platform' => 'tiktok', 'amount' => 2000],
    ])->assertSessionHasErrors(['ads.0.amount', 'ads.1.product_id']);

    postDayReport($this->agency1, [$this->product1->id => 4], [
        ['product_id' => $this->product1->id, 'platform' => 'facebook_tiktok', 'facebook_amount' => 0, 'tiktok_amount' => 0],
    ])->assertSessionHasErrors(['ads.0.facebook_amount']);

    expect(Report::count())->toBe(0);
});

it('garde la pub partagée quand le rapport qui l\'a notée est supprimé', function () {
    postDayReport($this->agency2, [$this->product4->id => 3], [
        ['product_id' => $this->product4->id, 'platform' => 'facebook', 'amount' => 3000],
    ]);
    postDayReport($this->agency1, [$this->product4->id => 1], [
        ['product_id' => $this->product4->id, 'choice' => 'same'],
    ]);

    $this->actingAs($this->user)->delete('/rapports/'.Report::where('agency_id', $this->agency2->id)->value('id'));

    expect(AdSpend::count())->toBe(1)
        ->and(AdSpend::first()->report_id)->toBe(Report::where('agency_id', $this->agency1->id)->value('id'))
        ->and(adSpendOfTheDay())->toBe(['Agence 1' => 3000, 'Agence 2' => 0, 'Total' => 3000]);
});

it('retire la pub d\'un rapport supprimé quand aucune autre agence ne livre ce produit', function () {
    postDayReport($this->agency1, [$this->product1->id => 4], [
        ['product_id' => $this->product1->id, 'platform' => 'facebook', 'amount' => 10500],
    ]);
    postDayReport($this->agency2, [$this->product4->id => 2]);

    $this->actingAs($this->user)->delete('/rapports/'.Report::where('agency_id', $this->agency1->id)->value('id'));

    expect(AdSpend::count())->toBe(0)
        ->and(adSpendOfTheDay())->toBe(['Agence 1' => 0, 'Agence 2' => 0, 'Total' => 0]);
});

it('retire la pub à part d\'une agence avec son rapport supprimé', function () {
    postDayReport($this->agency2, [$this->product4->id => 3], [
        ['product_id' => $this->product4->id, 'platform' => 'facebook', 'amount' => 3000],
    ]);
    postDayReport($this->agency1, [$this->product4->id => 1], [
        ['product_id' => $this->product4->id, 'choice' => 'separate', 'platform' => 'tiktok', 'amount' => 2000],
    ]);

    $this->actingAs($this->user)->delete('/rapports/'.Report::where('agency_id', $this->agency1->id)->value('id'));

    expect(AdSpend::count())->toBe(1)
        ->and(AdSpend::first()->amount)->toBe(3000)
        ->and(adSpendOfTheDay())->toBe(['Agence 1' => 0, 'Agence 2' => 3000, 'Total' => 3000]);
});

it('répartit encore une ancienne pub sans produit selon le chiffre d\'affaires', function () {
    postDayReport($this->agency1, [$this->product1->id => 3]);
    postDayReport($this->agency2, [$this->product4->id => 3]);

    AdSpend::create([
        'country_id' => $this->country->id,
        'period_start' => '2026-11-03',
        'period_end' => '2026-11-03',
        'amount' => 9000,
        'platform' => 'facebook',
    ]);

    // Revenue: 30 000 F for Agence 1, 60 000 F for Agence 2.
    expect(adSpendOfTheDay())->toBe(['Agence 1' => 3000, 'Agence 2' => 6000, 'Total' => 9000]);
});

it('montre dans le formulaire la pub déjà notée par l\'autre agence', function () {
    postDayReport($this->agency2, [$this->product4->id => 3], [
        ['product_id' => $this->product4->id, 'platform' => 'facebook', 'amount' => 3000],
    ]);

    $this->actingAs($this->user)
        ->get('/rapports/saisie?agency_id='.$this->agency1->id.'&period_start=2026-11-03&period_end=2026-11-03')
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/create')
            ->has('sharedAds', 1)
            ->where('sharedAds.0.product_id', $this->product4->id)
            ->where('sharedAds.0.amount', 3000)
            ->where('sharedAds.0.noted_by', 'Agence 2')
        );

    $report = Report::firstOrFail();

    // Its own report does not offer to share the ad with itself.
    $this->actingAs($this->user)
        ->get("/rapports/{$report->id}/modifier")
        ->assertInertia(fn (Assert $page) => $page
            ->has('sharedAds', 0)
            ->where('report.ads.0.amount', 3000)
        );
});
