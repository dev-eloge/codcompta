<?php

namespace App\Services;

use InvalidArgumentException;

/**
 * Computes profit, margin and profit split for a set of agencies over one period.
 *
 * Every rule here comes from the project file, phase 7 (RG-01 to RG-05).
 * Amounts are integers in FCFA; only the margin is a float.
 */
class ProfitCalculator
{
    private const AMOUNT_KEYS = ['delivered', 'revenue', 'purchase_cost', 'closing_fees', 'delivery_fees', 'other_fees', 'direct_ad_spend'];

    /**
     * @param  array{savings: int, pocket: int, reinvestment: int}  $shares  Profit split in percent (RG-03).
     */
    public function __construct(
        private readonly AdSpendAllocator $allocator = new AdSpendAllocator,
        private readonly array $shares = ['savings' => 40, 'pocket' => 20, 'reinvestment' => 40],
    ) {
        if (array_sum($this->shares) !== 100) {
            throw new InvalidArgumentException('Les parts de répartition doivent faire 100 %.');
        }
    }

    /**
     * @param  list<array<string, mixed>>  $agencies  Each item may hold: name, delivered, revenue,
     *                                                purchase_cost, closing_fees, delivery_fees,
     *                                                other_fees, direct_ad_spend. Missing amounts count as 0.
     * @param  int  $sharedAdSpend  Ad spend paid for the whole country, split by revenue (RG-05).
     * @return array{agencies: list<array<string, mixed>>, total: array<string, mixed>}
     */
    public function forAgencies(array $agencies, int $sharedAdSpend = 0): array
    {
        $agencies = array_map(fn (array $agency) => $this->withDefaults($agency), $agencies);

        $adShares = $this->allocator->allocate($sharedAdSpend, array_column($agencies, 'revenue'));

        $rows = [];

        foreach ($agencies as $index => $agency) {
            $agency['ad_spend'] = ($adShares[$index] ?? 0) + $agency['direct_ad_spend'];
            $rows[] = $this->withResults($agency);
        }

        return [
            'agencies' => $rows,
            'total' => $this->withResults($this->sumOf($rows)),
        ];
    }

    /**
     * @param  array<string, mixed>  $agency
     * @return array<string, mixed>
     */
    private function withDefaults(array $agency): array
    {
        foreach (self::AMOUNT_KEYS as $key) {
            $agency[$key] = (int) ($agency[$key] ?? 0);
        }

        return $agency;
    }

    /**
     * Adds profit (RG-01), margin (RG-02) and the profit split (RG-03).
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function withResults(array $row): array
    {
        $profit = $row['revenue']
            - $row['purchase_cost']
            - $row['ad_spend']
            - $row['closing_fees']
            - $row['delivery_fees']
            - $row['other_fees'];

        $row['profit'] = $profit;
        $row['margin'] = $row['revenue'] === 0 ? 0.0 : $profit / $row['revenue'];
        $row['ad_spend_per_delivered'] = $row['delivered'] === 0 ? 0 : (int) round($row['ad_spend'] / $row['delivered']);

        foreach ($this->shares as $name => $percent) {
            $row[$name] = (int) round($profit * $percent / 100);
        }

        return $row;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function sumOf(array $rows): array
    {
        $total = ['name' => 'Total'];

        foreach ([...self::AMOUNT_KEYS, 'ad_spend'] as $key) {
            $total[$key] = (int) array_sum(array_column($rows, $key));
        }

        return $total;
    }
}
