<?php

namespace App\Models;

use Database\Factories\CourierFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A courier of the merchant's own team.
 */
class Courier extends Model
{
    /** @use HasFactory<CourierFactory> */
    use HasFactory;

    public const PAY_PER_DELIVERY = 'per_delivery';

    public const PAY_MONTHLY = 'monthly';

    public const PAY_PER_DAY = 'per_day';

    public const PAY_MODES = [self::PAY_PER_DELIVERY, self::PAY_MONTHLY, self::PAY_PER_DAY];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'country_id',
        'name',
        'pay_mode',
        'pay_amount',
    ];

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    /**
     * What the courier costs on a day with this number of deliveries. A monthly salary costs nothing on the day.
     */
    public function payFor(int $deliveries): int
    {
        return match ($this->pay_mode) {
            self::PAY_PER_DELIVERY => $deliveries * $this->pay_amount,
            self::PAY_PER_DAY => $deliveries > 0 ? $this->pay_amount : 0,
            default => 0,
        };
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'pay_amount' => 'integer',
        ];
    }
}
