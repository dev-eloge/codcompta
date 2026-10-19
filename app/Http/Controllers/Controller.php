<?php

namespace App\Http\Controllers;

use App\Models\Merchant;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * The merchant account of the signed-in user. Every query is scoped to it.
     */
    protected function merchantOf(Request $request): Merchant
    {
        $merchant = $request->user()?->merchant;

        abort_if($merchant === null, 403, 'Votre compte n\'est rattaché à aucun commerce.');

        return $merchant;
    }

    /**
     * Stop with a 404 when a record does not belong to the merchant of the signed-in user.
     */
    protected function ensureOwned(Request $request, ?int $merchantId): void
    {
        abort_unless($merchantId !== null && $merchantId === $this->merchantOf($request)->id, 404);
    }
}
