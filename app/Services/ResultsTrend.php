<?php

namespace App\Services;

use App\Models\Country;
use Carbon\CarbonImmutable;

/**
 * Revenue, net profit and delivered products of one country, bucket by bucket, for the small
 * charts under the results: by day up to two months, by week up to six months, by month beyond.
 */
class ResultsTrend
{
    /** Shorter periods are shown on this many days, so a chart has something to compare. */
    private const MIN_DAYS = 14;

    public function __construct(private readonly PeriodReport $periodReport) {}

    /**
     * @return array{
     *     bucket: string, from: string, to: string, extended: bool,
     *     points: list<array{from: string, to: string, revenue: int, profit: int, delivered: int}>,
     *     totals: array{revenue: int, profit: int, delivered: int},
     *     previous: array{from: string, to: string, revenue: int, profit: int, delivered: int}
     * }
     */
    public function forCountry(Country $country, ReportPeriod $period): array
    {
        $extended = $period->days() < 7;
        $to = $period->to;
        $from = $extended ? $to->subDays(self::MIN_DAYS - 1) : $period->from;
        $days = (int) $from->diffInDays($to) + 1;

        $bucket = match (true) {
            $days <= 62 => 'day',
            $days <= 180 => 'week',
            default => 'month',
        };

        $points = [];

        foreach ($this->buckets($from, $to, $bucket) as [$start, $end]) {
            $points[] = ['from' => $start->toDateString(), 'to' => $end->toDateString(), ...$this->totals($country, $start, $end)];
        }

        $previousTo = $from->subDay();
        $previousFrom = $previousTo->subDays($days - 1);

        return [
            'bucket' => $bucket,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'extended' => $extended,
            'points' => $points,
            'totals' => [
                'revenue' => array_sum(array_column($points, 'revenue')),
                'profit' => array_sum(array_column($points, 'profit')),
                'delivered' => array_sum(array_column($points, 'delivered')),
            ],
            'previous' => [
                'from' => $previousFrom->toDateString(),
                'to' => $previousTo->toDateString(),
                ...$this->totals($country, $previousFrom, $previousTo),
            ],
        ];
    }

    /**
     * @return list<array{0: CarbonImmutable, 1: CarbonImmutable}>
     */
    private function buckets(CarbonImmutable $from, CarbonImmutable $to, string $bucket): array
    {
        $buckets = [];
        $start = $from;

        while ($start->lessThanOrEqualTo($to)) {
            $end = match ($bucket) {
                'day' => $start,
                'week' => $start->endOfWeek(CarbonImmutable::SUNDAY)->startOfDay(),
                default => $start->endOfMonth()->startOfDay(),
            };
            $end = $end->greaterThan($to) ? $to : $end;
            $buckets[] = [$start, $end];
            $start = $end->addDay();
        }

        return $buckets;
    }

    /**
     * @return array{revenue: int, profit: int, delivered: int}
     */
    private function totals(Country $country, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $total = $this->periodReport->forCountry($country, $from->toDateString(), $to->toDateString())['total'];

        return [
            'revenue' => (int) $total['revenue'],
            'profit' => (int) $total['profit'],
            'delivered' => (int) $total['delivered'],
        ];
    }
}
