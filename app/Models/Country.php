<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function agencies(): HasMany
    {
        return $this->hasMany(Agency::class);
    }

    public function adSpends(): HasMany
    {
        return $this->hasMany(AdSpend::class);
    }
}
