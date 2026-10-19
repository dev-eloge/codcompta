<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Saves an agency report with its lines, applying the business rules on the way in.
 */
class ReportRecorder
{
    /**
     * @param  array{period_start: string, period_end: string, status: string, source?: string,
     *     delivery_fees?: int|null, closing_fees?: int|null, other_fees?: int|null,
     *     announced_total?: int|null, note?: string|null, raw_message_id?: int|null,
     *     lines: list<array{product_id: int, quantity: int, amount: int}>}  $data
     */
    public function record(Agency $agency, array $data, ?User $validator = null): Report
    {
        return DB::transaction(function () use ($agency, $data, $validator) {
            $linesTotal = (int) collect($data['lines'])->sum('amount');

            $report = $agency->reports()->create([
                'raw_message_id' => $data['raw_message_id'] ?? null,
                'validated_by' => $validator?->id,
                'period_start' => $data['period_start'],
                'period_end' => $data['period_end'],
                'delivery_fees' => (int) ($data['delivery_fees'] ?? 0),
                'closing_fees' => (int) ($data['closing_fees'] ?? 0),
                'other_fees' => (int) ($data['other_fees'] ?? 0),
                'announced_total' => $data['announced_total'] ?? null,
                'status' => $this->statusFor($data['status'], $data['announced_total'] ?? null, $linesTotal),
                'source' => $data['source'] ?? Report::SOURCE_MANUAL,
                'note' => $data['note'] ?? null,
                'received_at' => now(),
                'validated_at' => $validator ? now() : null,
            ]);

            foreach ($data['lines'] as $line) {
                $product = Product::findOrFail($line['product_id']);

                $report->lines()->create([
                    'product_id' => $product->id,
                    'quantity' => $line['quantity'],
                    'amount' => $line['amount'],
                    'unit_cost_applied' => $product->costAt($data['period_end']) ?? 0,
                ]);
            }

            if ($agency->last_report_at === null || $agency->last_report_at->lt($report->period_end)) {
                $agency->update(['last_report_at' => $report->period_end]);
            }

            return $report;
        });
    }

    /**
     * A counted report whose lines do not match the total announced by the agency
     * is put aside for checking (RG-09).
     */
    private function statusFor(string $requested, ?int $announcedTotal, int $linesTotal): string
    {
        if ($requested === Report::STATUS_COUNTED && $announcedTotal !== null && $announcedTotal !== $linesTotal) {
            return Report::STATUS_TO_VERIFY;
        }

        return $requested;
    }
}
