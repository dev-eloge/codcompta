<?php

namespace App\Services;

use App\Models\AdSpend;
use App\Models\Country;
use App\Models\Product;
use App\Models\Report;
use App\Models\ReportLine;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Which ad platform pays best, product by product.
 *
 * The days of a product are grouped by where its ad ran that day (Facebook, TikTok, both, other).
 * A group counts the real deliveries of the product on its days: a report counts only when all its
 * days belong to the same group, so nothing is estimated. The winner is the group that leaves the
 * best profit per day, since each group ran for a different number of days.
 */
class PlatformComparison
{
    /** Days with an ad whose platform was not noted. */
    public const UNNOTED = 'unnoted';

    /**
     * @param  string  $from  First day, Y-m-d.
     * @param  string  $to  Last day, Y-m-d.
     * @return list<array{product_id: int, product: string, groups: list<array<string, mixed>>, winner: string|null, unnoted_days: int}>
     */
    public function forCountry(Country $country, string $from, string $to): array
    {
        return $this->forCountries(collect([$country]), $from, $to);
    }

    /**
     * Same comparison, all the countries together (one F CFA is worth the same everywhere).
     *
     * @param  Collection<int, Country>  $countries
     * @return list<array{product_id: int, product: string, groups: list<array<string, mixed>>, winner: string|null, unnoted_days: int}>
     */
    public function forCountries(Collection $countries, string $from, string $to): array
    {
        $ads = AdSpend::query()
            ->whereIn('country_id', $countries->pluck('id'))
            ->whereNotNull('product_id')
            ->overlapping($from, $to)
            ->get();

        if ($ads->isEmpty()) {
            return [];
        }

        $reports = Report::query()
            ->whereIn('agency_id', fn ($query) => $query->select('id')->from('agencies')->whereIn('country_id', $countries->pluck('id')))
            ->counted()
            ->whereDate('period_start', '<=', $to)
            ->whereDate('period_end', '>=', $from)
            ->with(['lines' => fn ($query) => $query->whereIn('product_id', $ads->pluck('product_id')->unique())])
            ->get();

        $products = Product::whereIn('id', $ads->pluck('product_id')->unique())->pluck('name', 'id');

        return $ads->groupBy('product_id')
            ->map(fn (Collection $productAds, int $productId) => $this->forProduct($productId, (string) $products[$productId], $productAds, $reports, $from, $to))
            ->sortBy([['comparable', 'desc'], ['product', 'asc']])
            ->map(fn (array $product) => collect($product)->except('comparable')->all())
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, AdSpend>  $ads
     * @param  Collection<int, Report>  $reports
     * @return array<string, mixed>
     */
    private function forProduct(int $productId, string $name, Collection $ads, Collection $reports, string $from, string $to): array
    {
        $days = $this->daysOf($ads, $from, $to);

        $groups = collect($days)
            ->groupBy('mode', preserveKeys: true)
            ->except(self::UNNOTED)
            ->map(fn (Collection $groupDays, string $mode) => $this->group($mode, $groupDays, $productId, $reports))
            ->sortByDesc('profit_per_day')
            ->values();

        return [
            'product_id' => $productId,
            'product' => $name,
            'groups' => $groups->all(),
            'winner' => $groups->count() > 1 ? $groups->first()['platform'] : null,
            'unnoted_days' => collect($days)->where('mode', self::UNNOTED)->count(),
            'comparable' => $groups->count(),
        ];
    }

    /**
     * Each day of the period with an ad: where it ran, and its share of the money and orders.
     * An ad noted for several days is spread evenly over them.
     *
     * @param  Collection<int, AdSpend>  $ads
     * @return array<string, array{mode: string, ad: float, orders: float|null}>
     */
    private function daysOf(Collection $ads, string $from, string $to): array
    {
        $days = [];

        foreach ($ads as $ad) {
            $length = $ad->period_start->diffInDays($ad->period_end) + 1;
            $start = CarbonImmutable::parse(max($ad->period_start->toDateString(), $from));
            $end = CarbonImmutable::parse(min($ad->period_end->toDateString(), $to));

            for ($day = $start; $day->lte($end); $day = $day->addDay()) {
                $key = $day->toDateString();
                $days[$key] ??= ['platforms' => [], 'ad' => 0.0, 'orders' => null];
                $days[$key]['platforms'][] = $ad->platform ?? self::UNNOTED;
                $days[$key]['ad'] += $ad->amount / $length;

                if ($ad->orders_received !== null) {
                    $days[$key]['orders'] = ($days[$key]['orders'] ?? 0) + $ad->orders_received / $length;
                }
            }
        }

        return array_map(fn (array $day) => [
            'mode' => $this->modeOf($day['platforms']),
            'ad' => $day['ad'],
            'orders' => $day['orders'],
        ], $days);
    }

    /**
     * Facebook and TikTok the same day count as both together; "other" only counts when alone.
     *
     * @param  list<string>  $platforms
     */
    private function modeOf(array $platforms): string
    {
        $noted = array_values(array_unique(array_diff($platforms, [self::UNNOTED])));

        if ($noted === []) {
            return self::UNNOTED;
        }

        $facebook = in_array(AdSpend::PLATFORM_FACEBOOK, $noted, true);
        $tiktok = in_array(AdSpend::PLATFORM_TIKTOK, $noted, true);

        return match (true) {
            in_array(AdSpend::PLATFORM_FACEBOOK_TIKTOK, $noted, true), $facebook && $tiktok => AdSpend::PLATFORM_FACEBOOK_TIKTOK,
            $facebook => AdSpend::PLATFORM_FACEBOOK,
            $tiktok => AdSpend::PLATFORM_TIKTOK,
            default => AdSpend::PLATFORM_OTHER,
        };
    }

    /**
     * @param  Collection<string, array{mode: string, ad: float, orders: float|null}>  $days
     * @param  Collection<int, Report>  $reports
     * @return array<string, mixed>
     */
    private function group(string $mode, Collection $days, int $productId, Collection $reports): array
    {
        $dayKeys = $days->keys()->flip();
        $delivered = 0;
        $revenue = 0;
        $purchaseCost = 0;

        foreach ($reports as $report) {
            if (! $this->coversOnly($report->period_start, $report->period_end, $dayKeys)) {
                continue;
            }

            $lines = $report->lines->where('product_id', $productId);
            $delivered += $lines->sum(fn (ReportLine $line) => $line->quantity);
            $revenue += $lines->sum(fn (ReportLine $line) => $line->amount);
            $purchaseCost += $lines->sum(fn (ReportLine $line) => $line->purchaseCost());
        }

        $ad = (int) round($days->sum('ad'));
        $knownOrders = $days->pluck('orders')->filter(fn ($orders) => $orders !== null);
        $orders = $knownOrders->isEmpty() ? null : (int) round($knownOrders->sum());
        $profit = $revenue - $purchaseCost - $ad;

        return [
            'platform' => $mode,
            'days' => $days->count(),
            'ad_spend' => $ad,
            'orders' => $orders,
            'delivered' => $delivered,
            'revenue' => $revenue,
            'cost_per_order' => $orders ? (int) round($ad / $orders) : null,
            'cost_per_delivery' => $delivered > 0 ? (int) round($ad / $delivered) : null,
            'profit' => $profit,
            'profit_per_day' => (int) round($profit / $days->count()),
        ];
    }

    /**
     * True when every day of the report is one of the given days.
     *
     * @param  Collection<string, int>  $dayKeys
     */
    private function coversOnly(CarbonInterface $start, CarbonInterface $end, Collection $dayKeys): bool
    {
        for ($day = CarbonImmutable::parse($start); $day->lte($end); $day = $day->addDay()) {
            if (! $dayKeys->has($day->toDateString())) {
                return false;
            }
        }

        return true;
    }
}
