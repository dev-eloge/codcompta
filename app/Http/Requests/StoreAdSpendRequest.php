<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdSpendRequest extends FormRequest
{
    public const PLATFORMS = ['meta', 'tiktok', 'autre'];

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
            'amount' => ['required', 'integer', 'min:1'],
            'platform' => ['required', Rule::in(self::PLATFORMS)],
        ];
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
            '*.integer' => 'Entrez un nombre entier.',
            '*.date' => 'Entrez une date valide.',
            '*.required' => 'Ce champ est obligatoire.',
        ];
    }
}
