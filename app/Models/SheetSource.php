<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One tab of a merchant's spreadsheet, with the meaning of its columns.
 *
 * `columns` maps a field (label, delivered, revenue, purchase_cost, ad_spend,
 * closing_fees, delivery_fees, other_fees, profit) to a zero-based column index.
 */
class SheetSource extends Model
{
    public const FIELDS = [
        'label' => 'Date ou période',
        'delivered' => 'Produits livrés',
        'revenue' => "Chiffre d'affaires",
        'purchase_cost' => "Coût d'achat",
        'ad_spend' => 'Pub',
        'closing_fees' => 'Closing et crédit',
        'delivery_fees' => 'Livraison',
        'other_fees' => 'Autres frais',
        'profit' => 'Bénéfice (pour contrôle)',
    ];

    public const REQUIRED_FIELDS = ['label', 'revenue'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'merchant_id',
        'country_id',
        'default_agency_id',
        'spreadsheet_id',
        'spreadsheet_title',
        'sheet_title',
        'header_row',
        'columns',
        'auto_sync',
        'last_synced_at',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function defaultAgency(): BelongsTo
    {
        return $this->belongsTo(Agency::class, 'default_agency_id');
    }

    public function imports(): HasMany
    {
        return $this->hasMany(SheetImport::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    public function url(): string
    {
        return "https://docs.google.com/spreadsheets/d/{$this->spreadsheet_id}/edit";
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'columns' => 'array',
            'auto_sync' => 'boolean',
            'header_row' => 'integer',
            'last_synced_at' => 'datetime',
        ];
    }
}
