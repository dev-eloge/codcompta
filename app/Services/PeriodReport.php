<?php

namespace App\Services;

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Country;
use App\Models\Report;
use App\Models\ReportLine;
use Illuminate\Support\Collection;

/**
 * Builds the financial report of one country over a period (day, week or month).
 *
 * A report counts in the period of its end date (RG-06); only reports with the
 * "counted" status enter the totals (RG-07, RG-09).
 *
 * An ad of one product shared by the country goes to the agencies that delivered that product
 * on its days, in proportion to their deliveries. Each ad is counted once, whatever the number
 * of reports that mention it.
 */
class PeriodReport
{
    public function __construct(
        private readonly AdSpendAllocator $allocator = new AdSpendAllocator,
        private readonly MonthlyTeamCosts $monthlyTeamCosts = new MonthlyTeamCosts,
    ) {}

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

        [$productAdByAgency, $productAdLeft] = $this->splitProductAds($country, $adSpends);

        // Salaries and fixed costs of the own team leave the profit once per month, on the team's line.
        $teamCosts = $this->monthlyTeamCosts->forCountry($country, $from, $to);
        $monthly = fn (Agency $agency, string $kind) => $agency->is_own_team ? $teamCosts[$kind] : 0;

        $rows = $agencies->map(fn (Agency $agency) => [
            'agency_id' => $agency->id,
            'name' => $agency->name,
            'delivered' => $agency->reports->sum(fn (Report $report) => $report->deliveredQuantity()),
            'revenue' => $agency->reports->sum(fn (Report $report) => $report->revenue()),
            'purchase_cost' => $agency->reports->sum(fn (Report $report) => $report->purchaseCost()),
            'closing_fees' => $agency->reports->sum('closing_fees') + $monthly($agency, 'closing'),
            'delivery_fees' => $agency->reports->sum('delivery_fees') + $monthly($agency, 'delivery'),
            'other_fees' => $agency->reports->sum('other_fees') + $agency->reports->sum('fuel_fees') + $monthly($agency, 'other'),
            'direct_ad_spend' => $adSpends->where('agency_id', $agency->id)->sum('amount') + ($productAdByAgency[$agency->id] ?? 0),
        ])->values()->all();

        $calculator = new ProfitCalculator(allocator: $this->allocator, shares: $country->merchant->profitShares());

        return $calculator->forAgencies(
            $rows,
            sharedAdSpend: (int) $adSpends->whereNull('agency_id')->whereNull('product_id')->sum('amount') + $productAdLeft,
        );
    }

    /**
     * Splits each shared product ad between the agencies that delivered the product on its days.
     * An agency that paid its own ad for this product does not take a share of the shared one.
     * An ad whose product was delivered by nobody is left to the split by revenue.
     *
     * @param  Collection<int, AdSpend>  $adSpends
     * @return array{0: array<int, int>, 1: int} Amount per agency id, and the amount left to split by revenue.
     */
    private function splitProductAds(Country $country, Collection $adSpends): array
    {
        $sharedProductAds = $adSpends->whereNull('agency_id')->whereNotNull('product_id');

        if ($sharedProductAds->isEmpty()) {
            return [[], 0];
        }

        $reports = Report::query()
            ->whereIn('agency_id', $country->agencies()->select('id'))
            ->counted()
            ->endingBetween($sharedProductAds->min(fn (AdSpend $ad) => $ad->period_start)->toDateString(), $sharedProductAds->max(fn (AdSpend $ad) => $ad->period_end)->toDateString())
            ->with('lines')
            ->get();

        $byAgency = [];
        $left = 0;

        foreach ($sharedProductAds as $ad) {
            $ownAdAgencies = $adSpends
                ->whereNotNull('agency_id')
                ->where('product_id', $ad->product_id)
                ->filter(fn (AdSpend $own) => $own->period_start->lte($ad->period_end) && $own->period_end->gte($ad->period_start))
                ->pluck('agency_id');

            $deliveries = $reports
                ->filter(fn (Report $report) => $report->period_end->betweenIncluded($ad->period_start, $ad->period_end))
                ->reject(fn (Report $report) => $ownAdAgencies->contains($report->agency_id))
                ->groupBy('agency_id')
                ->map(fn (Collection $agencyReports) => $agencyReports->sum(
                    fn (Report $report) => $report->lines->where('product_id', $ad->product_id)->sum(fn (ReportLine $line) => $line->quantity),
                ))
                ->filter(fn (int $quantity) => $quantity > 0);

            if ($deliveries->isEmpty()) {
                $left += $ad->amount;

                continue;
            }

            $shares = $this->allocator->allocate($ad->amount, $deliveries->values()->all());

            foreach ($deliveries->keys()->values() as $index => $agencyId) {
                $byAgency[$agencyId] = ($byAgency[$agencyId] ?? 0) + $shares[$index];
            }
        }

        return [$byAgency, $left];
    }
}
