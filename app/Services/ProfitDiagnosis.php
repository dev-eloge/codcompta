<?php

namespace App\Services;

use App\Models\Country;

/**
 * Explains a meaningful fall in net profit by comparing a period with the same-sized period before it.
 */
class ProfitDiagnosis
{
    private const MINIMUM_DECLINE = 10000;

    private const DECLINE_RATIO = 0.15;

    public function __construct(private readonly PeriodReport $periodReport) {}

    /**
     * @param  array{agencies: list<array<string, mixed>>, total: array<string, mixed>}  $current
     * @return array{
     *     from: string, to: string, previous_from: string, previous_to: string,
     *     current_profit: int, previous_profit: int, decline: int, decline_ratio: float|null,
     *     significant: bool, causes: list<array{label: string, amount: int}>, offsets: list<array{label: string, amount: int}>,
     *     agencies: list<array{name: string, decline: int}>
     * }|null
     */
    public function forCountry(Country $country, ReportPeriod $period, array $current): ?array
    {
        $days = $period->days();
        $previousTo = $period->from->subDay();
        $previousFrom = $previousTo->subDays($days - 1);
        $previous = $this->periodReport->forCountry($country, $previousFrom->toDateString(), $previousTo->toDateString());

        $currentProfit = (int) $current['total']['profit'];
        $previousProfit = (int) $previous['total']['profit'];
        $decline = $previousProfit - $currentProfit;

        if ($decline <= 0) {
            return null;
        }

        $declineRatio = $previousProfit > 0 ? $decline / $previousProfit : null;
        $significant = ($previousProfit > 0 && $currentProfit < 0)
            || ($previousProfit > 0 && $decline >= max(self::MINIMUM_DECLINE, (int) ceil($previousProfit * self::DECLINE_RATIO)))
            || ($previousProfit <= 0 && $decline >= self::MINIMUM_DECLINE);

        return [
            'from' => $period->from->toDateString(),
            'to' => $period->to->toDateString(),
            'previous_from' => $previousFrom->toDateString(),
            'previous_to' => $previousTo->toDateString(),
            'current_profit' => $currentProfit,
            'previous_profit' => $previousProfit,
            'decline' => $decline,
            'decline_ratio' => $declineRatio,
            'significant' => $significant,
            'causes' => $this->causes($current['total'], $previous['total']),
            'offsets' => $this->offsets($current['total'], $previous['total']),
            'agencies' => $this->decliningAgencies($current['agencies'], $previous['agencies']),
        ];
    }

    /**
     * @param  array<string, mixed>  $current
     * @param  array<string, mixed>  $previous
     * @return list<array{label: string, amount: int}>
     */
    private function causes(array $current, array $previous): array
    {
        $causes = array_slice(array_filter(
            $this->profitImpacts($current, $previous),
            fn (array $impact) => $impact['amount'] < 0,
        ), 0, 3);

        return array_map(fn (array $cause) => [...$cause, 'amount' => abs($cause['amount'])], $causes);
    }

    /**
     * @param  array<string, mixed>  $current
     * @param  array<string, mixed>  $previous
     * @return list<array{label: string, amount: int}>
     */
    private function offsets(array $current, array $previous): array
    {
        return array_slice(array_filter(
            $this->profitImpacts($current, $previous),
            fn (array $impact) => $impact['amount'] > 0,
        ), 0, 2);
    }

    /**
     * @param  array<string, mixed>  $current
     * @param  array<string, mixed>  $previous
     * @return list<array{label: string, amount: int}>
     */
    private function profitImpacts(array $current, array $previous): array
    {
        $revenueChange = (int) $current['revenue'] - (int) $previous['revenue'];
        $purchaseCostImpact = (int) $previous['purchase_cost'] - (int) $current['purchase_cost'];
        $adSpendImpact = (int) $previous['ad_spend'] - (int) $current['ad_spend'];
        $closingFeesImpact = (int) $previous['closing_fees'] - (int) $current['closing_fees'];
        $deliveryFeesImpact = (int) $previous['delivery_fees'] - (int) $current['delivery_fees'];
        $otherFeesImpact = (int) $previous['other_fees'] - (int) $current['other_fees'];
        $impacts = [
            [$revenueChange < 0 ? "Baisse du chiffre d'affaires" : "Hausse du chiffre d'affaires", $revenueChange],
            [$purchaseCostImpact < 0 ? "Hausse du coût d'achat" : "Baisse du coût d'achat", $purchaseCostImpact],
            [$adSpendImpact < 0 ? 'Hausse des dépenses publicitaires' : 'Baisse des dépenses publicitaires', $adSpendImpact],
            [$closingFeesImpact < 0 ? 'Hausse des frais de closing' : 'Baisse des frais de closing', $closingFeesImpact],
            [$deliveryFeesImpact < 0 ? 'Hausse des frais de livraison' : 'Baisse des frais de livraison', $deliveryFeesImpact],
            [$otherFeesImpact < 0 ? 'Hausse des autres frais' : 'Baisse des autres frais', $otherFeesImpact],
        ];

        $impacts = array_map(fn (array $impact) => ['label' => $impact[0], 'amount' => $impact[1]], $impacts);
        usort($impacts, fn (array $left, array $right) => abs($right['amount']) <=> abs($left['amount']));

        return $impacts;
    }

    /**
     * @param  list<array<string, mixed>>  $current
     * @param  list<array<string, mixed>>  $previous
     * @return list<array{name: string, decline: int}>
     */
    private function decliningAgencies(array $current, array $previous): array
    {
        $previousById = collect($previous)->keyBy('agency_id');
        $declines = [];

        foreach ($current as $agency) {
            $before = $previousById->get($agency['agency_id']);
            $change = (int) ($agency['profit'] ?? 0) - (int) ($before['profit'] ?? 0);

            if ($change < 0) {
                $declines[] = ['name' => (string) $agency['name'], 'decline' => abs($change)];
            }
        }

        usort($declines, fn (array $left, array $right) => $right['decline'] <=> $left['decline']);

        return array_slice($declines, 0, 3);
    }
}
