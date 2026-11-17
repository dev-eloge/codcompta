<?php

namespace App\Models;

use App\Support\ProfitSplit;
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
        'profit_split',
        'display_currency',
        'custom_rates',
        'report_reminders',
        'delivery_tip_dismissed_at',
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
     * How the merchant cuts the net profit: the merchant's own rule, or the 3 historical shares.
     */
    public function profitSplit(): ProfitSplit
    {
        if (is_array($this->profit_split) && $this->profit_split !== []) {
            return new ProfitSplit(array_values($this->profit_split));
        }

        return new ProfitSplit([
            ['name' => 'Épargne', 'percent' => (int) ($this->share_savings ?? 40)],
            ['name' => 'Votre poche', 'percent' => (int) ($this->share_pocket ?? 20)],
            ['name' => 'À réinvestir', 'percent' => (int) ($this->share_reinvestment ?? 40)],
        ]);
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
            'profit_split' => 'array',
            'custom_rates' => 'array',
            'report_reminders' => 'boolean',
            'delivery_tip_dismissed_at' => 'datetime',
            'suspended_at' => 'datetime',
        ];
    }
}
