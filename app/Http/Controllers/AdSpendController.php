<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdSpendRequest;
use App\Models\AdSpend;
use App\Models\Agency;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdSpendController extends Controller
{
    /**
     * Ad spends of the merchant, newest first, with the entry form (BF-10).
     */
    public function index(Request $request): Response
    {
        $merchant = $this->merchantOf($request);

        $countries = $merchant->countries()->with('agencies:id,country_id,name')->orderBy('name')->get();

        return Inertia::render('ad-spends/index', [
            'countries' => $countries->map(fn ($country) => [
                'id' => $country->id,
                'name' => $country->name,
                'agencies' => $country->agencies->map(fn (Agency $agency) => ['id' => $agency->id, 'name' => $agency->name])->values(),
            ]),
            'adSpends' => AdSpend::query()
                ->whereIn('country_id', $countries->pluck('id'))
                ->with(['country:id,name', 'agency:id,name'])
                ->latest('period_end')
                ->latest('id')
                ->limit(50)
                ->get()
                ->map(fn (AdSpend $adSpend) => [
                    'id' => $adSpend->id,
                    'country_id' => $adSpend->country_id,
                    'agency_id' => $adSpend->agency_id,
                    'country' => $adSpend->country->name,
                    'agency' => $adSpend->agency?->name,
                    'period_start' => $adSpend->period_start->toDateString(),
                    'period_end' => $adSpend->period_end->toDateString(),
                    'amount' => $adSpend->amount,
                    'platform' => $adSpend->platform,
                ]),
            'platforms' => StoreAdSpendRequest::PLATFORMS,
            'today' => now($merchant->timezone)->toDateString(),
        ]);
    }

    public function store(StoreAdSpendRequest $request): RedirectResponse
    {
        AdSpend::create($request->validated());

        return to_route('ad-spends.index')->with('success', 'Dépense pub enregistrée.');
    }

    public function update(StoreAdSpendRequest $request, AdSpend $adSpend): RedirectResponse
    {
        $this->ensureOwned($request, $adSpend->country->merchant_id);

        $adSpend->update($request->validated());

        return to_route('ad-spends.index')->with('success', 'Dépense pub modifiée.');
    }

    public function destroy(Request $request, AdSpend $adSpend): RedirectResponse
    {
        $this->ensureOwned($request, $adSpend->country->merchant_id);

        $adSpend->delete();

        return to_route('ad-spends.index')->with('success', 'Dépense pub supprimée.');
    }
}
