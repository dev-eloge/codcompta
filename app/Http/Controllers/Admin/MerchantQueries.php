<?php

namespace App\Http\Controllers\Admin;

use App\Models\Agency;
use App\Models\Merchant;
use App\Models\RawMessage;
use App\Models\Report;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Sub-queries shared by the admin screens: counts and last activity of each merchant.
 */
trait MerchantQueries
{
    /**
     * @param  Builder<Merchant>  $query
     * @return Builder<Merchant>
     */
    protected function withActivity(Builder $query): Builder
    {
        $reportsOfMerchant = fn () => Report::query()
            ->join('agencies', 'agencies.id', '=', 'reports.agency_id')
            ->join('countries', 'countries.id', '=', 'agencies.country_id')
            ->whereColumn('countries.merchant_id', 'merchants.id');

        return $query
            ->withCount(['countries', 'users'])
            ->addSelect([
                'agencies_count' => Agency::query()
                    ->join('countries', 'countries.id', '=', 'agencies.country_id')
                    ->whereColumn('countries.merchant_id', 'merchants.id')
                    ->selectRaw('count(*)'),
                'reports_count' => $reportsOfMerchant()->selectRaw('count(*)'),
                'last_report_at' => $reportsOfMerchant()->selectRaw('max(reports.created_at)'),
                'last_message_at' => RawMessage::query()
                    ->join('agencies', 'agencies.id', '=', 'raw_messages.agency_id')
                    ->join('countries', 'countries.id', '=', 'agencies.country_id')
                    ->whereColumn('countries.merchant_id', 'merchants.id')
                    ->selectRaw('max(raw_messages.created_at)'),
            ])
            ->with(['users' => fn ($users) => $users->orderByRaw("role = 'owner' desc")->orderBy('id')]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function presentMerchant(Merchant $merchant): array
    {
        $owner = $merchant->users->first();
        $lastActivity = collect([$merchant->last_report_at, $merchant->last_message_at, $owner?->updated_at?->toDateTimeString()])
            ->filter()
            ->max();

        return [
            'id' => $merchant->id,
            'name' => $merchant->name,
            'owner' => $owner ? ['id' => $owner->id, 'name' => $owner->name, 'email' => $owner->email, 'google' => $owner->google_id !== null] : null,
            'created_at' => $merchant->created_at?->toIso8601String(),
            'countries_count' => (int) $merchant->countries_count,
            'agencies_count' => (int) $merchant->agencies_count,
            'users_count' => (int) $merchant->users_count,
            'reports_count' => (int) $merchant->reports_count,
            'last_activity_at' => $lastActivity ? Carbon::parse($lastActivity)->toIso8601String() : null,
            'suspended_at' => $merchant->suspended_at?->toIso8601String(),
            'suspension_reason' => $merchant->suspension_reason,
            'is_admin_account' => $merchant->users->contains('is_super_admin', true),
        ];
    }
}
