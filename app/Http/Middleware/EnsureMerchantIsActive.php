<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Signs out the people of a suspended merchant. A super admin consulting the account is let through.
 */
class EnsureMerchantIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $merchant = $request->user()?->merchant;

        if ($merchant?->isSuspended() && ! $request->session()->has('impersonator_id')) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return to_route('login')->withErrors([
                'email' => 'Ce compte est suspendu. Contactez l\'équipe CODCompta pour en savoir plus.',
            ]);
        }

        return $next($request);
    }
}
