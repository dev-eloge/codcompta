<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A money target between two dates chosen by the merchant, on net profit or on revenue.
 *
 * @property CarbonImmutable $starts_on
 * @property CarbonImmutable $ends_on
 */
class FinancialGoal extends Model
{
    public const PROFIT = 'profit';

    public const REVENUE = 'revenue';

    public const METRICS = [self::PROFIT, self::REVENUE];

    /** The longest goal, in days. */
    public const MAX_DAYS = 366;

    protected $fillable = ['merchant_id', 'title', 'metric', 'amount', 'starts_on', 'ends_on', 'reached_notified_at', 'missed_notified_at'];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'starts_on' => 'immutable_date',
            'ends_on' => 'immutable_date',
            'reached_notified_at' => 'immutable_datetime',
            'missed_notified_at' => 'immutable_datetime',
        ];
    }
}
