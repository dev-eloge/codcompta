<?php

namespace App\Http\Requests;

use App\Models\Country;
use App\Models\Product;
use App\Models\Report;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->merchant_id !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $merchantId = $this->user()->merchant_id;

        return [
            'agency_id' => ['required', 'integer', Rule::exists('agencies', 'id')->whereIn('country_id', Country::where('merchant_id', $merchantId)->pluck('id')->all())],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'status' => ['required', Rule::in([Report::STATUS_COUNTED, Report::STATUS_DETAIL, Report::STATUS_TO_VERIFY])],
            'delivery_fees' => ['nullable', 'integer', 'min:0'],
            'closing_fees' => ['nullable', 'integer', 'min:0'],
            'other_fees' => ['nullable', 'integer', 'min:0'],
            'announced_total' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
            'raw_message_id' => ['nullable', 'integer', Rule::exists('raw_messages', 'id')->where('agency_id', $this->input('agency_id'))],
            'lines.*.label' => ['nullable', 'string', 'max:120'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'integer', 'distinct', Rule::exists('products', 'id')->where('merchant_id', $merchantId)],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
            'lines.*.amount' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * Business checks that need the database (RG-04, RG-07).
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if ($this->input('status') === Report::STATUS_COUNTED && $this->overlapsACountedReport()) {
                    $validator->errors()->add('period_start', 'Cette agence a déjà un rapport compté sur ces dates. Changez les dates ou enregistrez ce rapport comme « Détail ».');
                }

                foreach ($this->input('lines') as $index => $line) {
                    $product = Product::find($line['product_id']);

                    if ($product?->costAt($this->input('period_end')) === null) {
                        $validator->errors()->add("lines.$index.product_id", "Ajoutez d'abord le coût d'achat de « {$product?->name} » dans le référentiel.");
                    }
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'agency_id.required' => 'Choisissez une agence.',
            'agency_id.exists' => 'Cette agence n\'existe pas dans votre compte.',
            'period_start.required' => 'Indiquez la date de début.',
            'period_end.required' => 'Indiquez la date de fin.',
            'period_end.after_or_equal' => 'La date de fin doit être le même jour ou après la date de début.',
            'lines.required' => 'Ajoutez au moins un produit vendu.',
            'lines.min' => 'Ajoutez au moins un produit vendu.',
            'raw_message_id.exists' => 'Ce message ne vient pas de cette agence.',
            'lines.*.product_id.required' => 'Choisissez un produit.',
            'lines.*.product_id.exists' => 'Ce produit n\'existe pas dans votre compte.',
            'lines.*.product_id.distinct' => 'Ce produit est déjà sur une autre ligne.',
            'lines.*.quantity.min' => 'La quantité doit être d\'au moins 1.',
            'lines.*.amount.min' => 'Le montant ne peut pas être négatif.',
            '*.integer' => 'Entrez un nombre entier.',
            '*.min' => 'Le montant ne peut pas être négatif.',
            '*.date' => 'Entrez une date valide.',
        ];
    }

    private function overlapsACountedReport(): bool
    {
        return Report::query()
            ->where('agency_id', $this->input('agency_id'))
            ->counted()
            ->whereDate('period_start', '<=', $this->input('period_end'))
            ->whereDate('period_end', '>=', $this->input('period_start'))
            ->exists();
    }
}
