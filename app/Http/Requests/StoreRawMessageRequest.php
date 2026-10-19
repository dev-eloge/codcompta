<?php

namespace App\Http\Requests;

use App\Models\Country;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRawMessageRequest extends FormRequest
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
            'agency_id' => ['required', 'integer', Rule::exists('agencies', 'id')->whereIn('country_id', Country::where('merchant_id', $this->user()->merchant_id)->pluck('id')->all())],
            'body' => ['required', 'string', 'min:10', 'max:30000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'agency_id.required' => 'Choisissez l\'agence qui a envoyé le message.',
            'agency_id.exists' => 'Cette agence n\'existe pas dans votre compte.',
            'body.required' => 'Collez le message de l\'agence.',
            'body.min' => 'Ce message est trop court pour contenir un rapport.',
            'body.max' => 'Ce message est trop long : collez-le en plusieurs fois.',
        ];
    }
}
