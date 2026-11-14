<?php

namespace App\Http\Requests;

use App\Models\AdSpend;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoreAdSpendRequest extends FormRequest
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
        return [
            'country_id' => ['required', 'integer', Rule::exists('countries', 'id')->where('merchant_id', $this->user()->merchant_id)],
            'agency_id' => ['nullable', 'integer', Rule::exists('agencies', 'id')->where('country_id', $this->integer('country_id'))],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('merchant_id', $this->user()->merchant_id)],
            'platform' => ['required', Rule::in(AdSpend::PLATFORMS)],
            'amount' => ['exclude_if:platform,'.AdSpend::PLATFORM_FACEBOOK_TIKTOK, 'required', 'integer', 'min:1'],
            'facebook_amount' => ['exclude_unless:platform,'.AdSpend::PLATFORM_FACEBOOK_TIKTOK, 'required', 'integer', 'min:0'],
            'tiktok_amount' => ['exclude_unless:platform,'.AdSpend::PLATFORM_FACEBOOK_TIKTOK, 'required', 'integer', 'min:0'],
            'orders_received' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * With Facebook and TikTok together, the amount is the sum of both; otherwise there is no split.
     *
     * @return array<string, mixed>
     */
    public function adSpend(): array
    {
        $data = $this->validated();

        if ($data['platform'] === AdSpend::PLATFORM_FACEBOOK_TIKTOK) {
            $data['amount'] = (int) $data['facebook_amount'] + (int) $data['tiktok_amount'];

            if ($data['amount'] < 1) {
                throw ValidationException::withMessages(['facebook_amount' => 'Indiquez au moins un montant, sur Facebook ou sur TikTok.']);
            }

            return $data;
        }

        return [...$data, 'facebook_amount' => null, 'tiktok_amount' => null];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'country_id.required' => 'Choisissez un pays.',
            'country_id.exists' => 'Ce pays n\'existe pas dans votre compte.',
            'agency_id.exists' => 'Cette agence n\'est pas dans ce pays.',
            'period_end.after_or_equal' => 'La date de fin doit être le même jour ou après la date de début.',
            'amount.required' => 'Indiquez le montant dépensé.',
            'amount.min' => 'Le montant doit être supérieur à 0.',
            'product_id.exists' => 'Ce produit n\'existe pas dans votre compte.',
            'platform.required' => 'Choisissez où tourne la pub.',
            '*.integer' => 'Entrez un nombre entier.',
            '*.date' => 'Entrez une date valide.',
            '*.required' => 'Ce champ est obligatoire.',
        ];
    }
}
