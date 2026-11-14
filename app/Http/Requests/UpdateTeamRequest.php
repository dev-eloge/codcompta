<?php

namespace App\Http\Requests;

use App\Models\Closer;
use App\Models\Country;
use App\Models\Courier;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeamRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->merchant_id !== null && $this->route('country')->merchant_id === $this->user()->merchant_id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'delivery_mode' => ['required', Rule::in(Country::DELIVERY_MODES)],
            'couriers' => ['array'],
            'couriers.*.id' => ['nullable', 'integer'],
            'couriers.*.name' => ['required', 'string', 'max:80'],
            'couriers.*.pay_mode' => ['required', Rule::in(Courier::PAY_MODES)],
            'couriers.*.pay_amount' => ['required', 'integer', 'min:0'],
            'closers' => ['array'],
            'closers.*.id' => ['nullable', 'integer'],
            'closers.*.name' => ['required', 'string', 'max:80'],
            'closers.*.pay_mode' => ['required', Rule::in(Closer::PAY_MODES)],
            'closers.*.pay_amount' => ['required', 'integer', 'min:0'],
            'bike_rent' => ['nullable', 'integer', 'min:0'],
            'phone_credit' => ['nullable', 'integer', 'min:0'],
            'storage_rent' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'delivery_mode.required' => 'Choisissez qui livre vos commandes.',
            '*.*.name.required' => 'Indiquez le nom.',
            '*.*.pay_amount.required' => 'Indiquez le montant.',
            '*.integer' => 'Entrez un nombre entier.',
            '*.*.pay_amount.integer' => 'Entrez un nombre entier.',
            '*.min' => 'Le montant ne peut pas être négatif.',
            '*.*.pay_amount.min' => 'Le montant ne peut pas être négatif.',
        ];
    }
}
