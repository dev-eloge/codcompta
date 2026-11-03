<?php

use App\Models\AdminAuditLog;
use App\Models\Agency;
use App\Models\Merchant;
use App\Models\RawMessage;
use App\Models\User;
use App\Services\Parsing\MessageParser;
use Database\Seeders\DemoWeekSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->demo = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->owner = User::factory()->create(['merchant_id' => $this->demo->id, 'role' => 'owner', 'email' => 'patron@demo.test']);

    $this->adminMerchant = Merchant::create(['name' => 'Plateforme']);
    $this->admin = User::factory()->create(['merchant_id' => $this->adminMerchant->id, 'role' => 'owner']);
    $this->admin->forceFill(['is_super_admin' => true])->save();
});

it('réserve l\'administration au super admin', function () {
    $this->get('/admin')->assertRedirect('/login');

    $this->actingAs($this->owner)->get('/admin')->assertForbidden();
    $this->actingAs($this->owner)->get('/admin/commercants')->assertForbidden();
    $this->actingAs($this->owner)->post("/admin/commercants/{$this->demo->id}/suspendre", ['reason' => 'Test abusif'])->assertForbidden();

    $this->actingAs($this->admin)->get('/admin')->assertOk();
});

it('donne et retire le rôle avec une commande', function () {
    $this->artisan('codcompta:super-admin', ['email' => 'patron@demo.test'])->assertSuccessful();
    expect($this->owner->fresh()->is_super_admin)->toBeTrue();

    $this->artisan('codcompta:super-admin', ['email' => 'patron@demo.test', '--retirer' => true])->assertSuccessful();
    expect($this->owner->fresh()->is_super_admin)->toBeFalse();

    $this->artisan('codcompta:super-admin', ['email' => 'inconnu@demo.test'])->assertFailed();
});

it('montre les chiffres de la plateforme', function () {
    $this->demo->countries()->first()->agencies()->first()->rawMessages()->create([
        'body' => 'RAPPORT', 'status' => 'parsed', 'ai_input_tokens' => 1200, 'ai_output_tokens' => 300,
    ]);

    $this->actingAs($this->admin)->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->component('admin/dashboard')
        ->where('metrics.merchants', 2)
        ->where('metrics.messages_30d', 1)
        ->where('metrics.ai_input_tokens_30d', 1200)
        ->where('metrics.ai_output_tokens_30d', 300)
        ->where('metrics.active_7d', 1)
        ->has('signupsByWeek', 8)
        ->has('recentMerchants', 2));
});

it('liste, cherche et filtre les commerçants', function () {
    $this->actingAs($this->admin)->get('/admin/commercants')->assertInertia(fn (Assert $page) => $page
        ->component('admin/merchants/index')
        ->has('merchants.data', 2)
        ->where('counts.tous', 2));

    $this->actingAs($this->admin)->get('/admin/commercants?q=patron@demo')->assertInertia(fn (Assert $page) => $page
        ->has('merchants.data', 1)
        ->where('merchants.data.0.name', 'Boutique Démo')
        ->where('merchants.data.0.owner.email', 'patron@demo.test')
        ->where('merchants.data.0.agencies_count', 2)
        ->where('merchants.data.0.reports_count', 8));

    $this->demo->update(['suspended_at' => now()]);
    $this->actingAs($this->admin)->get('/admin/commercants?statut=suspendus')->assertInertia(fn (Assert $page) => $page
        ->has('merchants.data', 1)
        ->where('merchants.data.0.id', $this->demo->id));
});

it('affiche le détail d\'un commerçant', function () {
    $this->actingAs($this->admin)->get("/admin/commercants/{$this->demo->id}")->assertInertia(fn (Assert $page) => $page
        ->component('admin/merchants/show')
        ->where('merchant.name', 'Boutique Démo')
        ->has('merchant.countries.0.agencies', 2)
        ->has('recentReports', 8));
});

it('suspend un commerçant avec une raison et le déconnecte, puis le réactive', function () {
    $this->actingAs($this->admin)->post("/admin/commercants/{$this->demo->id}/suspendre", ['reason' => ''])->assertSessionHasErrors('reason');

    $this->actingAs($this->admin)->post("/admin/commercants/{$this->demo->id}/suspendre", ['reason' => 'Impayé depuis deux mois'])
        ->assertSessionHas('success');

    expect($this->demo->fresh()->isSuspended())->toBeTrue()
        ->and(AdminAuditLog::where('action', AdminAuditLog::SUSPENDED)->sole()->details['reason'])->toBe('Impayé depuis deux mois');

    $this->actingAs($this->owner)->get('/rapports')->assertRedirect('/login')->assertSessionHasErrors('email');
    $this->assertGuest();

    $this->actingAs($this->admin)->post("/admin/commercants/{$this->demo->id}/reactiver")->assertSessionHas('success');
    expect($this->demo->fresh()->isSuspended())->toBeFalse();
    $this->actingAs($this->owner->fresh())->get('/rapports')->assertOk();
});

it('refuse de suspendre le compte du super admin', function () {
    $this->actingAs($this->admin)->post("/admin/commercants/{$this->adminMerchant->id}/suspendre", ['reason' => 'Par erreur'])
        ->assertSessionHas('warning');

    expect($this->adminMerchant->fresh()->isSuspended())->toBeFalse();
});

it('consulte le compte d\'un commerçant, protège ses paramètres et revient', function () {
    $this->actingAs($this->admin)->post("/admin/commercants/{$this->demo->id}/consulter")->assertRedirect('/rapports');

    $this->assertAuthenticatedAs($this->owner);
    expect(session('impersonator_id'))->toBe($this->admin->id);

    $this->get('/rapports')->assertInertia(fn (Assert $page) => $page
        ->where('impersonation.merchant', 'Boutique Démo')
        ->where('auth.isSuperAdmin', false));

    $this->get('/admin')->assertForbidden();
    $this->from('/settings/password')->put('/settings/password', [
        'current_password' => 'password', 'password' => 'NouveauMotDePasse1', 'password_confirmation' => 'NouveauMotDePasse1',
    ])->assertSessionHas('warning');

    $this->post('/admin/consultation/terminer')->assertRedirect("/admin/commercants/{$this->demo->id}");
    $this->assertAuthenticatedAs($this->admin);

    expect(AdminAuditLog::pluck('action')->all())->toBe([AdminAuditLog::IMPERSONATION_STARTED, AdminAuditLog::IMPERSONATION_STOPPED]);
});

it('laisse le super admin consulter un compte suspendu', function () {
    $this->demo->update(['suspended_at' => now(), 'suspension_reason' => 'Contrôle']);

    $this->actingAs($this->admin)->post("/admin/commercants/{$this->demo->id}/consulter");
    $this->get('/rapports')->assertOk();
});

it('affiche le journal des actions', function () {
    AdminAuditLog::create(['admin_id' => $this->admin->id, 'merchant_id' => $this->demo->id, 'action' => AdminAuditLog::REACTIVATED]);

    $this->actingAs($this->admin)->get('/admin/journal')->assertInertia(fn (Assert $page) => $page
        ->component('admin/journal')
        ->where('logs.data.0.label', 'Compte réactivé')
        ->where('logs.data.0.merchant.name', 'Boutique Démo'));
});

it('enregistre les jetons Claude utilisés par message', function () {
    $agency = $this->demo->countries()->first()->agencies()->first();
    app()->instance(MessageParser::class, new class implements MessageParser
    {
        public function parse(Agency $agency, string $body, string $receivedOn): array
        {
            return ['reports' => [], 'warnings' => [], 'usage' => ['input_tokens' => 900, 'output_tokens' => 120]];
        }
    });

    $this->actingAs($this->owner)->post('/messages', ['agency_id' => $agency->id, 'body' => 'RAPPORT DU 20/10/2026 rien']);

    expect(RawMessage::sole())->ai_input_tokens->toBe(900)->ai_output_tokens->toBe(120);
});
