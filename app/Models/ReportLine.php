<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportLine extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'report_id',
        'product_id',
        'label',
        'quantity',
        'amount',
        'unit_cost_applied',
        'purchase_cost',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * A line imported from a sheet carries its own purchase cost; otherwise quantity × unit cost.
     */
    public function purchaseCost(): int
    {
        return $this->purchase_cost ?? $this->quantity * $this->unit_cost_applied;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'amount' => 'integer',
            'unit_cost_applied' => 'integer',
            'purchase_cost' => 'integer',
        ];
    }
}
