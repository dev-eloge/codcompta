<?php

namespace App\Services\Parsing;

use App\Models\Agency;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Turns what the reader proposed into clean reports the merchant can check:
 * whole numbers, real dates, products matched to the catalogue.
 */
class ProposalNormalizer
{
    /**
     * @param  array{reports?: mixed, warnings?: mixed}  $raw
     * @return array{reports: list<array<string, mixed>>, warnings: list<string>}
     */
    public function normalize(Agency $agency, array $raw): array
    {
        $matcher = new ProductMatcher($agency);
        $warnings = $this->strings($raw['warnings'] ?? []);
        $reports = [];

        foreach (is_array($raw['reports'] ?? null) ? $raw['reports'] : [] as $report) {
            if (! is_array($report)) {
                continue;
            }

            $start = $this->date($report['period_start'] ?? null);
            $end = $this->date($report['period_end'] ?? null) ?? $start;
            $start ??= $end;

            if ($start === null) {
                $warnings[] = 'Un rapport sans date a été ignoré.';

                continue;
            }

            if ($end < $start) {
                [$start, $end] = [$end, $start];
            }

            $lines = $this->lines($report['lines'] ?? [], $matcher);
            $reportWarnings = $this->strings($report['warnings'] ?? []);

            foreach ($lines as $line) {
                if ($line['product_id'] === null) {
                    $reportWarnings[] = "Produit « {$line['label']} » à choisir dans la liste.";
                }
            }

            $reports[] = [
                'kind' => ($report['kind'] ?? null) === 'recap' ? 'recap' : 'day',
                'period_start' => $start,
                'period_end' => $end,
                'lines' => $lines,
                'delivery_fees' => $this->amount($report['delivery_fees'] ?? null) ?? 0,
                'closing_fees' => $this->amount($report['closing_fees'] ?? null) ?? 0,
                'other_fees' => $this->amount($report['other_fees'] ?? null) ?? 0,
                'announced_total' => $this->amount($report['announced_total'] ?? null),
                'note' => is_string($report['note'] ?? null) ? mb_substr(trim($report['note']), 0, 1000) : null,
                'warnings' => array_values(array_unique($reportWarnings)),
            ];
        }

        usort($reports, fn (array $a, array $b) => [$a['period_start'], $a['period_end']] <=> [$b['period_start'], $b['period_end']]);

        $reports = $this->suggestStatuses($reports);

        return ['reports' => $reports, 'warnings' => array_values(array_unique($warnings))];
    }

    /**
     * A recap that repeats days already sent one by one is a detail, not extra sales (RG-07).
     *
     * @param  list<array<string, mixed>>  $reports
     * @return list<array<string, mixed>>
     */
    private function suggestStatuses(array $reports): array
    {
        foreach ($reports as $index => $report) {
            $repeatsOtherDays = $report['kind'] === 'recap' && collect($reports)->contains(
                fn (array $other, int $otherIndex) => $otherIndex !== $index
                    && $other['kind'] === 'day'
                    && $other['period_start'] <= $report['period_end']
                    && $other['period_end'] >= $report['period_start'],
            );

            $reports[$index]['suggested_status'] = $repeatsOtherDays ? 'detail' : 'counted';

            if ($repeatsOtherDays) {
                $reports[$index]['warnings'][] = 'Ce récap reprend des jours déjà présents dans le message : il est proposé en « Détail » pour ne pas compter deux fois.';
            }
        }

        return $reports;
    }

    /**
     * @return list<array{label: string, product_id: int|null, quantity: int, amount: int}>
     */
    private function lines(mixed $lines, ProductMatcher $matcher): array
    {
        $clean = [];

        foreach (is_array($lines) ? $lines : [] as $line) {
            if (! is_array($line)) {
                continue;
            }

            $label = trim((string) ($line['label'] ?? ''));
            $quantity = $this->amount($line['quantity'] ?? null) ?? 0;
            $amount = $this->amount($line['amount'] ?? null) ?? 0;

            if ($quantity <= 0 && $amount <= 0) {
                continue;
            }

            $suggested = is_numeric($line['product_id'] ?? null) ? (int) $line['product_id'] : null;

            $clean[] = [
                'label' => $label,
                'product_id' => $matcher->match($label, $suggested),
                'quantity' => max($quantity, 1),
                'amount' => $amount,
            ];
        }

        return $this->mergeSameProduct($clean);
    }

    /**
     * Two lines for the same product (sold at two prices) become one line, as in the sheet.
     *
     * @param  list<array{label: string, product_id: int|null, quantity: int, amount: int}>  $lines
     * @return list<array{label: string, product_id: int|null, quantity: int, amount: int}>
     */
    private function mergeSameProduct(array $lines): array
    {
        $merged = [];

        foreach ($lines as $line) {
            $key = $line['product_id'] !== null ? 'p'.$line['product_id'] : 'l'.ProductMatcher::normalize($line['label']);

            if (isset($merged[$key])) {
                $merged[$key]['quantity'] += $line['quantity'];
                $merged[$key]['amount'] += $line['amount'];

                continue;
            }

            $merged[$key] = $line;
        }

        return array_values($merged);
    }

    private function date(mixed $value): ?string
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('!Y-m-d', $value)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    private function amount(mixed $value): ?int
    {
        if (is_int($value)) {
            return max($value, 0);
        }

        if (is_float($value)) {
            return max((int) round($value), 0);
        }

        if (is_string($value)) {
            $digits = preg_replace('/[^\d]/', '', $value);

            return $digits === '' ? null : (int) $digits;
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function strings(mixed $values): array
    {
        if (! is_array($values)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn ($value) => is_string($value) ? trim($value) : '',
            $values,
        )));
    }
}
