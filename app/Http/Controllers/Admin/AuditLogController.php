<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every super admin action, newest first.
 */
class AuditLogController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('admin/journal', [
            'logs' => AdminAuditLog::query()
                ->with(['admin:id,name', 'merchant:id,name'])
                ->latest('created_at')
                ->latest('id')
                ->paginate(30)
                ->through(fn (AdminAuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'label' => $log->label(),
                    'admin' => $log->admin?->name,
                    'merchant' => $log->merchant ? ['id' => $log->merchant->id, 'name' => $log->merchant->name] : null,
                    'reason' => $log->details['reason'] ?? null,
                    'ip' => $log->ip,
                    'created_at' => $log->created_at?->toIso8601String(),
                ]),
        ]);
    }
}
