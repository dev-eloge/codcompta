<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'suspended_at',
        'suspension_reason',
    ];

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    /**
     * Pasted agency messages of every agency of the merchant.
     *
     * @return Builder<RawMessage>
     */
    public function rawMessagesQuery(): Builder
    {
        return RawMessage::query()->whereIn('agency_id', Agency::query()
            ->whereIn('country_id', $this->countries()->select('id'))
            ->select('id'));
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function financialGoals(): HasMany
    {
        return $this->hasMany(FinancialGoal::class);
    }

    public function countries(): HasMany
    {
        return $this->hasMany(Country::class);
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
            'suspended_at' => 'datetime',
        ];
    }
}
