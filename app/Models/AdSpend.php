<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdSpend extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'country_id',
        'agency_id',
        'period_start',
        'period_end',
        'amount',
        'platform',
    ];

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
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
        ];
    }
}
