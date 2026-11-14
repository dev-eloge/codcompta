<?php

namespace App\Services;

use App\Models\Country;
use App\Models\RawMessage;
use App\Models\Report;

/**
 * What may make the results of a country wrong: messages read but not saved yet,
 * messages that could not be read, and reports still waiting to be checked.
 */
class PendingItems
{
    /**
     * What may make the results wrong, shown first on the page: messages read but not saved yet,
     * messages that could not be read, and reports still waiting to be checked.
     *
     * @return list<array{kind: string, id: int|null, agency: string|null, count: int, date: string|null}>
     */
    public function forCountry(Country $country): array
    {
        $agencyIds = $country->agencies()->select('id');

        $messages = RawMessage::query()
            ->whereIn('agency_id', $agencyIds)
            ->whereIn('status', [RawMessage::STATUS_PARSED, RawMessage::STATUS_FAILED])
            ->with('agency:id,name')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (RawMessage $message) => [
                'kind' => $message->status === RawMessage::STATUS_FAILED ? 'message_failed' : 'message_parsed',
                'id' => $message->id,
                'agency' => $message->agency->name,
                'count' => 1,
                'date' => $message->created_at->toDateString(),
            ]);

        $toVerify = Report::query()
            ->whereIn('agency_id', $agencyIds)
            ->where('status', Report::STATUS_TO_VERIFY)
            ->count();

        return $messages
            ->when($toVerify > 0, fn ($items) => $items->push([
                'kind' => 'reports_to_verify',
                'id' => null,
                'agency' => null,
                'count' => $toVerify,
                'date' => null,
            ]))
            ->values()
            ->all();
    }

    /**
     * Number of things to settle in the country.
     */
    public function countFor(Country $country): int
    {
        return (int) collect($this->forCountry($country))->sum('count');
    }
}
