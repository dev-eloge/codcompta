<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Country extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'merchant_id',
        'name',
        'code',
        'currency',
        'delivery_mode',
        'bike_rent',
        'phone_credit',
        'storage_rent',
    ];

    public const DELIVERY_AGENCY = 'agency';

    public const DELIVERY_TEAM = 'team';

    public const DELIVERY_BOTH = 'both';

    /** Who delivers the orders: an agency, the merchant's own team, or both. */
    public const DELIVERY_MODES = [self::DELIVERY_AGENCY, self::DELIVERY_TEAM, self::DELIVERY_BOTH];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function agencies(): HasMany
    {
        return $this->hasMany(Agency::class);
    }

    public function couriers(): HasMany
    {
        return $this->hasMany(Courier::class);
    }

    public function closers(): HasMany
    {
        return $this->hasMany(Closer::class);
    }

    /**
     * The agency that stands for the merchant's own team in this country, if any.
     */
    public function ownTeam(): HasOne
    {
        return $this->hasOne(Agency::class)->where('is_own_team', true);
    }

    public function hasOwnTeam(): bool
    {
        return in_array($this->delivery_mode, [self::DELIVERY_TEAM, self::DELIVERY_BOTH], true);
    }

    /**
     * Fixed costs of one month of the own team: motorbike, phone credit, shop or storage.
     */
    public function monthlyFixedCosts(): int
    {
        return $this->bike_rent + $this->phone_credit + $this->storage_rent;
    }

    public function adSpends(): HasMany
    {
        return $this->hasMany(AdSpend::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'bike_rent' => 'integer',
            'phone_credit' => 'integer',
            'storage_rent' => 'integer',
        ];
    }
}
