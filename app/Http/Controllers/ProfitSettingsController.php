<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProfitSettingsRequest;
use App\Services\DisplayCurrency;
use App\Support\ProfitSplit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfitSettingsController extends Controller
{
    /**
     * How the merchant cuts the net profit, and the second currency of the reports.
     */
    public function edit(Request $request, DisplayCurrency $currency): Response
    {
        $merchant = $this->merchantOf($request);
        $split = $merchant->profitSplit();

        return Inertia::render('settings/profit', [
            'parts' => $split->parts,
            'preset' => $split->preset(),
            'presets' => ProfitSplit::PRESETS,
            'displayCurrency' => $merchant->display_currency,
            'dollar' => $currency->dollar($merchant->timezone),
            'euroRate' => DisplayCurrency::EUR_RATE,
        ]);
    }

    public function update(UpdateProfitSettingsRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $this->merchantOf($request)->update([
            'profit_split' => collect($data['parts'])->map(fn (array $part) => [
                'name' => $part['name'],
                'percent' => (int) $part['percent'],
            ])->values()->all(),
            'display_currency' => $data['display_currency'] ?? null,
        ]);

        return to_route('profit-settings.edit')->with('success', 'Nouveau partage enregistré. Il s\'affiche déjà sur Mes rapports.');
    }
}
