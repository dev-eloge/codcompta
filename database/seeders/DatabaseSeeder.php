<?php

namespace Database\Seeders;

use App\Models\Merchant;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Demo data must never land next to real merchants.
        if (app()->isProduction()) {
            $this->command?->warn('Données de démonstration ignorées : application en production.');

            return;
        }

        $this->call(DemoWeekSeeder::class);

        User::factory()->create([
            'merchant_id' => Merchant::where('name', 'Boutique Démo')->value('id'),
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
