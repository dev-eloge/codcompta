<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Francs CFA for one unit of a foreign currency, on one day.
 */
class ExchangeRate extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = ['currency', 'rate_date', 'rate', 'source'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rate_date' => 'date',
            'rate' => 'float',
        ];
    }
}
