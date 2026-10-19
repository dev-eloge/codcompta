<?php

namespace App\Services\Sheets;

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Report;
use App\Models\SheetImport;
use App\Models\SheetSource;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Saves the sheet rows the merchant ticked as reports (source "sheet").
 *
 * A sheet row gives totals, so the report gets one line without product carrying the sales,
 * the units delivered and the purchase cost written in the sheet. Its ad spend is saved for
 * the agency and deleted with the report.
 */
class SheetImporter
{
    /**
     * @param  list<array<string, mixed>>  $rows  the ticked proposals, possibly corrected by the merchant
     * @return int number of rows saved
     */
    public function import(SheetImport $import, array $rows, ?User $user = null): int
    {
        $source = $import->source()->with('country')->firstOrFail();

        return DB::transaction(function () use ($import, $source, $rows, $user) {
            $saved = 0;

            foreach ($rows as $row) {
                $agency = filled($row['agency_id'] ?? null)
                    ? Agency::where('country_id', $source->country_id)->findOrFail($row['agency_id'])
                    : null;
                $key = SheetRowReader::key($source, $row);

                // A row changed in the sheet replaces what was imported before.
                $source->reports()->where('sheet_row_key', $key)->get()->each->delete();
                AdSpend::where('sheet_source_id', $source->id)->where('sheet_row_key', $key)->delete();

                if (($row['kind'] ?? 'report') === 'ad_spend') {
                    $this->saveAdSpend($source, $agency, $row, $key);
                } else {
                    $this->saveRow($source, $agency, $row, $key, $user);
                }

                $saved++;
            }

            $import->update(['status' => SheetImport::STATUS_DONE]);
            $source->update(['last_synced_at' => now()]);

            // A row with only ad spend is not a report from the agency: it does not reset the late alert.
            $source->country->agencies()->each(function (Agency $agency) {
                $agency->update(['last_report_at' => $agency->reports()->whereHas('lines')->max('period_end')]);
            });

            return $saved;
        });
    }

    /**
     * A row with only ad spend: for its agency, or for the whole country when it names none.
     *
     * @param  array<string, mixed>  $row
     */
    private function saveAdSpend(SheetSource $source, ?Agency $agency, array $row, string $key): void
    {
        AdSpend::create([
            'country_id' => $source->country_id,
            'agency_id' => $agency?->id,
            'sheet_source_id' => $source->id,
            'sheet_row_key' => $key,
            'period_start' => $row['period_start'],
            'period_end' => $row['period_end'],
            'amount' => (int) $row['ad_spend'],
            'platform' => 'autre',
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function saveRow(SheetSource $source, Agency $agency, array $row, string $key, ?User $user): void
    {
        $report = $agency->reports()->create([
            'sheet_source_id' => $source->id,
            'sheet_row_key' => $key,
            'validated_by' => $user?->id,
            'period_start' => $row['period_start'],
            'period_end' => $row['period_end'],
            'delivery_fees' => (int) $row['delivery_fees'],
            'closing_fees' => (int) $row['closing_fees'],
            'other_fees' => (int) $row['other_fees'],
            'announced_total' => null,
            'status' => $row['status'],
            'source' => Report::SOURCE_SHEET,
            'note' => mb_substr("Ligne {$row['row']} du Sheet : {$row['label']}", 0, 1000),
            'received_at' => now(),
            'validated_at' => $user ? now() : null,
        ]);

        if ((int) $row['revenue'] > 0 || (int) $row['delivered'] > 0 || (int) $row['purchase_cost'] > 0) {
            $report->lines()->create([
                'product_id' => null,
                'label' => 'Ventes (Sheet)',
                'quantity' => (int) $row['delivered'],
                'amount' => (int) $row['revenue'],
                'unit_cost_applied' => 0,
                'purchase_cost' => (int) $row['purchase_cost'],
            ]);
        }

        if ((int) $row['ad_spend'] > 0) {
            AdSpend::create([
                'country_id' => $source->country_id,
                'agency_id' => $agency->id,
                'report_id' => $report->id,
                'period_start' => $row['period_start'],
                'period_end' => $row['period_end'],
                'amount' => (int) $row['ad_spend'],
                'platform' => 'autre',
            ]);
        }
    }
}
