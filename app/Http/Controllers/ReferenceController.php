<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use App\Models\Country;
use App\Models\Product;
use App\Models\ProductCost;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Countries, agencies, products and purchase costs of the merchant (BF-03 to BF-05).
 */
class ReferenceController extends Controller
{
    public function index(Request $request): Response
    {
        $merchant = $this->merchantOf($request);
        $today = now($merchant->timezone)->toDateString();

        return Inertia::render('reference/index', [
            'countries' => $merchant->countries()
                ->with(['agencies' => fn ($query) => $query->withCount('reports')->orderBy('name')])
                ->withCount('adSpends')
                ->orderBy('name')
                ->get()
                ->map(fn (Country $country) => [
                    'id' => $country->id,
                    'name' => $country->name,
                    'code' => $country->code,
                    'ad_spends_count' => $country->ad_spends_count,
                    'reports_count' => $country->agencies->sum('reports_count'),
                    'agencies' => $country->agencies->map(fn (Agency $agency) => [
                        'id' => $agency->id,
                        'name' => $agency->name,
                        'reports_count' => $agency->reports_count,
                        'contact' => $agency->contact,
                        'alert_after_days' => $agency->alert_after_days,
                        'last_report_at' => $agency->last_report_at?->toDateString(),
                        'is_late' => $agency->isLate(),
                    ])->values(),
                ]),
            'products' => $merchant->products()
                ->with(['costs' => fn ($query) => $query->orderByDesc('valid_from')])
                ->withCount('reportLines')
                ->orderBy('name')
                ->get()
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'reference_price' => $product->reference_price,
                    'unit_cost' => $product->costAt($today),
                    'used_in_reports' => $product->report_lines_count,
                    'costs' => $product->costs->map(fn (ProductCost $cost) => [
                        'id' => $cost->id,
                        'unit_cost' => $cost->unit_cost,
                        'valid_from' => $cost->valid_from->toDateString(),
                    ])->values(),
                ]),
            'today' => $today,
        ]);
    }

    public function storeCountry(Request $request): RedirectResponse
    {
        $merchant = $this->merchantOf($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'size:2', Rule::unique('countries')->where('merchant_id', $merchant->id)],
        ], [
            'name.required' => 'Indiquez le nom du pays.',
            'code.required' => 'Indiquez le code du pays (2 lettres).',
            'code.size' => 'Le code du pays fait 2 lettres, par exemple NE.',
            'code.unique' => 'Ce pays existe déjà.',
        ]);

        $merchant->countries()->create([...$data, 'code' => strtoupper($data['code'])]);

        return back()->with('success', 'Pays ajouté.');
    }

    public function storeAgency(Request $request): RedirectResponse
    {
        $merchant = $this->merchantOf($request);

        $data = $request->validate([
            'country_id' => ['required', 'integer', Rule::exists('countries', 'id')->where('merchant_id', $merchant->id)],
            'name' => ['required', 'string', 'max:100'],
            'contact' => ['nullable', 'string', 'max:100'],
            'alert_after_days' => ['required', 'integer', 'min:1', 'max:30'],
        ], [
            'country_id.required' => 'Choisissez un pays.',
            'name.required' => 'Indiquez le nom de l\'agence.',
            'alert_after_days.min' => 'Le délai d\'alerte va de 1 à 30 jours.',
            'alert_after_days.max' => 'Le délai d\'alerte va de 1 à 30 jours.',
        ]);

        Agency::create($data);

        return back()->with('success', 'Agence ajoutée.');
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $merchant = $this->merchantOf($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'reference_price' => ['nullable', 'integer', 'min:0'],
            'unit_cost' => ['required', 'integer', 'min:0'],
            'valid_from' => ['required', 'date'],
        ], [
            'name.required' => 'Indiquez le nom du produit.',
            'unit_cost.required' => 'Indiquez le coût d\'achat d\'une unité.',
            '*.integer' => 'Entrez un nombre entier.',
        ]);

        $product = $merchant->products()->create([
            'name' => $data['name'],
            'reference_price' => $data['reference_price'] ?? null,
        ]);

        $product->costs()->create(['unit_cost' => $data['unit_cost'], 'valid_from' => $data['valid_from']]);

        return back()->with('success', 'Produit ajouté.');
    }

    /**
     * A new purchase cost from a date; older reports keep the cost they were saved with (RG-04).
     */
    public function storeProductCost(Request $request, Product $product): RedirectResponse
    {
        abort_unless($product->merchant_id === $this->merchantOf($request)->id, 404);

        $data = $request->validate([
            'unit_cost' => ['required', 'integer', 'min:0'],
            'valid_from' => ['required', 'date'],
        ], [
            'unit_cost.required' => 'Indiquez le nouveau coût d\'achat.',
            '*.integer' => 'Entrez un nombre entier.',
        ]);

        $product->costs()->create($data);

        return back()->with('success', 'Nouveau coût d\'achat enregistré.');
    }

    public function updateCountry(Request $request, Country $country): RedirectResponse
    {
        $this->ensureOwned($request, $country->merchant_id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'size:2', Rule::unique('countries')->where('merchant_id', $country->merchant_id)->ignore($country->id)],
        ], [
            'name.required' => 'Indiquez le nom du pays.',
            'code.required' => 'Indiquez le code du pays (2 lettres).',
            'code.size' => 'Le code du pays fait 2 lettres.',
            'code.unique' => 'Un autre pays a déjà ce code.',
        ]);

        $country->update([...$data, 'code' => strtoupper($data['code'])]);

        return back()->with('success', 'Pays modifié.');
    }

    /**
     * Removes the country with its agencies, their reports and its ad spends (the screen asks first).
     */
    public function destroyCountry(Request $request, Country $country): RedirectResponse
    {
        $this->ensureOwned($request, $country->merchant_id);

        $country->delete();

        return back()->with('success', "Pays « {$country->name} » supprimé, avec ses agences et leurs rapports.");
    }

    public function updateAgency(Request $request, Agency $agency): RedirectResponse
    {
        $merchant = $this->merchantOf($request);
        $this->ensureOwned($request, $agency->country->merchant_id);

        $data = $request->validate([
            'country_id' => ['required', 'integer', Rule::exists('countries', 'id')->where('merchant_id', $merchant->id)],
            'name' => ['required', 'string', 'max:100'],
            'contact' => ['nullable', 'string', 'max:100'],
            'alert_after_days' => ['required', 'integer', 'min:1', 'max:30'],
        ], [
            'name.required' => 'Indiquez le nom de l\'agence.',
            'alert_after_days.min' => 'Le délai d\'alerte va de 1 à 30 jours.',
            'alert_after_days.max' => 'Le délai d\'alerte va de 1 à 30 jours.',
        ]);

        $agency->update($data);

        return back()->with('success', 'Agence modifiée.');
    }

    /**
     * Removes the agency with its reports and pasted messages (the screen asks first).
     */
    public function destroyAgency(Request $request, Agency $agency): RedirectResponse
    {
        $this->ensureOwned($request, $agency->country->merchant_id);

        $agency->delete();

        return back()->with('success', "Agence « {$agency->name} » supprimée, avec ses rapports.");
    }

    public function updateProduct(Request $request, Product $product): RedirectResponse
    {
        $this->ensureOwned($request, $product->merchant_id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'reference_price' => ['nullable', 'integer', 'min:0'],
        ], [
            'name.required' => 'Indiquez le nom du produit.',
            '*.integer' => 'Entrez un nombre entier.',
        ]);

        $product->update($data);

        return back()->with('success', 'Produit modifié.');
    }

    /**
     * A product already sold in a report cannot go: the report would lose its lines.
     */
    public function destroyProduct(Request $request, Product $product): RedirectResponse
    {
        $this->ensureOwned($request, $product->merchant_id);

        if ($product->reportLines()->exists()) {
            return back()->with('warning', "« {$product->name} » apparaît dans des rapports : supprimez ou corrigez d'abord ces rapports.");
        }

        $product->delete();

        return back()->with('success', "Produit « {$product->name} » supprimé.");
    }

    /**
     * Removes one purchase cost from the history; reports keep the cost they were saved with.
     */
    public function destroyProductCost(Request $request, Product $product, ProductCost $cost): RedirectResponse
    {
        $this->ensureOwned($request, $product->merchant_id);
        abort_unless($cost->product_id === $product->id, 404);

        if ($product->costs()->count() === 1) {
            return back()->with('warning', 'Un produit garde au moins un coût d\'achat. Ajoutez le bon coût avant de supprimer celui-ci.');
        }

        $cost->delete();

        return back()->with('success', 'Coût d\'achat supprimé.');
    }
}
