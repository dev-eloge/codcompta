<?php

namespace App\Models;

use Database\Factories\CloserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A closer of the merchant's own team: she calls the customers and confirms the orders.
 */
class Closer extends Model
{
    /** @use HasFactory<CloserFactory> */
    use HasFactory;

    public const PAY_PER_DELIVERED_ORDER = 'per_delivered_order';

    public const PAY_PER_CONFIRMED_ORDER = 'per_confirmed_order';

    public const PAY_MONTHLY = 'monthly';

    public const PAY_PER_DAY = 'per_day';

    public const PAY_MODES = [self::PAY_PER_DELIVERED_ORDER, self::PAY_PER_CONFIRMED_ORDER, self::PAY_MONTHLY, self::PAY_PER_DAY];

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
     * What the closer costs on a day with this number of orders (delivered or confirmed, as she is paid).
     * A monthly salary costs nothing on the day.
     */
    public function payFor(int $orders): int
    {
        return match ($this->pay_mode) {
            self::PAY_PER_DELIVERED_ORDER, self::PAY_PER_CONFIRMED_ORDER => $orders * $this->pay_amount,
            self::PAY_PER_DAY => $orders > 0 ? $this->pay_amount : 0,
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
