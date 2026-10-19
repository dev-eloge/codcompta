<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Product extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'merchant_id',
        'name',
        'reference_price',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function costs(): HasMany
    {
        return $this->hasMany(ProductCost::class);
    }

    public function aliases(): HasMany
    {
        return $this->hasMany(ProductAlias::class);
    }

    public function reportLines(): HasMany
    {
        return $this->hasMany(ReportLine::class);
    }

    /**
     * Unit purchase cost valid on the given date (RG-04), or null when none is known yet.
     */
    public function costAt(Carbon|string $date): ?int
    {
        $cost = $this->costs()
            ->whereDate('valid_from', '<=', Carbon::parse($date))
            ->orderByDesc('valid_from')
            ->value('unit_cost');

        // Before its first recorded cost, a product is still bought at that first cost:
        // a report dated earlier than the day the product was added must not ask for it again.
        return $cost ?? $this->costs()->orderBy('valid_from')->value('unit_cost');
    }
}
