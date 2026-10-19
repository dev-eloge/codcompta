<?php

namespace App\Services;

/**
 * Splits one ad spend between agencies in proportion to their revenue (RG-05).
 */
class AdSpendAllocator
{
    /**
     * @param  list<int>  $revenues  One revenue per agency, in FCFA.
     * @return list<int> One share per agency, in FCFA. The shares always add up to $amount.
     */
    public function allocate(int $amount, array $revenues): array
    {
        $count = count($revenues);

        if ($count === 0) {
            return [];
        }

        $totalRevenue = array_sum($revenues);
        $weights = $totalRevenue > 0 ? $revenues : array_fill(0, $count, 1);
        $totalWeight = array_sum($weights);

        $shares = [];
        $allocated = 0;

        foreach ($weights as $index => $weight) {
            $isLast = $index === $count - 1;
            $share = $isLast ? $amount - $allocated : (int) round($amount * $weight / $totalWeight);

            $shares[] = $share;
            $allocated += $share;
        }

        return $shares;
    }
}
