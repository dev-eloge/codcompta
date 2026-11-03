<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

/**
 * Trace of a super admin action on a merchant (suspension, account consultation).
 */
class AdminAuditLog extends Model
{
    public const UPDATED_AT = null;

    public const SUSPENDED = 'merchant.suspended';

    public const REACTIVATED = 'merchant.reactivated';

    public const IMPERSONATION_STARTED = 'impersonation.started';

    public const IMPERSONATION_STOPPED = 'impersonation.stopped';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'admin_id',
        'merchant_id',
        'action',
        'details',
        'ip',
    ];

    /**
     * @param  array<string, mixed>  $details
     */
    public static function record(Request $request, User $admin, string $action, ?Merchant $merchant = null, array $details = []): self
    {
        return self::create([
            'admin_id' => $admin->id,
            'merchant_id' => $merchant?->id,
            'action' => $action,
            'details' => $details ?: null,
            'ip' => $request->ip(),
        ]);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function label(): string
    {
        return match ($this->action) {
            self::SUSPENDED => 'Compte suspendu',
            self::REACTIVATED => 'Compte réactivé',
            self::IMPERSONATION_STARTED => 'Consultation du compte (début)',
            self::IMPERSONATION_STOPPED => 'Consultation du compte (fin)',
            default => $this->action,
        };
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'details' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
