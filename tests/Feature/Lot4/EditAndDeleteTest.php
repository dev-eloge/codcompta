<?php

use App\Models\AdSpend;
use App\Models\Agency;
use App\Models\Country;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\RawMessage;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\DemoWeekSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->merchant = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
    $this->country = Country::where('code', 'PD')->firstOrFail();
    $this->agency1 = Agency::where('name', 'Agence 1')->firstOrFail();
    $this->stranger = User::factory()->create(['merchant_id' => Merchant::create(['name' => 'Autre boutique'])->id]);
});

it('modifie un pays et refuse un code déjà pris', function () {
    $other = $this->merchant->countries()->create(['name' => 'Autre pays', 'code' => 'AP']);

    $this->actingAs($this->user)->put("/referentiel/pays/{$this->country->id}", ['name' => 'Pays renommé', 'code' => 'pr'])->assertSessionHasNoErrors();
    expect($this->country->fresh())->name->toBe('Pays renommé')->code->toBe('PR');

    $this->actingAs($this->user)->put("/referentiel/pays/{$other->id}", ['name' => 'Autre pays', 'code' => 'PR'])->assertSessionHasErrors('code');
});

it('supprime un pays avec ses agences, rapports et pubs', function () {
    $this->actingAs($this->user)->delete("/referentiel/pays/{$this->country->id}")->assertSessionHas('success');

    expect(Country::count())->toBe(0)
        ->and(Agency::count())->toBe(0)
        ->and(Report::count())->toBe(0)
        ->and(AdSpend::count())->toBe(0)
        ->and(Product::count())->toBe(5);
});

it('modifie et supprime une agence', function () {
    $this->actingAs($this->user)->put("/referentiel/agences/{$this->agency1->id}", [
        'country_id' => $this->country->id,
        'name' => 'Agence Nord',
        'contact' => '+000 00 00 00',
        'alert_after_days' => 3,
    ])->assertSessionHasNoErrors();

    expect($this->agency1->fresh())->name->toBe('Agence Nord')->alert_after_days->toBe(3);

    $this->actingAs($this->user)->delete("/referentiel/agences/{$this->agency1->id}");

    expect(Agency::find($this->agency1->id))->toBeNull()
        ->and(Report::where('agency_id', $this->agency1->id)->count())->toBe(0);
});

it('modifie un produit mais refuse de supprimer un produit vendu', function () {
    $sold = Product::where('name', 'Produit 1')->firstOrFail();

    $this->actingAs($this->user)->put("/referentiel/produits/{$sold->id}", ['name' => 'Produit Un', 'reference_price' => 12000])->assertSessionHasNoErrors();
    expect($sold->fresh()->name)->toBe('Produit Un');

    $this->actingAs($this->user)->delete("/referentiel/produits/{$sold->id}")->assertSessionHas('warning');
    expect(Product::find($sold->id))->not->toBeNull();

    $unsold = $this->merchant->products()->create(['name' => 'Jamais vendu']);
    $this->actingAs($this->user)->delete("/referentiel/produits/{$unsold->id}")->assertSessionHas('success');
    expect(Product::find($unsold->id))->toBeNull();
});

it('supprime un coût d\'achat sauf le dernier qui reste', function () {
    $product = Product::where('name', 'Produit 1')->firstOrFail();
    $newCost = $product->costs()->create(['unit_cost' => 650, 'valid_from' => '2026-11-01']);

    $this->actingAs($this->user)->delete("/referentiel/produits/{$product->id}/couts/{$newCost->id}")->assertSessionHas('success');
    expect($product->costs()->count())->toBe(1);

    $lastCost = $product->costs()->sole();
    $this->actingAs($this->user)->delete("/referentiel/produits/{$product->id}/couts/{$lastCost->id}")->assertSessionHas('warning');
    expect($product->costs()->count())->toBe(1);
});

it('modifie un rapport, recalcule le bénéfice puis le supprime', function () {
    $report = Report::where('agency_id', $this->agency1->id)->whereDate('period_end', '2026-10-18')->sole();
    $product1 = Product::where('name', 'Produit 1')->firstOrFail();

    $this->actingAs($this->user)
        ->get("/rapports/{$report->id}/modifier")
        ->assertInertia(fn (Assert $page) => $page->component('reports/create')->where('report.id', $report->id)->where('report.lines.0.amount', 25000));

    $this->actingAs($this->user)->put("/rapports/{$report->id}", [
        'agency_id' => $this->agency1->id,
        'period_start' => '2026-10-18',
        'period_end' => '2026-10-18',
        'status' => 'counted',
        'delivery_fees' => 6000,
        'announced_total' => 35000,
        'lines' => [['product_id' => $product1->id, 'quantity' => 3, 'amount' => 35000]],
    ])->assertSessionHasNoErrors()->assertSessionHas('success');

    // 10 000 F more sales and one more unit at 500 F.
    $this->actingAs($this->user)
        ->get('/rapports?period=week&date=2026-10-14')
        ->assertInertia(fn (Assert $page) => $page->where('report.total.profit', 328000 + 10000 - 500));

    $this->actingAs($this->user)->delete("/rapports/{$report->id}")->assertSessionHas('success');

    expect(Report::find($report->id))->toBeNull()
        ->and($this->agency1->fresh()->last_report_at->toDateString())->toBe('2026-10-17');
});

it('ne bloque pas la modification d\'un rapport par lui-même (RG-07)', function () {
    $report = Report::where('agency_id', $this->agency1->id)->whereDate('period_end', '2026-10-16')->sole();

    $this->actingAs($this->user)->put("/rapports/{$report->id}", [
        'agency_id' => $this->agency1->id,
        'period_start' => '2026-10-16',
        'period_end' => '2026-10-17',
        'status' => 'counted',
        'lines' => [['product_id' => Product::where('name', 'Produit 1')->value('id'), 'quantity' => 4, 'amount' => 50000]],
    ])->assertSessionHasErrors('period_start');

    $this->actingAs($this->user)->put("/rapports/{$report->id}", [
        'agency_id' => $this->agency1->id,
        'period_start' => '2026-10-16',
        'period_end' => '2026-10-16',
        'status' => 'counted',
        'lines' => [['product_id' => Product::where('name', 'Produit 1')->value('id'), 'quantity' => 4, 'amount' => 50000]],
    ])->assertSessionHasNoErrors();
});

it('modifie et supprime une dépense pub', function () {
    $adSpend = AdSpend::sole();

    $this->actingAs($this->user)->put("/pub/{$adSpend->id}", [
        'country_id' => $this->country->id,
        'period_start' => '2026-10-12',
        'period_end' => '2026-10-18',
        'amount' => 160000,
        'platform' => 'tiktok',
    ])->assertSessionHasNoErrors();

    expect($adSpend->fresh())->amount->toBe(160000)->platform->toBe('tiktok');

    $this->actingAs($this->user)->delete("/pub/{$adSpend->id}");
    expect(AdSpend::count())->toBe(0);
});

it('supprime un message collé sans toucher aux rapports', function () {
    $message = $this->agency1->rawMessages()->create(['body' => 'RAPPORT', 'status' => 'parsed']);
    Report::where('agency_id', $this->agency1->id)->first()->update(['raw_message_id' => $message->id]);

    $this->actingAs($this->user)->delete("/messages/{$message->id}")->assertRedirect('/messages/coller');

    expect(RawMessage::count())->toBe(0)->and(Report::count())->toBe(8);
});

it('interdit de modifier ou supprimer les données d\'un autre commerçant', function () {
    $report = Report::first();
    $product = Product::first();

    $this->actingAs($this->stranger)->put("/referentiel/pays/{$this->country->id}", ['name' => 'X', 'code' => 'XX'])->assertNotFound();
    $this->actingAs($this->stranger)->delete("/referentiel/pays/{$this->country->id}")->assertNotFound();
    $this->actingAs($this->stranger)->delete("/referentiel/agences/{$this->agency1->id}")->assertNotFound();
    $this->actingAs($this->stranger)->delete("/referentiel/produits/{$product->id}")->assertNotFound();
    $this->actingAs($this->stranger)->get("/rapports/{$report->id}/modifier")->assertNotFound();
    $this->actingAs($this->stranger)->delete("/rapports/{$report->id}")->assertNotFound();
    $this->actingAs($this->stranger)->delete('/pub/'.AdSpend::first()->id)->assertNotFound();

    expect(Country::count())->toBe(1)->and(Report::count())->toBe(8);
});

it('ne redemande pas le coût d\'achat pour un rapport daté avant l\'ajout du produit', function () {
    $product = $this->merchant->products()->create(['name' => 'Produit récent']);
    $product->costs()->create(['unit_cost' => 700, 'valid_from' => '2026-10-19']);

    $this->actingAs($this->user)->post('/rapports', [
        'agency_id' => $this->agency1->id,
        'period_start' => '2026-10-05',
        'period_end' => '2026-10-05',
        'status' => 'counted',
        'lines' => [['product_id' => $product->id, 'quantity' => 2, 'amount' => 20000]],
    ])->assertSessionHasNoErrors();

    expect(Report::whereDate('period_end', '2026-10-05')->sole()->lines->first()->unit_cost_applied)->toBe(700)
        ->and($product->costAt('2026-10-05'))->toBe(700);
});
