<?php

use App\Models\Agency;
use App\Models\Country;
use App\Models\Product;
use App\Models\Report;
use App\Services\PeriodReport;
use Database\Seeders\DemoWeekSeeder;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->country = Country::where('code', 'PD')->firstOrFail();
});

it('retrouve depuis la base le bénéfice de la semaine de démo du 12 au 18/10', function () {
    $report = (new PeriodReport)->forCountry($this->country, '2026-10-12', '2026-10-18');

    expect($report['agencies'][0])
        ->delivered->toBe(48)
        ->revenue->toBe(570000)
        ->purchase_cost->toBe(27000)
        ->ad_spend->toBe(131538)
        ->profit->toBe(297462);

    expect($report['agencies'][1])
        ->revenue->toBe(80000)
        ->purchase_cost->toBe(12000)
        ->profit->toBe(30538);

    expect($report['total']['profit'])->toBe(328000);
});

it('donne le rapport d\'un seul jour', function () {
    $report = (new PeriodReport)->forCountry($this->country, '2026-10-12', '2026-10-12');

    expect($report['agencies'][0]['revenue'])->toBe(80000)
        ->and($report['agencies'][0]['delivery_fees'])->toBe(15000)
        ->and($report['agencies'][1]['revenue'])->toBe(0);
});

it('ne compte pas une ligne de détail ni une ligne à vérifier (RG-07, RG-09)', function () {
    $agency1 = Agency::where('name', 'Agence 1')->firstOrFail();

    $agency1->reports()->create([
        'period_start' => '2026-10-14',
        'period_end' => '2026-10-14',
        'delivery_fees' => 99000,
        'status' => Report::STATUS_DETAIL,
    ]);

    $agency1->reports()->create([
        'period_start' => '2026-10-15',
        'period_end' => '2026-10-15',
        'delivery_fees' => 99000,
        'status' => Report::STATUS_TO_VERIFY,
    ]);

    $report = (new PeriodReport)->forCountry($this->country, '2026-10-12', '2026-10-18');

    expect($report['total']['profit'])->toBe(328000);
});

it('range un rapport dans la période de sa date de fin (RG-06)', function () {
    $report = (new PeriodReport)->forCountry($this->country, '2026-10-05', '2026-10-17');

    expect($report['agencies'][1]['revenue'])->toBe(0);
});

it('applique le coût d\'achat valable à la date du rapport (RG-04)', function () {
    $product1 = Product::where('name', 'Produit 1')->firstOrFail();
    $product1->costs()->create(['unit_cost' => 650, 'valid_from' => '2026-11-01']);

    expect($product1->costAt('2026-10-18'))->toBe(500)
        ->and($product1->costAt('2026-11-02'))->toBe(650);
});

it('signale une agence muette depuis plus de 2 jours (RG-08)', function () {
    $agency1 = Agency::where('name', 'Agence 1')->firstOrFail();

    expect($agency1->isLate(now()->setDate(2026, 10, 20)))->toBeFalse()
        ->and($agency1->isLate(now()->setDate(2026, 10, 21)))->toBeTrue();
});
