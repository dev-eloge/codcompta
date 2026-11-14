<?php

namespace Database\Factories;

use App\Models\Closer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Closer>
 */
class CloserFactory extends Factory
{
    /**
     * Define the model's default state. The country is always given: `->create(['country_id' => ...])`.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Closeuse '.fake()->numberBetween(1, 9),
            'pay_mode' => Closer::PAY_PER_DELIVERED_ORDER,
            'pay_amount' => 500,
        ];
    }

    public function monthly(int $salary = 40000): static
    {
        return $this->state(['pay_mode' => Closer::PAY_MONTHLY, 'pay_amount' => $salary]);
    }
}
