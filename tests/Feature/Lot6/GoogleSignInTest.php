<?php

use App\Models\Merchant;
use App\Models\User;
use App\Services\Google\GoogleClient;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    config(['services.google.client_id' => 'id-client', 'services.google.client_secret' => 'secret-client']);
});

function fakeGoogleProfile(array $profile): void
{
    Http::fake([
        'oauth2.googleapis.com/token' => Http::response(['access_token' => 'a1', 'expires_in' => 3599, 'scope' => 'openid email profile']),
        'openidconnect.googleapis.com/*' => Http::response($profile),
    ]);
}

/**
 * Starts "Continuer avec Google" and returns the state Google would send back.
 */
function startGoogleSignIn($test): string
{
    $response = $test->get('/auth/google');
    $response->assertRedirectContains('accounts.google.com');
    parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);

    expect($query['scope'])->toBe('openid email profile')
        ->and($query['redirect_uri'])->toEndWith('/google/callback');

    return $query['state'];
}

it('montre le bouton Google seulement quand il est configuré', function () {
    $this->get('/login')->assertInertia(fn (Assert $page) => $page->where('googleSignIn', true));
    $this->get('/register')->assertInertia(fn (Assert $page) => $page->where('googleSignIn', true));

    config(['services.google.client_id' => null]);
    $this->get('/login')->assertInertia(fn (Assert $page) => $page->where('googleSignIn', false));
});

it('crée le compte et l\'espace commerçant au premier passage par Google', function () {
    fakeGoogleProfile(['sub' => 'g-123', 'email' => 'Awa@Exemple.com', 'email_verified' => true, 'name' => 'Awa Mensah']);
    $state = startGoogleSignIn($this);

    $this->get('/google/callback?code=abc&state='.$state)->assertRedirect('/rapports');

    $user = User::sole();
    expect($user)
        ->email->toBe('awa@exemple.com')
        ->google_id->toBe('g-123')
        ->name->toBe('Awa Mensah')
        ->role->toBe('owner')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->merchant->name)->toBe('Awa Mensah');

    $this->assertAuthenticatedAs($user);
});

it('connecte un compte existant et le relie à Google', function () {
    $user = User::factory()->create(['email' => 'awa@exemple.com', 'merchant_id' => Merchant::create(['name' => 'Boutique'])->id]);
    fakeGoogleProfile(['sub' => 'g-123', 'email' => 'awa@exemple.com', 'email_verified' => true, 'name' => 'Awa']);
    $state = startGoogleSignIn($this);

    $this->get('/google/callback?code=abc&state='.$state)->assertRedirect('/rapports');

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->google_id)->toBe('g-123')->and(User::count())->toBe(1);
});

it('refuse un état falsifié ou une adresse non confirmée', function () {
    fakeGoogleProfile(['sub' => 'g-9', 'email' => 'x@exemple.com', 'email_verified' => false, 'name' => 'X']);

    startGoogleSignIn($this);
    $this->get('/google/callback?code=abc&state=faux')->assertRedirect('/login')->assertSessionHasErrors('email');

    $state = startGoogleSignIn($this);
    $this->get('/google/callback?code=abc&state='.$state)->assertRedirect('/login')->assertSessionHasErrors('email');

    $this->assertGuest();
    expect(User::count())->toBe(0);
});

it('ne propose plus l\'import Google Sheets', function () {
    $user = User::factory()->create(['merchant_id' => Merchant::create(['name' => 'Boutique'])->id]);

    $this->actingAs($user)->get('/sheets')->assertNotFound();
    $this->actingAs($user)->get('/google/connecter')->assertNotFound();
    expect(GoogleClient::SIGN_IN_SCOPES)->not->toContain('https://www.googleapis.com/auth/spreadsheets.readonly');
});

it('renvoie un visiteur vers la connexion s\'il arrive sur le retour Google sans démarche', function () {
    $this->get('/google/callback?code=abc&state=x')->assertRedirect('/login');
});
