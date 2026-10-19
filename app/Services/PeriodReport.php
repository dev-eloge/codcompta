<?php

namespace App\Services;

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Country;
use App\Models\Report;

/**
 * Builds the financial report of one country over a period (day, week or month).
 *
 * A report counts in the period of its end date (RG-06); only reports with the
 * "counted" status enter the totals (RG-07, RG-09).
 */
class PeriodReport
{
    /**
     * @param  string  $from  First day of the period, Y-m-d.
     * @param  string  $to  Last day of the period, Y-m-d.
     * @return array{agencies: list<array<string, mixed>>, total: array<string, mixed>}
     */
    public function forCountry(Country $country, string $from, string $to): array
    {
        $agencies = $country->agencies()
            ->with(['reports' => fn ($query) => $query->counted()->endingBetween($from, $to)->with('lines')])
            ->orderBy('id')
            ->get();

        $adSpends = AdSpend::query()
            ->whereBelongsTo($country)
            ->endingBetween($from, $to)
            ->get();

        $rows = $agencies->map(fn (Agency $agency) => [
            'agency_id' => $agency->id,
            'name' => $agency->name,
            'delivered' => $agency->reports->sum(fn (Report $report) => $report->deliveredQuantity()),
            'revenue' => $agency->reports->sum(fn (Report $report) => $report->revenue()),
            'purchase_cost' => $agency->reports->sum(fn (Report $report) => $report->purchaseCost()),
            'closing_fees' => $agency->reports->sum('closing_fees'),
            'delivery_fees' => $agency->reports->sum('delivery_fees'),
            'other_fees' => $agency->reports->sum('other_fees'),
            'direct_ad_spend' => $adSpends->where('agency_id', $agency->id)->sum('amount'),
        ])->values()->all();

        $calculator = new ProfitCalculator(shares: $country->merchant->profitShares());

        return $calculator->forAgencies(
            $rows,
            sharedAdSpend: (int) $adSpends->whereNull('agency_id')->sum('amount'),
        );
    }
}
