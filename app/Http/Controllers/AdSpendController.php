<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdSpendRequest;
use App\Jobs\CheckGoals;
use App\Models\AdSpend;
use App\Models\Agency;
use App\Services\PlatformComparison;
use App\Services\ReportPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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

        $filters = $request->validate([
            'produit' => ['nullable', 'integer'],
            'sans_plateforme' => ['nullable', 'boolean'],
        ]);
        $missingPlatformOnly = (bool) ($filters['sans_plateforme'] ?? false);

        return Inertia::render('ad-spends/index', [
            'filters' => ['produit' => $filters['produit'] ?? null, 'sans_plateforme' => $missingPlatformOnly],
            'countries' => $countries->map(fn ($country) => [
                'id' => $country->id,
                'name' => $country->name,
                'agencies' => $country->agencies->map(fn (Agency $agency) => ['id' => $agency->id, 'name' => $agency->name])->values(),
            ]),
            'adSpends' => AdSpend::query()
                ->whereIn('country_id', $countries->pluck('id'))
                ->with(['country:id,name', 'agency:id,name', 'product:id,name'])
                ->when($missingPlatformOnly, fn ($query) => $query->whereNull('platform'))
                ->when($filters['produit'] ?? null, fn ($query, $productId) => $query->where('product_id', $productId))
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
                    'product_id' => $adSpend->product_id,
                    'product' => $adSpend->product?->name,
                    'amount' => $adSpend->amount,
                    'facebook_amount' => $adSpend->facebook_amount,
                    'tiktok_amount' => $adSpend->tiktok_amount,
                    'platform' => $adSpend->platform,
                    'orders_received' => $adSpend->orders_received,
                ]),
            'products' => $merchant->products()->orderBy('name')->get(['id', 'name']),
            'platforms' => AdSpend::PLATFORMS,
            'today' => now($merchant->timezone)->toDateString(),
        ]);
    }

    /**
     * For each product, what the ad leaves per day depending on where it ran.
     */
    public function platforms(Request $request, PlatformComparison $comparison): Response
    {
        $merchant = $this->merchantOf($request);
        $countries = $merchant->countries()->orderBy('name')->get(['id', 'merchant_id', 'name']);

        $filters = $request->validate([
            'pays' => ['nullable', 'integer'],
            'period' => ['nullable', Rule::in([ReportPeriod::WEEK, ReportPeriod::MONTH, ReportPeriod::CUSTOM])],
            'date' => ['nullable', 'date'],
            'du' => ['nullable', 'required_if:period,'.ReportPeriod::CUSTOM, 'date'],
            'au' => ['nullable', 'required_if:period,'.ReportPeriod::CUSTOM, 'date', 'after_or_equal:du'],
        ], [
            'du.required_if' => 'Choisissez la date de début.',
            'au.required_if' => 'Choisissez la date de fin.',
            'au.after_or_equal' => 'La date de fin doit être après la date de début.',
        ]);

        $country = isset($filters['pays']) ? $merchant->countries()->findOrFail($filters['pays']) : $countries->first();

        $period = ($filters['period'] ?? null) === ReportPeriod::CUSTOM
            ? ReportPeriod::between($filters['du'], $filters['au'])
            : ReportPeriod::containing($filters['period'] ?? ReportPeriod::MONTH, $filters['date'] ?? now($merchant->timezone)->toDateString());

        return Inertia::render('ad-spends/platforms', [
            'countries' => $countries->map->only(['id', 'name'])->values(),
            'countryId' => $country?->id,
            'period' => $period->toArray(),
            'products' => $country === null ? [] : $comparison->forCountry($country, $period->from->toDateString(), $period->to->toDateString()),
        ]);
    }

    public function store(StoreAdSpendRequest $request): RedirectResponse
    {
        AdSpend::create($request->adSpend());
        CheckGoals::dispatch($this->merchantOf($request)->id);

        return to_route('ad-spends.index')->with('success', 'Dépense pub enregistrée.');
    }

    public function update(StoreAdSpendRequest $request, AdSpend $adSpend): RedirectResponse
    {
        $this->ensureOwned($request, $adSpend->country->merchant_id);

        $adSpend->update($request->adSpend());
        CheckGoals::dispatch($adSpend->country->merchant_id);

        return to_route('ad-spends.index')->with('success', 'Dépense pub modifiée.');
    }

    public function destroy(Request $request, AdSpend $adSpend): RedirectResponse
    {
        $this->ensureOwned($request, $adSpend->country->merchant_id);

        $adSpend->delete();
        CheckGoals::dispatch($adSpend->country->merchant_id);

        return to_route('ad-spends.index')->with('success', 'Dépense pub supprimée.');
    }
}
