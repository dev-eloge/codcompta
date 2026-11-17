<?php

namespace App\Http\Controllers;

use App\Services\DisplayCurrency;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DisplayCurrencyController extends Controller
{
    /**
     * The "F CFA / € / $" switch of Mes rapports: the choice is saved and the page shows it at once.
     */
    public function update(Request $request, DisplayCurrency $currency): RedirectResponse
    {
        $data = $request->validate([
            'display_currency' => ['nullable', Rule::in(DisplayCurrency::CURRENCIES)],
        ]);
        $merchant = $this->merchantOf($request);
        $code = $data['display_currency'] ?? null;

        if ($code === DisplayCurrency::USD && $currency->ownRate($merchant, $code) === null) {
            $currency->ensureDollar();

            if ($currency->automatic(DisplayCurrency::USD) === null) {
                return back()->with('warning', 'Le taux du dollar est indisponible pour le moment. Réessayez plus tard, ou fixez votre propre taux dans Partage et devise.');
            }
        }

        $merchant->update(['display_currency' => $code]);

        return back();
    }
}
