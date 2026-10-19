<?php

namespace Database\Seeders;

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Country;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\Report;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Fictional demo data: one country, two agencies, week of 12 to 18 October 2026.
 * Used by the tests and the local demo account. Expected net profit for the week: see the tests.
 */
class DemoWeekSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $merchant = Merchant::firstOrCreate(['name' => 'Boutique Démo']);

        $products = collect([
            'Produit 1' => 500,
            'Produit 2' => 1000,
            'Produit 3' => 400,
            'Produit 4' => 300,
            'Produit 5' => 1500,
        ])->mapWithKeys(function (int $unitCost, string $name) use ($merchant) {
            $product = $merchant->products()->create(['name' => $name]);
            $product->costs()->create(['unit_cost' => $unitCost, 'valid_from' => '2026-01-01']);

            return [$name => $product];
        });

        $country = Country::create(['merchant_id' => $merchant->id, 'name' => 'Pays démo', 'code' => 'PD']);

        $agency1 = Agency::create(['country_id' => $country->id, 'name' => 'Agence 1', 'report_mode' => 'daily_message']);
        $agency2 = Agency::create(['country_id' => $country->id, 'name' => 'Agence 2', 'report_mode' => 'weekly_message']);

        // Daily reports of Agence 1: [date, delivery fees, announced total, [product => [quantity, amount]]].
        $agency1Days = [
            ['2026-10-12', 15000, 80000, ['Produit 3' => [3, 30000], 'Produit 2' => [4, 50000]]],
            ['2026-10-13', 25000, 120000, ['Produit 3' => [5, 50000], 'Produit 1' => [1, 12000], 'Produit 2' => [4, 58000]]],
            ['2026-10-14', 30000, 150000, ['Produit 1' => [4, 48000], 'Produit 3' => [7, 72000], 'Produit 2' => [2, 30000]]],
            ['2026-10-15', 16000, 85000, ['Produit 3' => [1, 10000], 'Produit 1' => [6, 75000]]],
            ['2026-10-16', 10000, 50000, ['Produit 1' => [4, 50000]]],
            ['2026-10-17', 12000, 60000, ['Produit 1' => [3, 38000], 'Produit 4' => [2, 22000]]],
            ['2026-10-18', 6000, 25000, ['Produit 1' => [2, 25000]]],
        ];

        foreach ($agency1Days as [$date, $deliveryFees, $announcedTotal, $lines]) {
            $this->createReport($agency1, $products, $date, $date, $lines, [
                'delivery_fees' => $deliveryFees,
                'announced_total' => $announcedTotal,
            ]);
        }

        // Weekly report of Agence 2: shipping to another town is added to delivery fees.
        $this->createReport($agency2, $products, '2026-10-12', '2026-10-18', ['Produit 5' => [8, 80000]], [
            'delivery_fees' => 12000,
            'closing_fees' => 7000,
            'announced_total' => 80000,
        ]);

        AdSpend::create([
            'country_id' => $country->id,
            'period_start' => '2026-10-12',
            'period_end' => '2026-10-18',
            'amount' => 150000,
            'platform' => 'meta',
        ]);
    }

    /**
     * @param  Collection<string, Product>  $products
     * @param  array<string, array{0: int, 1: int}>  $lines
     * @param  array<string, int>  $fees
     */
    private function createReport(Agency $agency, Collection $products, string $start, string $end, array $lines, array $fees): Report
    {
        $report = $agency->reports()->create([
            'period_start' => $start,
            'period_end' => $end,
            'status' => Report::STATUS_COUNTED,
            'source' => Report::SOURCE_MESSAGE,
            ...$fees,
        ]);

        foreach ($lines as $productName => [$quantity, $amount]) {
            $product = $products[$productName];

            $report->lines()->create([
                'product_id' => $product->id,
                'quantity' => $quantity,
                'amount' => $amount,
                'unit_cost_applied' => $product->costAt($end),
            ]);
        }

        $agency->update(['last_report_at' => $end]);

        return $report;
    }
}
