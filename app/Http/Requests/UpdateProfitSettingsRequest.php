<?php

namespace App\Http\Requests;

use App\Services\DisplayCurrency;
use App\Support\ProfitSplit;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfitSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->merchant_id !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'own_rates' => collect($this->input('own_rates', []))
                ->map(fn ($rate) => $rate === null || trim((string) $rate) === '' ? null : str_replace([' ', ','], ['', '.'], (string) $rate))
                ->only(DisplayCurrency::CURRENCIES)
                ->all(),
            'parts' => collect($this->input('parts', []))->map(fn ($part) => [
                'name' => trim((string) ($part['name'] ?? '')),
                'percent' => $part['percent'] ?? null,
            ])->values()->all(),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'parts' => ['required', 'array', 'min:'.ProfitSplit::MIN_PARTS, 'max:'.ProfitSplit::MAX_PARTS, function (string $attribute, mixed $value, Closure $fail) {
                $total = collect($value)->sum(fn ($part) => (int) ($part['percent'] ?? 0));

                if ($total !== 100) {
                    $gap = 100 - $total;
                    $fail($gap > 0
                        ? "Total : {$total} %. Ajoutez {$gap} % à une part pour arriver à 100 %."
                        : "Total : {$total} %. Retirez ".(-$gap).' % à une part pour revenir à 100 %.');
                }
            }],
            'parts.*.name' => ['required', 'string', 'max:'.ProfitSplit::NAME_MAX, 'distinct:ignore_case'],
            'parts.*.percent' => ['required', 'integer', 'min:1', 'max:100'],
            'display_currency' => ['nullable', Rule::in(DisplayCurrency::CURRENCIES)],
            'own_rates' => ['nullable', 'array'],
            'own_rates.EUR' => ['nullable', 'numeric', 'min:1', 'max:100000'],
            'own_rates.USD' => ['nullable', 'numeric', 'min:1', 'max:100000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'parts.min' => 'Il faut au moins 2 parts.',
            'parts.max' => 'Vous avez déjà 5 parts, le maximum.',
            'parts.*.name.required' => 'Donnez un nom à cette part, par exemple « Stock ».',
            'parts.*.name.max' => 'Le nom fait 30 caractères au plus.',
            'parts.*.name.distinct' => 'Deux parts ont le même nom.',
            'parts.*.percent.required' => 'Indiquez un pourcentage.',
            'parts.*.percent.integer' => 'Un nombre entier, sans virgule.',
            'parts.*.percent.min' => 'Au moins 1 %.',
            'parts.*.percent.max' => 'Au plus 100 %.',
            'own_rates.*.numeric' => 'Un nombre, par exemple 600 ou 655,96.',
            'own_rates.*.min' => 'Le taux doit être d\'au moins 1 F CFA.',
            'own_rates.*.max' => 'Ce taux paraît trop élevé. Vérifiez le chiffre.',
        ];
    }
}
