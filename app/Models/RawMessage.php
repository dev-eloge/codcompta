<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RawMessage extends Model
{
    public const STATUS_RECEIVED = 'received';

    public const STATUS_PARSED = 'parsed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_VALIDATED = 'validated';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'agency_id',
        'user_id',
        'body',
        'body_hash',
        'status',
        'parsed',
        'parsed_at',
        'error',
        'received_at',
    ];

    /**
     * Fingerprint used to spot a message pasted twice (BF-13).
     */
    public static function hashBody(string $body): string
    {
        $normalized = preg_replace('/\s+/u', ' ', mb_strtolower(trim($body)));

        return hash('sha256', (string) $normalized);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function proposals(): array
    {
        return $this->parsed['reports'] ?? [];
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'parsed' => 'array',
            'parsed_at' => 'datetime',
        ];
    }
}
