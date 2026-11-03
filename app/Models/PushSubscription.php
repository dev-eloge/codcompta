<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One browser (phone or computer) where a user accepted Sika's notifications.
 */
class PushSubscription extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'endpoint',
        'endpoint_hash',
        'public_key',
        'auth_token',
        'device',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function hashOf(string $endpoint): string
    {
        return hash('sha256', $endpoint);
    }
}
