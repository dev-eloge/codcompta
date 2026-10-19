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
}
