<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * A reporting period: one day, one week (Monday to Sunday), one calendar month (RG-06),
 * or any range of days the merchant picks (from one date to another).
 */
class ReportPeriod
{
    public const DAY = 'day';

    public const WEEK = 'week';

    public const MONTH = 'month';

    public const CUSTOM = 'custom';

    public const TYPES = [self::DAY, self::WEEK, self::MONTH, self::CUSTOM];

    /** The longest range the merchant can pick, in days. */
    public const MAX_CUSTOM_DAYS = 366;

    private function __construct(
        public readonly string $type,
        public readonly CarbonImmutable $from,
        public readonly CarbonImmutable $to,
    ) {}

    /**
     * The period of the given type that contains the given date.
     */
    public static function containing(string $type, CarbonInterface|string $date): self
    {
        $day = CarbonImmutable::parse($date)->startOfDay();

        return match ($type) {
            self::DAY => new self(self::DAY, $day, $day),
            self::MONTH => new self(self::MONTH, $day->startOfMonth(), $day->endOfMonth()->startOfDay()),
            default => new self(self::WEEK, $day->startOfWeek(CarbonInterface::MONDAY), $day->endOfWeek(CarbonInterface::SUNDAY)->startOfDay()),
        };
    }

    /**
     * A range picked by the merchant, from one day to another (both included).
     */
    public static function between(CarbonInterface|string $from, CarbonInterface|string $to): self
    {
        $start = CarbonImmutable::parse($from)->startOfDay();
        $end = CarbonImmutable::parse($to)->startOfDay();

        return $end->lessThan($start) ? new self(self::CUSTOM, $end, $start) : new self(self::CUSTOM, $start, $end);
    }

    /**
     * Number of days in the period, both ends included.
     */
    public function days(): int
    {
        return (int) $this->from->diffInDays($this->to) + 1;
    }

    public function previous(): self
    {
        if ($this->type === self::CUSTOM) {
            return new self(self::CUSTOM, $this->from->subDays($this->days()), $this->from->subDay());
        }

        return self::containing($this->type, $this->from->subDay());
    }

    public function next(): self
    {
        if ($this->type === self::CUSTOM) {
            return new self(self::CUSTOM, $this->to->addDay(), $this->to->addDays($this->days()));
        }

        return self::containing($this->type, $this->to->addDay());
    }

    /**
     * Human label in French, e.g. "du 12 au 18 octobre 2026".
     */
    public function label(): string
    {
        $from = $this->from->locale('fr');
        $to = $this->to->locale('fr');

        if ($this->type === self::CUSTOM && $this->from->equalTo($this->to)) {
            return 'du '.$from->translatedFormat('l j F Y');
        }

        return match ($this->type) {
            self::DAY => $from->translatedFormat('l j F Y'),
            self::MONTH => $from->translatedFormat('F Y'),
            default => $from->month === $to->month && $from->year === $to->year
                ? 'du '.$from->translatedFormat('j').' au '.$to->translatedFormat('j F Y')
                : ($from->year === $to->year
                    ? 'du '.$from->translatedFormat('j F').' au '.$to->translatedFormat('j F Y')
                    : 'du '.$from->translatedFormat('j F Y').' au '.$to->translatedFormat('j F Y')),
        };
    }

    /**
     * @return array{type: string, from: string, to: string, days: int, label: string, previous: string, previous_to: string, next: string, next_to: string}
     */
    public function toArray(): array
    {
        $previous = $this->previous();
        $next = $this->next();

        return [
            'type' => $this->type,
            'from' => $this->from->toDateString(),
            'to' => $this->to->toDateString(),
            'days' => $this->days(),
            'label' => $this->label(),
            'previous' => $previous->from->toDateString(),
            'previous_to' => $previous->to->toDateString(),
            'next' => $next->from->toDateString(),
            'next_to' => $next->to->toDateString(),
        ];
    }
}
