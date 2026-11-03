<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\User;
use App\Services\Google\GoogleClient;
use App\Services\Google\GoogleException;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * "Continuer avec Google": signs a person in with their Google account, or creates their account.
 */
class GoogleSignIn extends Controller
{
    public function redirect(Request $request, GoogleClient $google): Response
    {
        if (! $google->isConfigured()) {
            return to_route('login')->withErrors(['email' => 'La connexion avec Google n\'est pas encore disponible. Utilisez votre email et votre mot de passe.']);
        }

        $state = Str::random(40);
        $request->session()->put('google_oauth_state', $state);

        return redirect()->away($google->signInUrl($state));
    }

    public function callback(Request $request, GoogleClient $google): RedirectResponse
    {
        $expectedState = $request->session()->pull('google_oauth_state');

        if ($request->filled('error')) {
            return to_route('login')->withErrors(['email' => 'Connexion avec Google annulée.']);
        }

        if (! is_string($expectedState) || ! hash_equals($expectedState, (string) $request->query('state'))) {
            return to_route('login')->withErrors(['email' => 'La connexion avec Google a expiré. Recommencez.']);
        }

        try {
            $profile = $google->signInProfile((string) $request->query('code'));
        } catch (GoogleException $exception) {
            return to_route('login')->withErrors(['email' => $exception->getMessage()]);
        }

        if (! $profile['email_verified']) {
            return to_route('login')->withErrors(['email' => 'Cette adresse Google n\'est pas confirmée. Confirmez-la chez Google ou créez un compte avec votre email.']);
        }

        $user = User::where('google_id', $profile['id'])->first()
            ?? User::where('email', $profile['email'])->first();

        if ($user === null) {
            $user = $this->register($profile);
        } else {
            // An account created with email and password is linked to Google on its first Google sign-in.
            $user->forceFill([
                'google_id' => $user->google_id ?? $profile['id'],
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('reports.index', absolute: false));
    }

    /**
     * @param  array{id: string, email: string, email_verified: bool, name: string}  $profile
     */
    private function register(array $profile): User
    {
        $user = DB::transaction(function () use ($profile) {
            $merchant = Merchant::create(['name' => $profile['name']]);

            $user = User::create([
                'merchant_id' => $merchant->id,
                'role' => 'owner',
                'name' => $profile['name'],
                'email' => $profile['email'],
                'google_id' => $profile['id'],
                // No password yet: "Mot de passe oublié" lets the person choose one later.
                'password' => Hash::make(Str::random(64)),
            ]);

            $user->forceFill(['email_verified_at' => now()])->save();

            return $user;
        });

        event(new Registered($user));

        return $user;
    }
}
