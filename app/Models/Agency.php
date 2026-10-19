<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Agency extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'country_id',
        'name',
        'contact',
        'report_mode',
        'alert_after_days',
        'last_report_at',
    ];

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    public function rawMessages(): HasMany
    {
        return $this->hasMany(RawMessage::class);
    }

    public function productAliases(): HasMany
    {
        return $this->hasMany(ProductAlias::class);
    }

    /**
     * Number of whole days since the last report, or null when none was ever received.
     */
    public function daysWithoutReport(?Carbon $today = null): ?int
    {
        if ($this->last_report_at === null) {
            return null;
        }

        return (int) $this->last_report_at->startOfDay()->diffInDays(($today ?? now())->startOfDay());
    }

    /**
     * An agency is late when it has been silent longer than its alert delay (RG-08).
     */
    public function isLate(?Carbon $today = null): bool
    {
        $days = $this->daysWithoutReport($today);

        return $days !== null && $days > $this->alert_after_days;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'alert_after_days' => 'integer',
            'last_report_at' => 'datetime',
        ];
    }
}
