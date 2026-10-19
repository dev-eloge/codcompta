<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Report extends Model
{
    public const STATUS_COUNTED = 'counted';

    public const STATUS_DETAIL = 'detail';

    public const STATUS_TO_VERIFY = 'to_verify';

    public const SOURCE_MANUAL = 'manual';

    public const SOURCE_MESSAGE = 'message';

    public const SOURCE_SHEET = 'sheet';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'agency_id',
        'raw_message_id',
        'validated_by',
        'period_start',
        'period_end',
        'delivery_fees',
        'closing_fees',
        'other_fees',
        'announced_total',
        'status',
        'source',
        'note',
        'received_at',
        'validated_at',
    ];

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    public function rawMessage(): BelongsTo
    {
        return $this->belongsTo(RawMessage::class);
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ReportLine::class);
    }

    /**
     * Only the reports that enter the totals (RG-07, RG-09).
     */
    public function scopeCounted(Builder $query): void
    {
        $query->where('status', self::STATUS_COUNTED);
    }

    /**
     * Reports whose end date falls in the period (RG-06).
     */
    public function scopeEndingBetween(Builder $query, string $from, string $to): void
    {
        $query->whereDate('period_end', '>=', $from)->whereDate('period_end', '<=', $to);
    }

    public function revenue(): int
    {
        return (int) $this->lines->sum('amount');
    }

    public function purchaseCost(): int
    {
        return (int) $this->lines->sum(fn (ReportLine $line) => $line->purchaseCost());
    }

    public function deliveredQuantity(): int
    {
        return (int) $this->lines->sum('quantity');
    }

    public function isCounted(): bool
    {
        return $this->status === self::STATUS_COUNTED;
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
            'delivery_fees' => 'integer',
            'closing_fees' => 'integer',
            'other_fees' => 'integer',
            'announced_total' => 'integer',
            'received_at' => 'datetime',
            'validated_at' => 'datetime',
        ];
    }
}
