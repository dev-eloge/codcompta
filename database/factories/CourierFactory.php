<?php

namespace Database\Factories;

use App\Models\Courier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Courier>
 */
class CourierFactory extends Factory
{
    /**
     * Define the model's default state. The country is always given: `->create(['country_id' => ...])`.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Livreur '.fake()->numberBetween(1, 9),
            'pay_mode' => Courier::PAY_PER_DELIVERY,
            'pay_amount' => 1000,
        ];
    }

    public function monthly(int $salary = 60000): static
    {
        return $this->state(['pay_mode' => Courier::PAY_MONTHLY, 'pay_amount' => $salary]);
    }
}
