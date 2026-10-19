<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use App\Models\Country;
use App\Models\Product;
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
                ->with('agencies')
                ->orderBy('name')
                ->get()
                ->map(fn (Country $country) => [
                    'id' => $country->id,
                    'name' => $country->name,
                    'code' => $country->code,
                    'agencies' => $country->agencies->map(fn (Agency $agency) => [
                        'id' => $agency->id,
                        'name' => $agency->name,
                        'contact' => $agency->contact,
                        'alert_after_days' => $agency->alert_after_days,
                        'last_report_at' => $agency->last_report_at?->toDateString(),
                        'is_late' => $agency->isLate(),
                    ])->values(),
                ]),
            'products' => $merchant->products()
                ->orderBy('name')
                ->get()
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'reference_price' => $product->reference_price,
                    'unit_cost' => $product->costAt($today),
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
}
