<?php

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Country;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->merchant = Merchant::create(['name' => 'Boutique Démo']);
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
});

it('construit le référentiel : pays, agence, produit et coût d\'achat', function () {
    $this->actingAs($this->user);

    $this->post('/referentiel/pays', ['name' => 'Pays démo', 'code' => 'pd'])->assertSessionHasNoErrors();
    $country = Country::firstOrFail();
    expect($country->code)->toBe('PD');

    $this->post('/referentiel/agences', ['country_id' => $country->id, 'name' => 'Agence 1', 'alert_after_days' => 2])->assertSessionHasNoErrors();
    $this->post('/referentiel/produits', ['name' => 'Produit 1', 'unit_cost' => 500, 'reference_price' => 13000, 'valid_from' => '2026-01-01'])->assertSessionHasNoErrors();

    $product1 = Product::firstOrFail();
    $this->post("/referentiel/produits/{$product1->id}/couts", ['unit_cost' => 650, 'valid_from' => '2026-11-01'])->assertSessionHasNoErrors();

    expect(Agency::count())->toBe(1)
        ->and($product1->costAt('2026-10-31'))->toBe(500)
        ->and($product1->costAt('2026-11-01'))->toBe(650);

    $this->get('/referentiel')->assertInertia(fn (Assert $page) => $page
        ->component('reference/index')
        ->has('countries.0.agencies', 1)
        ->where('products.0.name', 'Produit 1')
    );
});

it('refuse un pays en double et le coût d\'un produit d\'un autre commerçant', function () {
    $this->actingAs($this->user);
    $this->merchant->countries()->create(['name' => 'Pays démo', 'code' => 'PD']);

    $this->post('/referentiel/pays', ['name' => 'Pays démo', 'code' => 'PD'])->assertSessionHasErrors('code');

    $otherProduct = Merchant::create(['name' => 'Autre'])->products()->create(['name' => 'X']);
    $this->post("/referentiel/produits/{$otherProduct->id}/couts", ['unit_cost' => 1, 'valid_from' => '2026-01-01'])->assertNotFound();
});

it('enregistre une dépense pub pour un pays ou pour une agence', function () {
    $country = $this->merchant->countries()->create(['name' => 'Pays démo', 'code' => 'PD']);
    $agency1 = $country->agencies()->create(['name' => 'Agence 1']);

    $this->actingAs($this->user)->post('/pub', [
        'country_id' => $country->id,
        'period_start' => '2026-10-12',
        'period_end' => '2026-10-18',
        'amount' => 150000,
        'platform' => 'meta',
    ])->assertRedirect('/pub')->assertSessionHas('success');

    $this->actingAs($this->user)->post('/pub', [
        'country_id' => $country->id,
        'agency_id' => $agency1->id,
        'period_start' => '2026-10-19',
        'period_end' => '2026-10-19',
        'amount' => 6500,
        'platform' => 'tiktok',
    ])->assertSessionHasNoErrors();

    expect(AdSpend::count())->toBe(2)
        ->and(AdSpend::whereNull('agency_id')->value('amount'))->toBe(150000);

    $this->get('/pub')->assertInertia(fn (Assert $page) => $page->component('ad-spends/index')->has('adSpends', 2));
});

it('refuse une agence qui n\'est pas dans le pays choisi', function () {
    $country = $this->merchant->countries()->create(['name' => 'Pays démo', 'code' => 'PD']);
    $otherCountry = $this->merchant->countries()->create(['name' => 'Autre pays', 'code' => 'AP']);
    $otherAgency = $otherCountry->agencies()->create(['name' => 'Agence B']);

    $this->actingAs($this->user)->post('/pub', [
        'country_id' => $country->id,
        'agency_id' => $otherAgency->id,
        'period_start' => '2026-10-19',
        'period_end' => '2026-10-19',
        'amount' => 1000,
        'platform' => 'meta',
    ])->assertSessionHasErrors('agency_id');
});

it('crée un commerce à l\'inscription', function () {
    $this->post('/register', [
        'name' => 'Eloge',
        'email' => 'eloge@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    expect(User::where('email', 'eloge@example.com')->first()->merchant->name)->toBe('Eloge');
});
