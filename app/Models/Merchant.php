<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Merchant extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'timezone',
        'currency',
        'share_savings',
        'share_pocket',
        'share_reinvestment',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function countries(): HasMany
    {
        return $this->hasMany(Country::class);
    }

    public function googleConnection(): HasOne
    {
        return $this->hasOne(GoogleConnection::class);
    }

    public function sheetSources(): HasMany
    {
        return $this->hasMany(SheetSource::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Profit split used by the reports (RG-03), in percent.
     *
     * @return array{savings: int, pocket: int, reinvestment: int}
     */
    public function profitShares(): array
    {
        return [
            'savings' => $this->share_savings,
            'pocket' => $this->share_pocket,
            'reinvestment' => $this->share_reinvestment,
        ];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'share_savings' => 'integer',
            'share_pocket' => 'integer',
            'share_reinvestment' => 'integer',
        ];
    }
}
