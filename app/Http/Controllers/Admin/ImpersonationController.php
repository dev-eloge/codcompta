<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Merchant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Support: the super admin opens a merchant's account as its owner sees it, then comes back.
 * Every consultation is written to the audit log.
 */
class ImpersonationController extends Controller
{
    public function start(Request $request, Merchant $merchant): RedirectResponse
    {
        $admin = $request->user();
        $owner = $merchant->users()->orderByRaw("role = 'owner' desc")->orderBy('id')->first();

        if ($owner === null || $owner->is($admin)) {
            return back()->with('warning', 'Ce compte n\'a pas d\'utilisateur à consulter.');
        }

        AdminAuditLog::record($request, $admin, AdminAuditLog::IMPERSONATION_STARTED, $merchant, ['user_id' => $owner->id]);

        Auth::guard('web')->login($owner);
        $request->session()->put('impersonator_id', $admin->id);
        $request->session()->put('impersonated_merchant', $merchant->name);

        return to_route('reports.index');
    }

    public function stop(Request $request): RedirectResponse
    {
        $adminId = $request->session()->pull('impersonator_id');
        $request->session()->forget('impersonated_merchant');
        $admin = $adminId ? User::where('is_super_admin', true)->find($adminId) : null;

        if ($admin === null) {
            return to_route('reports.index');
        }

        $merchant = $request->user()?->merchant;
        AdminAuditLog::record($request, $admin, AdminAuditLog::IMPERSONATION_STOPPED, $merchant);

        Auth::guard('web')->login($admin);

        return $merchant
            ? to_route('admin.merchants.show', $merchant)->with('success', 'Consultation terminée.')
            : to_route('admin.dashboard');
    }
}
