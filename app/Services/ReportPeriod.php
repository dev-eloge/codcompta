<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * A reporting period: one day, one week (Monday to Sunday) or one calendar month (RG-06).
 */
class ReportPeriod
{
    public const DAY = 'day';

    public const WEEK = 'week';

    public const MONTH = 'month';

    public const TYPES = [self::DAY, self::WEEK, self::MONTH];

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

    public function previous(): self
    {
        return self::containing($this->type, $this->from->subDay());
    }

    public function next(): self
    {
        return self::containing($this->type, $this->to->addDay());
    }

    /**
     * Human label in French, e.g. "du 12 au 18 octobre 2026".
     */
    public function label(): string
    {
        $from = $this->from->locale('fr');
        $to = $this->to->locale('fr');

        return match ($this->type) {
            self::DAY => $from->translatedFormat('l j F Y'),
            self::MONTH => $from->translatedFormat('F Y'),
            default => $from->month === $to->month
                ? 'du '.$from->translatedFormat('j').' au '.$to->translatedFormat('j F Y')
                : 'du '.$from->translatedFormat('j F').' au '.$to->translatedFormat('j F Y'),
        };
    }

    /**
     * @return array{type: string, from: string, to: string, label: string, previous: string, next: string}
     */
    public function toArray(): array
    {
        return [
            'type' => $this->type,
            'from' => $this->from->toDateString(),
            'to' => $this->to->toDateString(),
            'label' => $this->label(),
            'previous' => $this->previous()->from->toDateString(),
            'next' => $this->next()->from->toDateString(),
        ];
    }
}
