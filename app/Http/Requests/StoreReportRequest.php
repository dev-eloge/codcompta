<?php

namespace App\Http\Requests;

use App\Models\AdSpend;
use App\Models\Country;
use App\Models\Product;
use App\Models\Report;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreReportRequest extends FormRequest
{
    /** The ad of this product is already noted by another agency and is the same one: nothing to type. */
    public const AD_SAME = 'same';

    /** The ad of this product is already noted by another agency, but this agency paid its own. */
    public const AD_SEPARATE = 'separate';

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->merchant_id !== null;
    }

    /**
     * "No ad today" wins over any ad typed before ticking it.
     */
    protected function prepareForValidation(): void
    {
        if ($this->boolean('no_ads')) {
            $this->merge(['ads' => []]);
        }
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
            'no_ads' => ['boolean'],
            'ads' => ['array'],
            'ads.*.product_id' => ['required', 'integer', 'distinct'],
            'ads.*.choice' => ['nullable', Rule::in([self::AD_SAME, self::AD_SEPARATE])],
            'ads.*.platform' => ['nullable', 'required_unless:ads.*.choice,'.self::AD_SAME, Rule::in(AdSpend::PLATFORMS)],
            'ads.*.amount' => ['nullable', 'integer', 'min:0'],
            'ads.*.facebook_amount' => ['nullable', 'integer', 'min:0'],
            'ads.*.tiktok_amount' => ['nullable', 'integer', 'min:0'],
            'ads.*.orders_received' => ['nullable', 'integer', 'min:0'],
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

                $this->checkAds($validator);
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
            'ads.*.platform.required_unless' => 'Choisissez où tourne la pub.',
            'ads.*.product_id.distinct' => 'Ce produit a déjà sa pub.',
            '*.integer' => 'Entrez un nombre entier.',
            '*.min' => 'Le montant ne peut pas être négatif.',
            '*.date' => 'Entrez une date valide.',
        ];
    }

    /**
     * Each ad is for a product of this report and has an amount, unless it is the ad already noted by another agency.
     */
    private function checkAds(Validator $validator): void
    {
        $deliveredProducts = collect($this->input('lines'))->pluck('product_id')->map(fn ($id) => (int) $id);

        foreach ($this->input('ads', []) as $index => $ad) {
            if (! $deliveredProducts->contains((int) $ad['product_id'])) {
                $validator->errors()->add("ads.$index.product_id", "Cette pub est pour un produit qui n'est pas dans ce rapport.");

                continue;
            }

            if (($ad['choice'] ?? null) === self::AD_SAME) {
                continue;
            }

            if ($ad['platform'] === AdSpend::PLATFORM_FACEBOOK_TIKTOK) {
                if ((int) ($ad['facebook_amount'] ?? 0) + (int) ($ad['tiktok_amount'] ?? 0) < 1) {
                    $validator->errors()->add("ads.$index.facebook_amount", 'Indiquez au moins un montant, sur Facebook ou sur TikTok.');
                }

                continue;
            }

            if ((int) ($ad['amount'] ?? 0) < 1) {
                $validator->errors()->add("ads.$index.amount", 'Indiquez le montant payé pour cette pub.');
            }
        }
    }

    private function overlapsACountedReport(): bool
    {
        return Report::query()
            ->where('agency_id', $this->input('agency_id'))
            ->counted()
            ->when($this->route('report'), fn ($query, $report) => $query->whereKeyNot($report->id))
            ->whereDate('period_start', '<=', $this->input('period_end'))
            ->whereDate('period_end', '>=', $this->input('period_start'))
            ->exists();
    }
}
