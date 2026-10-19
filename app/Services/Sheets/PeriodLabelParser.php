<?php

namespace App\Services\Sheets;

use Carbon\CarbonImmutable;

/**
 * Reads the date written in the first column of an accounting sheet, the way merchants write it:
 * "03/07/26", "Du 12 au 18 /07/26", "Du 25 mai au 04 juin", "Du 28 au 04- Agence 2" under a
 * "Mois d'octobre" title row. Missing months and years come from the rows above.
 */
class PeriodLabelParser
{
    private const MONTHS = [
        'janvier' => 1, 'janv' => 1, 'fevrier' => 2, 'fevr' => 2, 'fev' => 2, 'mars' => 3, 'avril' => 4, 'avr' => 4,
        'mai' => 5, 'juin' => 6, 'juillet' => 7, 'juil' => 7, 'aout' => 8, 'septembre' => 9, 'sept' => 9, 'sep' => 9,
        'octobre' => 10, 'oct' => 10, 'novembre' => 11, 'nov' => 11, 'decembre' => 12, 'dec' => 12,
    ];

    private ?int $sectionMonth = null;

    private ?int $year = null;

    /** A year written far in the future (a typo such as "10/08/29") is replaced; the note says so. */
    public ?string $correction = null;

    public function __construct(private readonly CarbonImmutable $today) {}

    /**
     * A title row such as "MOIS DE JUILLET" sets the month for the rows below it.
     */
    public function readSectionTitle(string $label): bool
    {
        $text = ColumnGuesser::normalize($label);

        if (! preg_match('/\bmois\b/', $text)) {
            return false;
        }

        foreach (self::MONTHS as $name => $number) {
            if (preg_match('/\b'.$name.'\b/', $text)) {
                $this->sectionMonth = $number;

                if (preg_match('/\b(20\d{2})\b/', $text, $year)) {
                    $this->year = (int) $year[1];
                }

                return true;
            }
        }

        return false;
    }

    public static function isTotal(string $label): bool
    {
        return (bool) preg_match('/\b(total|totaux|bilan|cumul)\b/', ColumnGuesser::normalize($label));
    }

    /**
     * @return array{0: string, 1: string}|null start and end dates (Y-m-d), or null when no date is found
     */
    public function parse(string $label): ?array
    {
        $this->correction = null;
        $text = ColumnGuesser::normalize($label);

        // "Du 12 au 18 /07/26", "du 25 mai au 04 juin", "du 28/09 au 04/10/2026", "Du 28 au 04"
        $day = '(\d{1,2})';
        $monthPart = '(?:\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?|\s+([a-z]{3,9})\.?(?:\s+(\d{4}))?)?';

        if (preg_match('/\bdu\s+'.$day.$monthPart.'\s+au\s+'.$day.$monthPart.'/', $text, $m)) {
            [$startDay, $startMonth, $startYear] = [(int) $m[1], $this->month($m[2] ?? '', $m[4] ?? ''), $this->yearFrom($m[3] ?? '', $m[5] ?? '')];
            [$endDay, $endMonth, $endYear] = [(int) $m[6], $this->month($m[7] ?? '', $m[9] ?? ''), $this->yearFrom($m[8] ?? '', $m[10] ?? '')];

            $endMonth ??= $startMonth ?? $this->sectionMonth;
            $startMonth ??= $startDay > $endDay ? (($endMonth ?? 1) + 10) % 12 + 1 : $endMonth;

            if ($endMonth === null || $startMonth === null) {
                return null;
            }

            $endYear ??= $startYear ?? $this->guessYear($endMonth, $endDay);
            $startYear ??= $startMonth > $endMonth ? $endYear - 1 : $endYear;

            return $this->period($startYear, $startMonth, $startDay, $endYear, $endMonth, $endDay);
        }

        // "03/07/26", "3/7/2026", "03/07/26 - Recap"
        if (preg_match('/\b(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\b/', $text, $m)) {
            $month = (int) $m[2];
            $year = $this->yearFrom($m[3] ?? '', '') ?? $this->guessYear($month, (int) $m[1]);

            return $this->period($year, $month, (int) $m[1], $year, $month, (int) $m[1]);
        }

        // "2026-07-03"
        if (preg_match('/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/', $text, $m)) {
            return $this->period((int) $m[1], (int) $m[2], (int) $m[3], (int) $m[1], (int) $m[2], (int) $m[3]);
        }

        // "3 juillet 2026", "12 octobre"
        if (preg_match('/\b(\d{1,2})\s+([a-z]{3,9})\.?(?:\s+(\d{4}))?\b/', $text, $m) && ($month = $this->month('', $m[2])) !== null) {
            $year = $this->yearFrom('', $m[3] ?? '') ?? $this->guessYear($month, (int) $m[1]);

            return $this->period($year, $month, (int) $m[1], $year, $month, (int) $m[1]);
        }

        return null;
    }

    private function month(string $number, string $name): ?int
    {
        if ($number !== '') {
            return (int) $number >= 1 && (int) $number <= 12 ? (int) $number : null;
        }

        return $name !== '' ? (self::MONTHS[$name] ?? null) : null;
    }

    private function yearFrom(string $short, string $long): ?int
    {
        $value = $long !== '' ? $long : $short;

        if ($value === '') {
            return null;
        }

        $year = (int) $value;
        $year = $year < 100 ? 2000 + $year : $year;

        if ($year > $this->today->year + 1 || $year < 2000) {
            $replacement = $this->year ?? $this->today->year;
            $this->correction = "Année {$year} lue comme {$replacement} : vérifiez la date.";

            return $replacement;
        }

        return $year;
    }

    /**
     * Without a written year: the last year seen, else this year unless that lands far in the future.
     */
    private function guessYear(int $month, int $day): int
    {
        if ($this->year !== null) {
            return $this->year;
        }

        $year = $this->today->year;
        $date = CarbonImmutable::create($year, $month, min($day, 28));

        return $date->gt($this->today->addMonth()) ? $year - 1 : $year;
    }

    /**
     * @return array{0: string, 1: string}|null
     */
    private function period(int $startYear, int $startMonth, int $startDay, int $endYear, int $endMonth, int $endDay): ?array
    {
        if (! checkdate($startMonth, $startDay, $startYear) || ! checkdate($endMonth, $endDay, $endYear)) {
            return null;
        }

        $start = CarbonImmutable::create($startYear, $startMonth, $startDay);
        $end = CarbonImmutable::create($endYear, $endMonth, $endDay);

        if ($end->lt($start) || $start->diffInDays($end) > 62) {
            return null;
        }

        $this->year = $end->year;
        $this->sectionMonth ??= $end->month;

        return [$start->toDateString(), $end->toDateString()];
    }
}
