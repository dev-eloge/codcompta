<?php

use App\Models\ExchangeRate;
use App\Models\Merchant;
use App\Models\Report;
use App\Models\User;
use App\Services\DisplayCurrency;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->merchant = Merchant::create(['name' => 'Boutique Démo']);
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->country = $this->merchant->countries()->create(['name' => 'Pays démo', 'code' => 'PD']);
    $this->agency = $this->country->agencies()->create(['name' => 'Agence 1']);
    $this->product = $this->merchant->products()->create(['name' => 'Produit 1', 'reference_price' => 10000]);
});

/** Four parts as in the design: 30 / 20 / 35 / 15. */
function ownRule(): array
{
    return [
        ['name' => 'Épargne', 'percent' => 30],
        ['name' => 'Mon salaire', 'percent' => 20],
        ['name' => 'Budget pub', 'percent' => 35],
        ['name' => 'Stock', 'percent' => 15],
    ];
}

it('montre la règle 40/20/40 tant que le marchand n\'a rien changé', function () {
    $this->actingAs($this->user)->get('/partage-et-devise')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profit')
            ->where('preset', '40-20-40')
            ->where('parts.0.name', 'Épargne')
            ->where('parts.2.percent', 40)
            ->where('displayCurrency', null));
});

it('enregistre la règle propre du marchand et l\'applique sur Mes rapports', function () {
    $this->actingAs($this->user)->put('/partage-et-devise', ['parts' => ownRule(), 'display_currency' => null])
        ->assertRedirect('/partage-et-devise')
        ->assertSessionHas('success');

    Report::create(['agency_id' => $this->agency->id, 'period_start' => '2026-11-03', 'period_end' => '2026-11-03', 'status' => Report::STATUS_COUNTED])
        ->lines()->create(['product_id' => $this->product->id, 'quantity' => 10, 'amount' => 100000, 'unit_cost_applied' => 0]);

    $this->actingAs($this->user)->get('/rapports?country='.$this->country->id.'&period=day&date=2026-11-03')
        ->assertInertia(fn (Assert $page) => $page
            ->where('report.total.profit', 100000)
            ->where('report.total.split.1.name', 'Mon salaire')
            ->where('report.total.split.2.amount', 35000)
            ->where('report.total.split.3.amount', 15000));
});

it('refuse un partage qui ne fait pas 100 %, un nom vide, ou plus de 5 parts', function () {
    $parts = ownRule();
    $parts[3]['percent'] = 10;

    $this->actingAs($this->user)->put('/partage-et-devise', ['parts' => $parts])
        ->assertSessionHasErrors(['parts' => 'Total : 95 %. Ajoutez 5 % à une part pour arriver à 100 %.']);

    $parts = ownRule();
    $parts[1]['name'] = '  ';
    $this->actingAs($this->user)->put('/partage-et-devise', ['parts' => $parts])->assertSessionHasErrors('parts.1.name');

    $six = array_fill(0, 6, ['name' => 'Part', 'percent' => 10]);
    $this->actingAs($this->user)->put('/partage-et-devise', ['parts' => $six])->assertSessionHasErrors('parts');

    expect($this->merchant->fresh()->profit_split)->toBeNull();
});

it('convertit les rapports en euros au taux fixe', function () {
    $this->actingAs($this->user)->put('/partage-et-devise', ['parts' => ownRule(), 'display_currency' => 'EUR']);

    $this->actingAs($this->user)->get('/rapports?country='.$this->country->id)
        ->assertInertia(fn (Assert $page) => $page
            ->where('currency.code', 'EUR')
            ->where('currency.rate', DisplayCurrency::EUR_RATE)
            ->where('currency.stale', false));
});

it('donne le dernier taux du dollar connu, et dit quand il n\'est pas celui du jour', function () {
    ExchangeRate::create(['currency' => 'USD', 'rate_date' => now()->subDays(2)->toDateString(), 'rate' => 563.42]);
    $this->merchant->update(['display_currency' => 'USD']);

    $this->actingAs($this->user)->get('/rapports?country='.$this->country->id)
        ->assertInertia(fn (Assert $page) => $page
            ->where('currency.code', 'USD')
            ->where('currency.rate', 563.42)
            ->where('currency.stale', true));
});

it('récupère le taux du dollar du jour en passant par l\'euro', function () {
    Http::fake(['api.frankfurter.app/*' => Http::response(['date' => '2026-11-14', 'rates' => ['USD' => 1.1645]])]);

    $this->artisan('codcompta:taux-dollar')->assertSuccessful();

    // 655,957 F for 1 € ÷ 1,1645 $ for 1 € = 563,29 F for 1 $.
    expect((float) ExchangeRate::where('currency', 'USD')->value('rate'))->toEqualWithDelta(563.2949, 0.001);
});

it('garde l\'ancien taux quand le taux du dollar est indisponible', function () {
    Http::fake(['api.frankfurter.app/*' => Http::response([], 500)]);

    $this->artisan('codcompta:taux-dollar')->assertFailed();

    expect(ExchangeRate::count())->toBe(0);
});
