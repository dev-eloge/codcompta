<?php

namespace App\Services;

use App\Models\AdSpend;
use App\Models\Country;
use App\Models\Merchant;
use App\Models\Report;
use App\Models\ReportLine;
use Illuminate\Support\Collection;

/**
 * All the countries of a merchant together, for "Vue générale" and "Tous les pays".
 *
 * The CFA franc of West Africa and the one of Central Africa are worth the same:
 * the amounts of the countries add up without conversion.
 */
class MerchantOverview
{
    public function __construct(
        private readonly PeriodReport $periodReport,
        private readonly PlatformComparison $platformComparison,
        private readonly PendingItems $pendingItems,
    ) {}

    /**
     * @return array{
     *     total: array<string, int|float>,
     *     previous_profit: int,
     *     countries: list<array<string, mixed>>,
     *     products: list<array{product_id: int, name: string, profit: int}>,
     *     platforms: list<array{platform: string, ad_spend: int, delivered: int, cost_per_delivery: int|null}>,
     *     pending: int
     * }
     */
    public function forMerchant(Merchant $merchant, ReportPeriod $period): array
    {
        $countries = $merchant->countries()->orderBy('name')->get();
        $from = $period->from->toDateString();
        $to = $period->to->toDateString();
        $previous = $period->previous();

        $rows = $countries->map(function (Country $country) use ($from, $to, $previous) {
            $total = $this->periodReport->forCountry($country, $from, $to)['total'];
            $before = $this->periodReport->forCountry($country, $previous->from->toDateString(), $previous->to->toDateString())['total'];

            return [
                'id' => $country->id,
                'name' => $country->name,
                'revenue' => $total['revenue'],
                'ad_spend' => $total['ad_spend'],
                'delivered' => $total['delivered'],
                'profit' => $total['profit'],
                'margin' => $total['margin'],
                'previous_profit' => $before['profit'],
                'pending' => $this->pendingItems->countFor($country),
            ];
        });

        $positiveProfit = $rows->sum(fn (array $row) => max(0, $row['profit']));
        $total = $this->totalOf($rows, $merchant);

        return [
            'total' => $total,
            'previous_profit' => (int) $rows->sum('previous_profit'),
            'countries' => $rows
                ->map(fn (array $row) => [...$row, 'share' => $row['profit'] > 0 && $positiveProfit > 0 ? $row['profit'] / $positiveProfit : 0.0])
                ->sortByDesc('profit')
                ->values()
                ->all(),
            'products' => $this->productProfits($countries, $from, $to),
            'platforms' => $this->platforms($countries, $from, $to),
            'pending' => (int) $rows->sum('pending'),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array<string, int|float>
     */
    private function totalOf(Collection $rows, Merchant $merchant): array
    {
        $revenue = (int) $rows->sum('revenue');
        $profit = (int) $rows->sum('profit');
        $total = [
            'revenue' => $revenue,
            'ad_spend' => (int) $rows->sum('ad_spend'),
            'delivered' => (int) $rows->sum('delivered'),
            'profit' => $profit,
            'margin' => $revenue === 0 ? 0.0 : $profit / $revenue,
        ];

        $total['split'] = $merchant->profitSplit()->of($profit);

        return $total;
    }

    /**
     * What each product leaves after its purchase cost and its own ads, best first.
     *
     * @param  Collection<int, Country>  $countries
     * @return list<array{product_id: int, name: string, profit: int}>
     */
    private function productProfits(Collection $countries, string $from, string $to): array
    {
        $lines = ReportLine::query()
            ->whereIn('report_id', Report::query()
                ->select('id')
                ->counted()
                ->endingBetween($from, $to)
                ->whereIn('agency_id', fn ($query) => $query->select('id')->from('agencies')->whereIn('country_id', $countries->pluck('id'))))
            ->whereNotNull('product_id')
            ->with('product:id,name')
            ->get();

        $adByProduct = AdSpend::query()
            ->whereIn('country_id', $countries->pluck('id'))
            ->whereNotNull('product_id')
            ->endingBetween($from, $to)
            ->get()
            ->groupBy('product_id')
            ->map(fn (Collection $ads) => (int) $ads->sum('amount'));

        return $lines->groupBy('product_id')
            ->map(fn (Collection $productLines, int $productId) => [
                'product_id' => $productId,
                'name' => $productLines->first()->product->name,
                'profit' => (int) ($productLines->sum('amount') - $productLines->sum(fn (ReportLine $line) => $line->purchaseCost()) - ($adByProduct[$productId] ?? 0)),
            ])
            ->sortByDesc('profit')
            ->values()
            ->take(5)
            ->all();
    }

    /**
     * Ad paid and real deliveries by platform, all products and countries together.
     *
     * @param  Collection<int, Country>  $countries
     * @return list<array{platform: string, ad_spend: int, delivered: int, cost_per_delivery: int|null}>
     */
    private function platforms(Collection $countries, string $from, string $to): array
    {
        // Country by country: a day with Facebook in one country and TikTok in another is not "both".
        return $countries
            ->flatMap(fn (Country $country) => $this->platformComparison->forCountry($country, $from, $to))
            ->flatMap(fn (array $product) => $product['groups'])
            ->groupBy('platform')
            ->map(function (Collection $groups, string $platform) {
                $adSpend = (int) $groups->sum('ad_spend');
                $delivered = (int) $groups->sum('delivered');

                return [
                    'platform' => $platform,
                    'ad_spend' => $adSpend,
                    'delivered' => $delivered,
                    'cost_per_delivery' => $delivered > 0 ? (int) round($adSpend / $delivered) : null,
                ];
            })
            ->sortBy(fn (array $row) => $row['cost_per_delivery'] ?? PHP_INT_MAX)
            ->values()
            ->all();
    }
}
