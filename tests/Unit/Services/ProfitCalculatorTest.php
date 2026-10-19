<?php

use App\Services\ProfitCalculator;

/*
 * Test de référence (données fictives de démonstration) :
 * un pays, semaine du 12 au 18/10/2026, deux agences, 150 000 F de pub.
 */
function demoWeek(): array
{
    return (new ProfitCalculator)->forAgencies([
        ['name' => 'Agence 1', 'delivered' => 48, 'revenue' => 570000, 'purchase_cost' => 27000, 'closing_fees' => 0, 'delivery_fees' => 114000],
        ['name' => 'Agence 2', 'delivered' => 8, 'revenue' => 80000, 'purchase_cost' => 12000, 'closing_fees' => 7000, 'delivery_fees' => 12000],
    ], sharedAdSpend: 150000);
}

it('retrouve le bénéfice de la semaine de démo du 12 au 18/10 au franc près', function () {
    $result = demoWeek();

    expect($result['agencies'][0]['ad_spend'])->toBe(131538)
        ->and($result['agencies'][0]['profit'])->toBe(297462)
        ->and($result['agencies'][1]['ad_spend'])->toBe(18462)
        ->and($result['agencies'][1]['profit'])->toBe(30538)
        ->and($result['total']['profit'])->toBe(328000)
        ->and($result['total']['revenue'])->toBe(650000)
        ->and($result['total']['delivered'])->toBe(56);
});

it('calcule la marge sur le chiffre d\'affaires (RG-02)', function () {
    $result = demoWeek();

    expect(round($result['total']['margin'], 3))->toBe(0.505)
        ->and(round($result['agencies'][1]['margin'], 3))->toBe(0.382);
});

it('répartit le bénéfice en épargne, poche et réinvestissement (RG-03)', function () {
    $total = demoWeek()['total'];

    expect($total['savings'])->toBe(131200)
        ->and($total['pocket'])->toBe(65600)
        ->and($total['reinvestment'])->toBe(131200);
});

it('garde la répartition sur un bénéfice négatif, comme le Sheet actuel', function () {
    $total = (new ProfitCalculator)->forAgencies([
        ['revenue' => 0, 'purchase_cost' => 0, 'delivery_fees' => 0],
    ], sharedAdSpend: 6500)['total'];

    expect($total['profit'])->toBe(-6500)
        ->and($total['savings'])->toBe(-2600)
        ->and($total['margin'])->toBe(0.0);
});

it('ajoute la pub payée directement par une agence à sa part de pub partagée', function () {
    $result = (new ProfitCalculator)->forAgencies([
        ['revenue' => 100000, 'direct_ad_spend' => 5000],
        ['revenue' => 100000],
    ], sharedAdSpend: 10000);

    expect($result['agencies'][0]['ad_spend'])->toBe(10000)
        ->and($result['agencies'][1]['ad_spend'])->toBe(5000)
        ->and($result['total']['ad_spend'])->toBe(15000);
});

it('refuse des parts de répartition qui ne font pas 100 %', function () {
    new ProfitCalculator(shares: ['savings' => 50, 'pocket' => 20, 'reinvestment' => 40]);
})->throws(InvalidArgumentException::class);
