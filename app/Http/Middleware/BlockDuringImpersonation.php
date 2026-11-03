<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * While a super admin consults a merchant's account, the account's own settings stay untouched.
 */
class BlockDuringImpersonation
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->has('impersonator_id')) {
            return back()->with('warning', 'Pendant une consultation, les paramètres du compte (profil, mot de passe, suppression) ne sont pas accessibles.');
        }

        return $next($request);
    }
}
