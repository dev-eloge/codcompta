<?php

namespace App\Services;

use App\Models\Country;
use App\Models\FinancialGoal;
use App\Models\Merchant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Compares the merchant's results (all countries together) with each goal, between its own dates.
 */
class GoalTracker
{
    /** Finished goals stay on screen this many days, so the merchant sees how they ended. */
    public const RECENT_DAYS = 7;

    /** @var array<string, array{revenue: int, profit: int}> */
    private array $totals = [];

    /** @var Collection<int, Country>|null */
    private ?Collection $countries = null;

    public function __construct(private readonly PeriodReport $periodReport) {}

    /**
     * Goals in progress, upcoming, and those that ended in the last few days: what the sidebar,
     * the results page and Sika need.
     *
     * @return list<array<string, mixed>>
     */
    public function current(Merchant $merchant, ?CarbonImmutable $today = null): array
    {
        $today ??= $this->today($merchant);

        $goals = $merchant->financialGoals()
            ->whereDate('ends_on', '>=', $today->subDays(self::RECENT_DAYS)->toDateString())
            ->orderBy('ends_on')
            ->orderBy('id')
            ->get();

        return $this->describeAll($merchant, $goals, $today);
    }

    /**
     * Every goal of the merchant, newest first, for the goals page.
     *
     * @return list<array<string, mixed>>
     */
    public function all(Merchant $merchant, ?CarbonImmutable $today = null): array
    {
        $goals = $merchant->financialGoals()->orderByDesc('starts_on')->orderByDesc('id')->limit(60)->get();

        return $this->describeAll($merchant, $goals, $today ?? $this->today($merchant));
    }

    /**
     * @param  Collection<int, FinancialGoal>  $goals
     * @return list<array<string, mixed>>
     */
    private function describeAll(Merchant $merchant, Collection $goals, CarbonImmutable $today): array
    {
        $this->countries = $merchant->countries()->with('merchant')->get();

        return $goals->map(fn (FinancialGoal $goal) => $this->describe($goal, $today))->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function describe(FinancialGoal $goal, CarbonImmutable $today): array
    {
        $period = ReportPeriod::between($goal->starts_on, $goal->ends_on);
        $days = $period->days();

        $upcoming = $today->lessThan($period->from);
        $finished = $today->greaterThan($period->to);
        $elapsed = $upcoming ? 0 : ($finished ? $days : (int) $period->from->diffInDays($today) + 1);
        $daysLeft = $days - $elapsed + ($upcoming || $finished ? 0 : 1);

        $achieved = $upcoming ? 0 : $this->totalsFor($period)[$goal->metric];
        $percent = $goal->amount > 0 ? (int) floor(max(0, $achieved) / $goal->amount * 100) : 0;
        // Where the merchant should be by now, counting only the days already over (today is still going).
        $expectedPercent = (int) round(max(0, $elapsed - 1) / $days * 100);
        $remaining = max(0, $goal->amount - $achieved);

        $status = match (true) {
            $achieved >= $goal->amount && ! $upcoming => 'reached',
            $upcoming => 'upcoming',
            $finished => 'missed',
            default => 'in_progress',
        };

        return [
            'id' => $goal->id,
            'title' => $goal->title ?: 'Objectif '.$period->label(),
            'metric' => $goal->metric,
            'target' => $goal->amount,
            'from' => $period->from->toDateString(),
            'to' => $period->to->toDateString(),
            'label' => $period->label(),
            'days' => $days,
            'days_elapsed' => $elapsed,
            'days_left' => max(0, $daysLeft),
            'achieved' => $achieved,
            'percent' => $percent,
            'remaining' => $remaining,
            'expected_percent' => $status === 'in_progress' ? $expectedPercent : 0,
            'pace' => $status === 'in_progress' ? ($percent >= $expectedPercent - 1 ? 'on_track' : 'behind') : null,
            'per_day_target' => (int) ceil($goal->amount / $days),
            'per_day_needed' => $status === 'in_progress' && $daysLeft > 0 ? (int) ceil($remaining / $daysLeft) : 0,
            'status' => $status,
        ];
    }

    /**
     * Revenue and net profit of every country together over the period.
     *
     * @return array{revenue: int, profit: int}
     */
    private function totalsFor(ReportPeriod $period): array
    {
        $from = $period->from->toDateString();
        $to = $period->to->toDateString();
        $key = $from.'_'.$to;

        if (isset($this->totals[$key])) {
            return $this->totals[$key];
        }

        $totals = ['revenue' => 0, 'profit' => 0];

        foreach ($this->countries ?? [] as $country) {
            $total = $this->periodReport->forCountry($country, $from, $to)['total'];
            $totals['revenue'] += (int) $total['revenue'];
            $totals['profit'] += (int) $total['profit'];
        }

        return $this->totals[$key] = $totals;
    }

    private function today(Merchant $merchant): CarbonImmutable
    {
        return CarbonImmutable::now($merchant->timezone)->startOfDay();
    }
}
