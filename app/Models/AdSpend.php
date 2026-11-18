<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdSpend extends Model
{
    public const PLATFORM_FACEBOOK = 'facebook';

    public const PLATFORM_TIKTOK = 'tiktok';

    public const PLATFORM_FACEBOOK_TIKTOK = 'facebook_tiktok';

    public const PLATFORM_OTHER = 'autre';

    /** Where an ad can run. With both Facebook and TikTok, orders are never split between them. */
    public const PLATFORMS = [self::PLATFORM_FACEBOOK, self::PLATFORM_TIKTOK, self::PLATFORM_FACEBOOK_TIKTOK, self::PLATFORM_OTHER];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'country_id',
        'agency_id',
        'report_id',
        'product_id',
        'period_start',
        'period_end',
        'amount',
        'facebook_amount',
        'tiktok_amount',
        'platform',
        'orders_received',
    ];

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /**
     * An ad with no agency is shared by every agency of the country that delivered its product.
     */
    public function isShared(): bool
    {
        return $this->agency_id === null;
    }

    /**
     * Ads of one product shared by the agencies of their country (no agency of their own).
     */
    public function scopeSharedByProduct(Builder $query): void
    {
        $query->whereNull('agency_id')->whereNotNull('product_id');
    }

    /**
     * Ad spends that cover at least one day of the period.
     */
    public function scopeOverlapping(Builder $query, string $from, string $to): void
    {
        $query->whereDate('period_start', '<=', $to)->whereDate('period_end', '>=', $from);
    }

    /**
     * Ad spends whose end date falls in the period (RG-06).
     */
    public function scopeEndingBetween(Builder $query, string $from, string $to): void
    {
        $query->whereDate('period_end', '>=', $from)->whereDate('period_end', '<=', $to);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'amount' => 'integer',
            'facebook_amount' => 'integer',
            'tiktok_amount' => 'integer',
            'orders_received' => 'integer',
        ];
    }

    /**
     * The ads already noted, for the whole country, on these days: one per product, as the report forms show them.
     *
     * @return list<array{id: int, product_id: int, platform: string|null, amount: int, facebook_amount: int|null, tiktok_amount: int|null, noted_by: string|null}>
     */
    public static function sharedWith(Agency $agency, string $from, string $to, ?int $exceptReportId = null): array
    {
        return self::query()
            ->where('country_id', $agency->country_id)
            ->sharedByProduct()
            ->overlapping($from, $to)
            ->when($exceptReportId, fn ($query) => $query->where(fn ($query) => $query->whereNull('report_id')->orWhere('report_id', '!=', $exceptReportId)))
            ->with('report.agency:id,name')
            ->orderBy('id')
            ->get()
            ->unique('product_id')
            ->map(fn (AdSpend $ad) => [
                'id' => $ad->id,
                'product_id' => $ad->product_id,
                'platform' => $ad->platform,
                'amount' => $ad->amount,
                'facebook_amount' => $ad->facebook_amount,
                'tiktok_amount' => $ad->tiktok_amount,
                'noted_by' => $ad->report?->agency?->name,
            ])
            ->values()
            ->all();
    }
}
