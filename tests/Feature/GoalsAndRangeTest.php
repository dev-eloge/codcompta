<?php

use App\Models\FinancialGoal;
use App\Models\Merchant;
use App\Models\User;
use App\Services\GoalTracker;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoWeekSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->merchant = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);
});

it('affiche les résultats entre deux dates choisies', function () {
    $this->actingAs($this->user)
        ->get('/rapports?period=custom&du=2026-10-12&au=2026-10-25')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('period.type', 'custom')
            ->where('period.from', '2026-10-12')
            ->where('period.to', '2026-10-25')
            ->where('period.days', 14)
            ->where('period.label', 'du 12 au 25 octobre 2026')
            ->where('period.previous', '2026-09-28')
            ->where('period.previous_to', '2026-10-11')
            ->where('report.total.revenue', 650000)
        );
});

it('refuse une date de fin avant la date de début', function () {
    $this->actingAs($this->user)
        ->get('/rapports?period=custom&du=2026-10-20&au=2026-10-12')
        ->assertSessionHasErrors('au');
});

it('crée un objectif entre deux dates choisies, le modifie puis le supprime', function () {
    $this->actingAs($this->user)->get('/objectifs')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('goals/index')->has('allGoals', 0));

    $this->actingAs($this->user)->post('/objectifs', [
        'title' => 'Objectif d\'octobre',
        'metric' => 'revenue',
        'amount' => 600000,
        'starts_on' => '2026-10-05',
        'ends_on' => '2026-10-31',
    ])->assertRedirect('/objectifs')->assertSessionHas('success');

    $goal = $this->merchant->financialGoals()->sole();
    expect($goal->starts_on->toDateString())->toBe('2026-10-05')
        ->and($goal->ends_on->toDateString())->toBe('2026-10-31');

    $this->actingAs($this->user)->put("/objectifs/{$goal->id}", [
        'title' => '',
        'metric' => 'profit',
        'amount' => 300000,
        'starts_on' => '2026-10-12',
        'ends_on' => '2026-10-18',
    ])->assertRedirect('/objectifs');

    expect($goal->fresh()->amount)->toBe(300000)->and($goal->fresh()->title)->toBeNull();

    $this->actingAs($this->user)->post('/objectifs', [
        'metric' => 'profit', 'amount' => 0, 'starts_on' => '2026-10-20', 'ends_on' => '2026-10-10',
    ])->assertSessionHasErrors(['amount', 'ends_on']);

    $other = User::factory()->create(['merchant_id' => Merchant::create(['name' => 'Autre'])->id]);
    $this->actingAs($other)->delete("/objectifs/{$goal->id}")->assertNotFound();

    $this->actingAs($this->user)->delete("/objectifs/{$goal->id}")->assertRedirect('/objectifs');
    expect($this->merchant->financialGoals()->count())->toBe(0);
});

it('calcule l\'avancement de chaque objectif sur ses propres dates', function () {
    $create = fn (array $attributes) => FinancialGoal::create(['merchant_id' => $this->merchant->id, 'metric' => 'profit', ...$attributes]);

    $create(['title' => 'Semaine du 12', 'amount' => 300000, 'starts_on' => '2026-10-12', 'ends_on' => '2026-10-18']);
    $create(['title' => 'Octobre depuis le 5', 'metric' => 'revenue', 'amount' => 1000000, 'starts_on' => '2026-10-05', 'ends_on' => '2026-10-31']);
    $create(['title' => 'Novembre', 'amount' => 500000, 'starts_on' => '2026-11-01', 'ends_on' => '2026-11-30']);
    $create(['title' => 'Septembre', 'amount' => 500000, 'starts_on' => '2026-09-01', 'ends_on' => '2026-09-30']);

    $goals = collect(app(GoalTracker::class)->all($this->merchant->fresh(), CarbonImmutable::parse('2026-10-20')))->keyBy('title');

    expect($goals['Semaine du 12']['status'])->toBe('reached')
        ->and($goals['Semaine du 12']['achieved'])->toBe(328000)
        ->and($goals['Octobre depuis le 5']['status'])->toBe('in_progress')
        ->and($goals['Octobre depuis le 5']['achieved'])->toBe(650000)
        ->and($goals['Octobre depuis le 5']['days'])->toBe(27)
        ->and($goals['Octobre depuis le 5']['days_left'])->toBe(12)
        ->and($goals['Octobre depuis le 5']['per_day_needed'])->toBe((int) ceil(350000 / 12))
        ->and($goals['Novembre']['status'])->toBe('upcoming')
        ->and($goals['Novembre']['achieved'])->toBe(0)
        ->and($goals['Septembre']['status'])->toBe('missed');

    $current = collect(app(GoalTracker::class)->current($this->merchant->fresh(), CarbonImmutable::parse('2026-10-20')))->pluck('title');
    expect($current)->toContain('Octobre depuis le 5', 'Novembre', 'Semaine du 12')->not->toContain('Septembre');
});

it('partage les objectifs en cours sur toutes les pages', function () {
    FinancialGoal::create([
        'merchant_id' => $this->merchant->id, 'metric' => 'profit', 'amount' => 50000,
        'starts_on' => now()->subDays(2)->toDateString(), 'ends_on' => now()->addDays(5)->toDateString(),
    ]);

    $this->actingAs($this->user)->get('/pub')
        ->assertInertia(fn (Assert $page) => $page->has('goals', 1)->where('goals.0.target', 50000)->where('goals.0.status', 'in_progress'));
});

it('garde le pays et les dates choisis quand on revient sur les rapports', function () {
    $this->actingAs($this->user)->get('/rapports?period=custom&du=2026-10-12&au=2026-10-25')->assertOk();

    $this->actingAs($this->user)->get('/pub')->assertOk();

    $this->actingAs($this->user)->get('/rapports')
        ->assertInertia(fn (Assert $page) => $page
            ->where('period.type', 'custom')
            ->where('period.from', '2026-10-12')
            ->where('period.to', '2026-10-25')
        );

    $this->actingAs($this->user)->get('/rapports?period=day&date=2026-10-14')
        ->assertInertia(fn (Assert $page) => $page->where('period.type', 'day'));

    $this->actingAs($this->user)->get('/rapports')
        ->assertInertia(fn (Assert $page) => $page->where('period.type', 'day')->where('period.from', '2026-10-14'));
});

it('montre le menu Administration après la commande super admin', function () {
    $this->actingAs($this->user)->get('/rapports')->assertInertia(fn (Assert $page) => $page->where('auth.isSuperAdmin', false));

    $this->artisan('codcompta:super-admin', ['email' => $this->user->email])->assertSuccessful();

    $this->actingAs($this->user->fresh())->get('/rapports')->assertInertia(fn (Assert $page) => $page->where('auth.isSuperAdmin', true));
});
