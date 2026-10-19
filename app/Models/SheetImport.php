<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One reading of a sheet tab: the reports it proposes, waiting for the merchant's check.
 */
class SheetImport extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_READY = 'ready';

    public const STATUS_FAILED = 'failed';

    public const STATUS_DONE = 'done';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'sheet_source_id',
        'user_id',
        'status',
        'proposals',
        'warnings',
        'error',
        'rows_read',
    ];

    public function source(): BelongsTo
    {
        return $this->belongsTo(SheetSource::class, 'sheet_source_id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'proposals' => 'array',
            'warnings' => 'array',
            'rows_read' => 'integer',
        ];
    }
}
