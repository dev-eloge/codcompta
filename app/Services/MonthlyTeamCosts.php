<?php

namespace App\Services;

use App\Models\Closer;
use App\Models\Country;
use App\Models\Courier;
use Carbon\CarbonImmutable;

/**
 * What the own team costs by the month: monthly salaries and fixed costs (motorbike, phone credit, storage).
 *
 * They leave the profit once per month, never the daily report: a period counts the costs of each
 * calendar month it covers entirely. A month view counts them once; a day or a week counts none.
 */
class MonthlyTeamCosts
{
    /**
     * @param  string  $from  First day, Y-m-d.
     * @param  string  $to  Last day, Y-m-d.
     * @return array{delivery: int, closing: int, other: int}
     */
    public function forCountry(Country $country, string $from, string $to): array
    {
        $costs = ['delivery' => 0, 'closing' => 0, 'other' => 0];

        if (! $country->hasOwnTeam()) {
            return $costs;
        }

        $start = CarbonImmutable::parse($from);
        $end = CarbonImmutable::parse($to);

        for ($month = $start->startOfMonth(); $month->lte($end); $month = $month->addMonth()) {
            $monthEnd = $month->endOfMonth();

            if ($month->lt($start) || $monthEnd->startOfDay()->gt($end)) {
                continue;
            }

            $costs['delivery'] += (int) $country->couriers()
                ->where('pay_mode', Courier::PAY_MONTHLY)
                ->where('created_at', '<=', $monthEnd)
                ->sum('pay_amount');
            $costs['closing'] += (int) $country->closers()
                ->where('pay_mode', Closer::PAY_MONTHLY)
                ->where('created_at', '<=', $monthEnd)
                ->sum('pay_amount');
            $costs['other'] += $country->monthlyFixedCosts();
        }

        return $costs;
    }
}
