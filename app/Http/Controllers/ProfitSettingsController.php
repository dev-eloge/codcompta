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
        $currency->ensureDollar();
        $split = $merchant->profitSplit();

        return Inertia::render('settings/profit', [
            'parts' => $split->parts,
            'preset' => $split->preset(),
            'presets' => ProfitSplit::PRESETS,
            'displayCurrency' => $merchant->display_currency,
            'automatic' => [
                'EUR' => $currency->automatic(DisplayCurrency::EUR),
                'USD' => $currency->automatic(DisplayCurrency::USD, $merchant->timezone ?? 'UTC'),
            ],
            'ownRates' => [
                'EUR' => $currency->ownRate($merchant, DisplayCurrency::EUR),
                'USD' => $currency->ownRate($merchant, DisplayCurrency::USD),
            ],
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
            'custom_rates' => collect($data['own_rates'] ?? [])
                ->filter(fn ($rate) => $rate !== null)
                ->map(fn ($rate) => round((float) $rate, 4))
                ->all() ?: null,
        ]);

        return to_route('profit-settings.edit')->with('success', 'Réglages enregistrés. Ils s\'affichent déjà sur Mes rapports.');
    }
}
