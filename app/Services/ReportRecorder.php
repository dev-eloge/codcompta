<?php

namespace App\Services;

use App\Http\Requests\StoreReportRequest;
use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Closer;
use App\Models\Courier;
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
     *     lines: list<array{product_id: int, quantity: int, amount: int}>,
     *     ads?: list<array<string, mixed>>, fuel_fees?: int|null,
     *     team?: list<array{type: string, id: int, count: int}>}  $data
     */
    public function record(Agency $agency, array $data, ?User $validator = null): Report
    {
        return DB::transaction(function () use ($agency, $data, $validator) {
            $linesTotal = (int) collect($data['lines'])->sum('amount');

            $team = $this->teamEntries($agency, $data['team'] ?? []);

            $report = $agency->reports()->create([
                'raw_message_id' => $data['raw_message_id'] ?? null,
                'validated_by' => $validator?->id,
                'period_start' => $data['period_start'],
                'period_end' => $data['period_end'],
                ...$this->fees($agency, $data, $team),
                'announced_total' => $data['announced_total'] ?? null,
                'status' => $this->statusFor($data['status'], $data['announced_total'] ?? null, $linesTotal),
                'source' => $data['source'] ?? Report::SOURCE_MANUAL,
                'note' => $data['note'] ?? null,
                'received_at' => now(),
                'validated_at' => $validator ? now() : null,
            ]);

            $this->writeLines($report, $data['lines'], $data['period_end']);
            $this->writeAds($report, $data['ads'] ?? []);
            $report->teamEntries()->createMany($team);
            $this->touchAgency($agency, $report);

            return $report;
        });
    }

    /**
     * Corrects a saved report: its fields and lines are replaced by the new ones.
     *
     * @param  array<string, mixed>  $data  same shape as record()
     */
    public function update(Report $report, array $data, ?User $validator = null): Report
    {
        return DB::transaction(function () use ($report, $data, $validator) {
            $linesTotal = (int) collect($data['lines'])->sum('amount');

            $team = $this->teamEntries($report->agency, $data['team'] ?? []);

            $report->update([
                'period_start' => $data['period_start'],
                'period_end' => $data['period_end'],
                ...$this->fees($report->agency, $data, $team),
                'announced_total' => $data['announced_total'] ?? null,
                'status' => $this->statusFor($data['status'], $data['announced_total'] ?? null, $linesTotal),
                'note' => $data['note'] ?? null,
                'validated_by' => $validator?->id ?? $report->validated_by,
                'validated_at' => $validator ? now() : $report->validated_at,
            ]);

            $report->lines()->delete();
            $this->writeLines($report, $data['lines'], $data['period_end']);

            // Only the ads typed in this form are replaced; an old ad with no product stays as it was.
            $report->adSpends()->whereNotNull('product_id')->delete();
            $this->writeAds($report, $data['ads'] ?? []);
            $report->teamEntries()->delete();
            $report->teamEntries()->createMany($team);
            $this->refreshLastReport($report->agency);

            return $report->fresh('lines');
        });
    }

    /**
     * Deletes a report and keeps the agency's "last report" date right.
     */
    public function delete(Report $report): void
    {
        DB::transaction(function () use ($report) {
            $agency = $report->agency;
            $this->releaseAds($report);
            $report->delete();
            $this->refreshLastReport($agency);
        });
    }

    /**
     * The ads typed in a deleted report stop counting. An ad of its own agency, or with no product,
     * goes with it. An ad shared by the country moves to another counted report that delivered the
     * product on its days, so the other agency keeps it; when there is none, it goes too.
     */
    private function releaseAds(Report $report): void
    {
        foreach ($report->adSpends()->get() as $ad) {
            if ($ad->product_id === null || $ad->agency_id !== null) {
                $ad->delete();

                continue;
            }

            $heir = Report::query()
                ->whereKeyNot($report->id)
                ->whereIn('agency_id', Agency::query()->where('country_id', $ad->country_id)->whereKeyNot($report->agency_id)->select('id'))
                ->counted()
                ->whereDate('period_start', '<=', $ad->period_end)
                ->whereDate('period_end', '>=', $ad->period_start)
                ->whereHas('lines', fn ($query) => $query->where('product_id', $ad->product_id))
                ->orderBy('id')
                ->first();

            if ($heir === null) {
                $ad->delete();

                continue;
            }

            $ad->update(['report_id' => $heir->id]);
        }
    }

    /**
     * @param  list<array{product_id: int, quantity: int, amount: int}>  $lines
     */
    private function writeLines(Report $report, array $lines, string $periodEnd): void
    {
        foreach ($lines as $line) {
            $product = Product::findOrFail($line['product_id']);

            $report->lines()->create([
                'product_id' => $product->id,
                'quantity' => $line['quantity'],
                'amount' => $line['amount'],
                'unit_cost_applied' => $product->costAt($periodEnd) ?? 0,
            ]);
        }
    }

    /**
     * Fees of the day. For the own team, delivery and closing are what the couriers and closers
     * paid that day cost (monthly salaries are counted once a month, elsewhere), plus the fuel.
     *
     * @param  array<string, mixed>  $data
     * @param  list<array<string, mixed>>  $team
     * @return array{delivery_fees: int, closing_fees: int, other_fees: int, fuel_fees: int}
     */
    private function fees(Agency $agency, array $data, array $team): array
    {
        if ($agency->is_own_team) {
            $team = collect($team);

            return [
                'delivery_fees' => (int) $team->whereNotNull('courier_id')->sum('amount'),
                'closing_fees' => (int) $team->whereNotNull('closer_id')->sum('amount'),
                'other_fees' => (int) ($data['other_fees'] ?? 0),
                'fuel_fees' => (int) ($data['fuel_fees'] ?? 0),
            ];
        }

        return [
            'delivery_fees' => (int) ($data['delivery_fees'] ?? 0),
            'closing_fees' => (int) ($data['closing_fees'] ?? 0),
            'other_fees' => (int) ($data['other_fees'] ?? 0),
            'fuel_fees' => 0,
        ];
    }

    /**
     * What each courier and closer did that day, and what it cost, with their name kept for history.
     *
     * @param  list<array{type: string, id: int, count: int}>  $team
     * @return list<array<string, mixed>>
     */
    private function teamEntries(Agency $agency, array $team): array
    {
        if (! $agency->is_own_team) {
            return [];
        }

        $entries = [];

        foreach ($team as $member) {
            $person = $member['type'] === 'courier'
                ? Courier::where('country_id', $agency->country_id)->findOrFail($member['id'])
                : Closer::where('country_id', $agency->country_id)->findOrFail($member['id']);

            $entries[] = [
                'courier_id' => $person instanceof Courier ? $person->id : null,
                'closer_id' => $person instanceof Closer ? $person->id : null,
                'name' => $person->name,
                'count' => (int) $member['count'],
                'amount' => $person->payFor((int) $member['count']),
            ];
        }

        return $entries;
    }

    /**
     * Saves the ads of the products of the report. One ad covers one product, one country and
     * one day: when another agency already noted it, it is shared, never created a second time.
     *
     * @param  list<array<string, mixed>>  $ads
     */
    private function writeAds(Report $report, array $ads): void
    {
        $countryId = $report->agency->country_id;
        $from = $report->period_start->toDateString();
        $to = $report->period_end->toDateString();

        foreach ($ads as $ad) {
            $alreadyNoted = AdSpend::query()
                ->where('country_id', $countryId)
                ->where('product_id', $ad['product_id'])
                ->sharedByProduct()
                ->overlapping($from, $to)
                ->lockForUpdate()
                ->exists();

            $choice = $ad['choice'] ?? null;

            if ($alreadyNoted && $choice !== StoreReportRequest::AD_SEPARATE) {
                continue;
            }

            if (! $alreadyNoted && $choice === StoreReportRequest::AD_SAME) {
                continue;
            }

            $bothPlatforms = $ad['platform'] === AdSpend::PLATFORM_FACEBOOK_TIKTOK;
            $facebookAmount = $bothPlatforms ? (int) ($ad['facebook_amount'] ?? 0) : null;
            $tiktokAmount = $bothPlatforms ? (int) ($ad['tiktok_amount'] ?? 0) : null;

            $report->adSpends()->create([
                'country_id' => $countryId,
                'agency_id' => $choice === StoreReportRequest::AD_SEPARATE ? $report->agency_id : null,
                'product_id' => $ad['product_id'],
                'period_start' => $from,
                'period_end' => $to,
                'platform' => $ad['platform'],
                'amount' => $bothPlatforms ? $facebookAmount + $tiktokAmount : (int) $ad['amount'],
                'facebook_amount' => $facebookAmount,
                'tiktok_amount' => $tiktokAmount,
                'orders_received' => $ad['orders_received'] ?? null,
            ]);
        }
    }

    private function touchAgency(Agency $agency, Report $report): void
    {
        if ($agency->last_report_at === null || $agency->last_report_at->lt($report->period_end)) {
            $agency->update(['last_report_at' => $report->period_end]);
        }
    }

    private function refreshLastReport(Agency $agency): void
    {
        $agency->update(['last_report_at' => $agency->reports()->max('period_end')]);
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
