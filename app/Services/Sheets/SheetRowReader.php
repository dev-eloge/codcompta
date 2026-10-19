<?php

namespace App\Services\Sheets;

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Report;
use App\Models\SheetSource;
use App\Services\Parsing\ProductMatcher;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Turns the rows of a sheet tab into proposed reports, one per dated row.
 *
 * Title rows ("Mois de juillet") give the month to the rows below, total rows are skipped,
 * and a row already imported with the same figures is left out.
 */
class SheetRowReader
{
    private const AMOUNTS = ['delivered', 'revenue', 'purchase_cost', 'ad_spend', 'closing_fees', 'delivery_fees', 'other_fees'];

    /**
     * @param  list<list<mixed>>  $rows  all the tab's rows, header included
     * @return array{proposals: list<array<string, mixed>>, warnings: list<string>, rows_read: int, unchanged: int}
     */
    public function read(SheetSource $source, array $rows, ?CarbonImmutable $today = null): array
    {
        $source->loadMissing('country.agencies', 'merchant');
        $today ??= CarbonImmutable::now($source->merchant->timezone);
        $parser = new PeriodLabelParser($today);
        $columns = $source->columns;
        $agencies = $source->country->agencies;
        $existing = $source->reports()->with(['lines', 'adSpends'])->get()->keyBy('sheet_row_key');
        $existingAdSpends = AdSpend::where('sheet_source_id', $source->id)->whereNotNull('sheet_row_key')->pluck('amount', 'sheet_row_key');

        $proposals = [];
        $warnings = [];
        $rowsRead = 0;
        $unchanged = 0;

        foreach (array_slice($rows, $source->header_row, null, true) as $index => $row) {
            $label = trim((string) $this->cell($row, $columns['label'] ?? null));
            $amounts = $this->amounts($row, $columns);
            $hasFigures = array_filter($amounts) !== [];

            if ($label === '' && ! $hasFigures) {
                continue;
            }

            $rowsRead++;
            $sheetRow = $index + 1;

            if (PeriodLabelParser::isTotal($label)) {
                continue;
            }

            if (! $hasFigures) {
                $parser->readSectionTitle($label);

                continue;
            }

            $period = $parser->parse($label);
            $adOnly = $amounts['ad_spend'] > 0 && array_sum($amounts) === $amounts['ad_spend'];
            [$agency, $agencyWarning, $shared] = $this->agencyFor($label, $agencies, $source->default_agency_id, $adOnly);

            $proposal = [
                'row' => $sheetRow,
                'kind' => $adOnly ? 'ad_spend' : 'report',
                'shared' => $shared,
                'label' => $label,
                'period_start' => $period[0] ?? null,
                'period_end' => $period[1] ?? null,
                'agency_id' => $agency?->id,
                ...$amounts,
                'sheet_profit' => $this->number($this->cell($row, $columns['profit'] ?? null)),
                'warnings' => array_values(array_filter([$agencyWarning, $parser->correction])),
            ];

            if ($period === null) {
                $proposal['warnings'][] = "Date non reconnue dans « {$label} » : indiquez-la.";
            }

            $proposal['profit'] = $amounts['revenue'] - $amounts['purchase_cost'] - $amounts['ad_spend']
                - $amounts['closing_fees'] - $amounts['delivery_fees'] - $amounts['other_fees'];

            if ($proposal['sheet_profit'] !== null && abs($proposal['sheet_profit'] - $proposal['profit']) > 1) {
                $proposal['warnings'][] = 'Le bénéfice écrit dans le Sheet ('.number_format($proposal['sheet_profit'], 0, ',', ' ')
                    .' F) diffère du calcul ('.number_format($proposal['profit'], 0, ',', ' ').' F) : une colonne manque peut-être.';
            }

            $proposal['key'] = self::key($source, $proposal);
            $current = $proposal['key'] !== null ? $existing->get($proposal['key']) : null;
            $currentAdSpend = $proposal['key'] !== null ? $existingAdSpends->get($proposal['key']) : null;

            if (($current !== null && $this->sameFigures($current, $proposal))
                || ($adOnly && $currentAdSpend !== null && (int) $currentAdSpend === $amounts['ad_spend'])) {
                $unchanged++;

                continue;
            }

            $proposal['changed'] = $current !== null || $currentAdSpend !== null;
            $proposal['status'] = $adOnly ? Report::STATUS_COUNTED : $this->suggestedStatus($proposal, $source);

            if ($proposal['status'] === Report::STATUS_DETAIL) {
                $proposal['warnings'][] = 'Ces jours sont déjà comptés pour cette agence par un autre rapport : proposé en « Détail ».';
            }

            $proposal['selected'] = $period !== null && ($agency !== null || $shared);
            $proposals[] = $proposal;
        }

        $seen = [];

        foreach ($proposals as $index => $proposal) {
            if ($proposal['key'] === null) {
                continue;
            }

            if (isset($seen[$proposal['key']])) {
                $proposals[$index]['selected'] = false;
                $proposals[$index]['warnings'][] = "Même agence et mêmes dates que la ligne {$seen[$proposal['key']]} : une seule des deux peut être importée.";
            }

            $seen[$proposal['key']] ??= $proposal['row'];
        }

        if ($rowsRead > 0 && $proposals === [] && $unchanged === 0) {
            $warnings[] = 'Aucune ligne datée avec des montants n\'a été trouvée. Vérifiez la ligne des titres et les colonnes choisies.';
        }

        return ['proposals' => $proposals, 'warnings' => $warnings, 'rows_read' => $rowsRead, 'unchanged' => $unchanged];
    }

    /**
     * A sheet row is known by its tab, its dates and its agency, so a re-read finds it again.
     *
     * @param  array<string, mixed>  $proposal
     */
    public static function key(SheetSource $source, array $proposal): ?string
    {
        $shared = ($proposal['kind'] ?? 'report') === 'ad_spend' && empty($proposal['agency_id']);

        if (empty($proposal['period_start']) || (empty($proposal['agency_id']) && ! $shared)) {
            return null;
        }

        return hash('sha256', implode('|', [
            $source->id,
            $proposal['kind'] ?? 'report',
            $proposal['period_start'],
            $proposal['period_end'],
            $shared ? 'all' : $proposal['agency_id'],
        ]));
    }

    /**
     * @param  list<mixed>  $row
     * @param  array<string, int|null>  $columns
     * @return array<string, int>
     */
    private function amounts(array $row, array $columns): array
    {
        $amounts = [];

        foreach (self::AMOUNTS as $field) {
            $amounts[$field] = max(0, $this->number($this->cell($row, $columns[$field] ?? null)) ?? 0);
        }

        return $amounts;
    }

    /**
     * @param  list<mixed>  $row
     */
    private function cell(array $row, ?int $column): mixed
    {
        return $column === null ? null : ($row[$column] ?? null);
    }

    /**
     * Numbers come unformatted from Google; text such as "129 000" or "53,2%" is cleaned up too.
     */
    private function number(mixed $value): ?int
    {
        if (is_int($value) || is_float($value)) {
            return (int) round($value);
        }

        if (! is_string($value) || trim($value) === '' || str_contains($value, '%')) {
            return null;
        }

        $clean = preg_replace('/[^\d,.\-]/', '', str_replace(["\u{202F}", "\u{00A0}", ' '], '', $value));

        if ($clean === '' || $clean === '-' || ! preg_match('/\d/', (string) $clean)) {
            return null;
        }

        $clean = preg_replace('/[.,](\d{3})(?=\D|$)/', '$1', (string) $clean);

        return (int) round((float) str_replace(',', '.', (string) $clean));
    }

    /**
     * A pub-only row that names no agency is pub for the whole country, shared by sales.
     *
     * @param  Collection<int, Agency>  $agencies
     * @return array{0: Agency|null, 1: string|null, 2: bool}
     */
    private function agencyFor(string $label, Collection $agencies, ?int $defaultAgencyId, bool $adOnly): array
    {
        $text = ProductMatcher::normalize($label);

        $matches = $agencies->filter(function (Agency $agency) use ($text) {
            $name = ProductMatcher::normalize($agency->name);

            return $name !== '' && preg_match('/(^|\s)'.preg_quote($name, '/').'(\s|$)/', $text);
        });

        if ($matches->count() > 1) {
            $matches = $matches->sortByDesc(fn (Agency $agency) => strlen($agency->name))->take(1);
        }

        if ($matches->count() === 1) {
            return [$matches->first(), null, false];
        }

        if (preg_match('/\bagence\s+([a-z0-9]+(?:\s+[a-z0-9]+)?)/', $text, $named)) {
            return [null, "Agence « {$named[0]} » inconnue dans ce pays : choisissez-la ou ajoutez-la au référentiel.", false];
        }

        if ($adOnly) {
            return [null, null, true];
        }

        $default = $agencies->firstWhere('id', $defaultAgencyId);

        return $default !== null
            ? [$default, null, false]
            : [null, 'Aucune agence dans cette ligne : choisissez-la.', false];
    }

    /**
     * @param  array<string, mixed>  $proposal
     */
    private function sameFigures(Report $report, array $proposal): bool
    {
        return $report->deliveredQuantity() === $proposal['delivered']
            && $report->revenue() === $proposal['revenue']
            && $report->purchaseCost() === $proposal['purchase_cost']
            && (int) $report->adSpends->sum('amount') === $proposal['ad_spend']
            && $report->closing_fees === $proposal['closing_fees']
            && $report->delivery_fees === $proposal['delivery_fees']
            && $report->other_fees === $proposal['other_fees'];
    }

    /**
     * @param  array<string, mixed>  $proposal
     */
    private function suggestedStatus(array $proposal, SheetSource $source): string
    {
        if ($proposal['period_start'] === null || $proposal['agency_id'] === null) {
            return Report::STATUS_COUNTED;
        }

        $overlap = Report::query()
            ->where('agency_id', $proposal['agency_id'])
            ->counted()
            ->where(fn ($query) => $query->whereNull('sheet_source_id')->orWhere('sheet_source_id', '!=', $source->id))
            ->whereDate('period_start', '<=', $proposal['period_end'])
            ->whereDate('period_end', '>=', $proposal['period_start'])
            ->exists();

        return $overlap ? Report::STATUS_DETAIL : Report::STATUS_COUNTED;
    }
}
