<?php

use App\Models\FinancialGoal;
use App\Models\Merchant;
use App\Models\PushSubscription;
use App\Models\User;
use App\Services\Push\WebPush;
use Database\Seeders\DemoWeekSeeder;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->seed(DemoWeekSeeder::class);
    $this->merchant = Merchant::where('name', 'Boutique Démo')->firstOrFail();
    $this->user = User::factory()->create(['merchant_id' => $this->merchant->id]);

    $keys = WebPush::generateKeys();
    config(['services.webpush.public_key' => $keys['public'], 'services.webpush.private_key' => $keys['private']]);

    $this->travelTo('2026-10-20 12:00:00');
    $this->pushStatus = 201;
    Http::fake(fn () => Http::response('', $this->pushStatus));
});

/** A browser subscription, as a phone would send it. */
function browserSubscription(string $endpoint = 'https://fcm.googleapis.com/fcm/send/abc123'): array
{
    $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    $ec = openssl_pkey_get_details($key)['ec'];

    return [
        'endpoint' => $endpoint,
        'keys' => [
            'p256dh' => WebPush::encode("\x04".str_pad($ec['x'], 32, "\x00", STR_PAD_LEFT).str_pad($ec['y'], 32, "\x00", STR_PAD_LEFT)),
            'auth' => WebPush::encode(random_bytes(16)),
        ],
        'device' => 'Android',
    ];
}

it('active, garde une seule fois et désactive les notifications d\'un appareil', function () {
    $this->actingAs($this->user)->postJson('/notifications/abonnement', browserSubscription())->assertOk();
    $this->actingAs($this->user)->postJson('/notifications/abonnement', browserSubscription())->assertOk();

    expect($this->user->pushSubscriptions()->count())->toBe(1);

    $this->actingAs($this->user)->deleteJson('/notifications/abonnement', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123'])->assertOk();

    expect($this->user->pushSubscriptions()->count())->toBe(0);
});

it('refuse une adresse qui n\'est pas un service de notifications', function () {
    $this->actingAs($this->user)
        ->postJson('/notifications/abonnement', browserSubscription('https://exemple.com/hook'))
        ->assertJsonValidationErrors('endpoint');

    expect(PushSubscription::count())->toBe(0);
});

it('prévient de la création d\'un objectif, chiffré et signé pour le navigateur', function () {
    $this->actingAs($this->user)->postJson('/notifications/abonnement', browserSubscription());

    $this->actingAs($this->user)->post('/objectifs', [
        'title' => 'Fin octobre',
        'metric' => 'profit',
        'amount' => 900000,
        'starts_on' => '2026-10-19',
        'ends_on' => '2026-10-31',
    ])->assertRedirect('/objectifs');

    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request) => $request->url() === 'https://fcm.googleapis.com/fcm/send/abc123'
        && $request->header('Content-Encoding')[0] === 'aes128gcm'
        && str_starts_with($request->header('Authorization')[0], 'vapid t=')
        && strlen($request->body()) > 86);
});

it('annonce une seule fois un objectif atteint et un objectif manqué', function () {
    PushSubscription::create([
        'user_id' => $this->user->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
        'endpoint_hash' => PushSubscription::hashOf('https://fcm.googleapis.com/fcm/send/abc123'),
        'public_key' => browserSubscription()['keys']['p256dh'],
        'auth_token' => browserSubscription()['keys']['auth'],
    ]);

    $reached = FinancialGoal::create(['merchant_id' => $this->merchant->id, 'metric' => 'profit', 'amount' => 300000, 'starts_on' => '2026-10-12', 'ends_on' => '2026-10-18']);
    $missed = FinancialGoal::create(['merchant_id' => $this->merchant->id, 'metric' => 'profit', 'amount' => 5000000, 'starts_on' => '2026-10-12', 'ends_on' => '2026-10-18']);
    $running = FinancialGoal::create(['merchant_id' => $this->merchant->id, 'metric' => 'profit', 'amount' => 5000000, 'starts_on' => '2026-10-12', 'ends_on' => '2026-10-31']);

    $this->artisan('codcompta:verifier-objectifs')->assertSuccessful();
    $this->artisan('codcompta:verifier-objectifs')->assertSuccessful();

    Http::assertSentCount(2);
    expect($reached->fresh()->reached_notified_at)->not->toBeNull()
        ->and($missed->fresh()->missed_notified_at)->not->toBeNull()
        ->and($missed->fresh()->reached_notified_at)->toBeNull()
        ->and($running->fresh()->reached_notified_at)->toBeNull()
        ->and($running->fresh()->missed_notified_at)->toBeNull();
});

it('oublie un appareil qui a retiré son accord', function () {
    $this->pushStatus = 410;
    $this->actingAs($this->user)->postJson('/notifications/abonnement', browserSubscription());

    $this->actingAs($this->user)->postJson('/notifications/essai')->assertOk()->assertJson(['sent' => 0]);

    expect(PushSubscription::count())->toBe(0);
});

it('n\'envoie rien quand personne n\'a activé les notifications', function () {
    FinancialGoal::create(['merchant_id' => $this->merchant->id, 'metric' => 'profit', 'amount' => 300000, 'starts_on' => '2026-10-12', 'ends_on' => '2026-10-18']);

    $this->artisan('codcompta:verifier-objectifs')->assertSuccessful();

    Http::assertNothingSent();
    expect(FinancialGoal::sole()->reached_notified_at)->not->toBeNull();
});

it('partage la clé publique des notifications avec les pages', function () {
    $this->actingAs($this->user)->get('/objectifs')
        ->assertInertia(fn ($page) => $page->where('push.publicKey', config('services.webpush.public_key')));
});

it('teste les notifications d\'un compte depuis le serveur et signale une clé changée', function () {
    $browser = browserSubscription('https://fcm.googleapis.com/fcm/send/essai');
    PushSubscription::create([
        'user_id' => $this->user->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/essai',
        'endpoint_hash' => PushSubscription::hashOf('https://fcm.googleapis.com/fcm/send/essai'),
        'public_key' => $browser['keys']['p256dh'],
        'auth_token' => $browser['keys']['auth'],
        'device' => 'Android',
    ]);

    $this->artisan('codcompta:notifications-essai', ['email' => $this->user->email])
        ->expectsOutputToContain('Envoyé : Android')
        ->assertSuccessful();

    $this->pushStatus = 403;

    $this->artisan('codcompta:notifications-essai', ['email' => $this->user->email])
        ->expectsOutputToContain('désactivez puis réactivez')
        ->assertFailed();
});
