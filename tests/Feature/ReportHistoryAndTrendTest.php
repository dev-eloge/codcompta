<?php

use App\Models\Country;
use App\Models\Merchant;
use App\Models\Report;
use App\Models\User;
use App\Services\ReportPeriod;
use App\Services\ResultsTrend;
use Database\Seeders\DemoWeekSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->merchant = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
});

it('liste tous les rapports du plus récent au plus ancien, avec des filtres', function () {
    $count = Report::count();

    $this->actingAs($this->user)->get('/rapports/historique')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/history')
            ->where('total', $count)
            ->where('reports.total', $count)
            ->where('reports.data.0.period_end', substr((string) Report::max('period_end'), 0, 10))
        );

    $agency = Report::first()->agency;

    $this->actingAs($this->user)->get("/rapports/historique?agence={$agency->id}&du=2026-10-13&au=2026-10-14")
        ->assertInertia(fn (Assert $page) => $page
            ->where('reports.total', Report::where('agency_id', $agency->id)->whereDate('period_end', '>=', '2026-10-13')->whereDate('period_end', '<=', '2026-10-14')->count())
            ->where('filters.agence', (string) $agency->id)
        );
});

it('ne montre pas les rapports d\'un autre commerçant', function () {
    $other = User::factory()->create(['merchant_id' => Merchant::create(['name' => 'Autre'])->id]);

    $this->actingAs($other)->get('/rapports/historique')
        ->assertInertia(fn (Assert $page) => $page->where('total', 0)->where('reports.total', 0));
});

it('calcule la progression jour par jour et la compare à la période d\'avant', function () {
    $country = Country::where('code', 'PD')->firstOrFail();
    $trend = app(ResultsTrend::class)->forCountry($country, ReportPeriod::containing('week', '2026-10-14'));

    expect($trend['bucket'])->toBe('day')
        ->and($trend['points'])->toHaveCount(7)
        ->and($trend['totals']['revenue'])->toBe(650000)
        ->and($trend['totals']['profit'])->toBe(328000)
        ->and($trend['previous']['from'])->toBe('2026-10-05');

    $short = app(ResultsTrend::class)->forCountry($country, ReportPeriod::containing('day', '2026-10-14'));
    expect($short['extended'])->toBeTrue()->and($short['points'])->toHaveCount(14);

    $long = app(ResultsTrend::class)->forCountry($country, ReportPeriod::between('2026-01-01', '2026-10-31'));
    expect($long['bucket'])->toBe('month')->and($long['points'])->toHaveCount(10);
});

it('envoie les graphiques après la page (chargement différé)', function () {
    $this->actingAs($this->user)->get('/rapports?period=week&date=2026-10-14')
        ->assertInertia(fn (Assert $page) => $page->missing('trend')->loadDeferredProps(fn (Assert $reload) => $reload->where('trend.totals.revenue', 650000)));
});
