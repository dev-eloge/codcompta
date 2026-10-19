<?php

use App\Models\Agency;
use App\Models\Merchant;
use App\Models\ProductAlias;
use App\Services\Parsing\ProposalNormalizer;
use Database\Seeders\DemoWeekSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->agency = Agency::where('name', 'Agence 2')->firstOrFail();
    $this->products = Merchant::sole()->products()->pluck('id', 'name');
});

it('regroupe un même produit vendu à deux prix et nettoie les montants', function () {
    $result = (new ProposalNormalizer)->normalize($this->agency, ['reports' => [[
        'period_start' => '2026-10-12',
        'period_end' => '2026-10-18',
        'kind' => 'recap',
        'lines' => [
            ['label' => 'Produit 5', 'quantity' => 4, 'amount' => '40 000'],
            ['label' => 'PRODUIT 5 (petit prix)', 'quantity' => 4, 'amount' => 40000],
        ],
        'delivery_fees' => 12000,
        'closing_fees' => '7 000 F',
        'announced_total' => 80000,
    ]], 'warnings' => []]);

    expect($result['reports'])->toHaveCount(1)
        ->and($result['reports'][0]['lines'])->toBe([
            ['label' => 'Produit 5', 'product_id' => $this->products['Produit 5'], 'quantity' => 8, 'amount' => 80000],
        ])
        ->and($result['reports'][0]['closing_fees'])->toBe(7000)
        ->and($result['reports'][0]['other_fees'])->toBe(0)
        ->and($result['reports'][0]['suggested_status'])->toBe('counted');
});

it('utilise les noms appris pour cette agence', function () {
    ProductAlias::create(['agency_id' => $this->agency->id, 'product_id' => $this->products['Produit 1'], 'label' => 'article vert']);

    $result = (new ProposalNormalizer)->normalize($this->agency, ['reports' => [[
        'period_start' => '2026-10-14', 'period_end' => '2026-10-14',
        'lines' => [['label' => 'Article VERT', 'quantity' => 2, 'amount' => 24000], ['label' => 'Truc inconnu', 'quantity' => 1, 'amount' => 5000]],
    ]]]);

    expect($result['reports'][0]['lines'][0]['product_id'])->toBe($this->products['Produit 1'])
        ->and($result['reports'][0]['lines'][1]['product_id'])->toBeNull()
        ->and($result['reports'][0]['warnings'])->toContain('Produit « Truc inconnu » à choisir dans la liste.');
});

it('propose en détail un récap qui reprend les jours du même message', function () {
    $day = fn (string $date) => ['period_start' => $date, 'period_end' => $date, 'kind' => 'day', 'lines' => [['label' => 'PRODUIT 1', 'quantity' => 1, 'amount' => 12000]]];

    $result = (new ProposalNormalizer)->normalize($this->agency, ['reports' => [
        ['period_start' => '2026-10-12', 'period_end' => '2026-10-13', 'kind' => 'recap', 'lines' => [['label' => 'PRODUIT 1', 'quantity' => 2, 'amount' => 24000]]],
        $day('2026-10-13'),
        $day('2026-10-12'),
        ['period_start' => 'hier', 'lines' => []],
    ]]);

    expect(array_column($result['reports'], 'suggested_status'))->toBe(['counted', 'detail', 'counted'])
        ->and(array_column($result['reports'], 'period_end'))->toBe(['2026-10-12', '2026-10-13', '2026-10-13'])
        ->and($result['warnings'])->toContain('Un rapport sans date a été ignoré.');
});
