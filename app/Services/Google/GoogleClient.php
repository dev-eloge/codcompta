<?php

namespace App\Services\Google;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * "Continuer avec Google": the OAuth sign-in, which only reads the person's name and email.
 */
class GoogleClient
{
    /** Signing in with Google only needs the person's name and email. */
    public const SIGN_IN_SCOPES = ['openid', 'email', 'profile'];

    private const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

    public function __construct(
        private readonly ?string $clientId,
        private readonly ?string $clientSecret,
        private readonly string $redirectUri,
    ) {}

    public function isConfigured(): bool
    {
        return filled($this->clientId) && filled($this->clientSecret);
    }

    /**
     * "Continuer avec Google" on the sign-in page: name and email only, no access to files.
     */
    public function signInUrl(string $state): string
    {
        return self::AUTH_URL.'?'.http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', self::SIGN_IN_SCOPES),
            'prompt' => 'select_account',
            'state' => $state,
        ]);
    }

    /**
     * Swaps the sign-in code for the Google profile.
     *
     * @return array{id: string, email: string, email_verified: bool, name: string}
     */
    public function signInProfile(string $code): array
    {
        $tokens = $this->send(fn () => Http::asForm()->post(self::TOKEN_URL, [
            'code' => $code,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri' => $this->redirectUri,
            'grant_type' => 'authorization_code',
        ]));

        $profile = $this->send(fn () => Http::withToken($tokens['access_token'])->get(self::USERINFO_URL));

        if (blank($profile['sub'] ?? null) || blank($profile['email'] ?? null)) {
            throw new GoogleException('Google n\'a pas transmis votre adresse email. Réessayez ou créez un compte avec votre email.');
        }

        return [
            'id' => (string) $profile['sub'],
            'email' => mb_strtolower((string) $profile['email']),
            'email_verified' => (bool) ($profile['email_verified'] ?? false),
            'name' => trim((string) ($profile['name'] ?? '')) ?: strstr((string) $profile['email'], '@', true),
        ];
    }

    /**
     * @param  callable(): Response  $request
     * @return array<string, mixed>
     */
    private function send(callable $request): array
    {
        try {
            $response = $request();
        } catch (ConnectionException) {
            throw new GoogleException('Google ne répond pas. Vérifiez votre connexion internet et réessayez.');
        }

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        throw new GoogleException($response->status() === 400 || $response->status() === 401
            ? 'La connexion avec Google a expiré. Recommencez.'
            : 'Google a refusé la demande (erreur '.$response->status().'). Réessayez dans un instant.');
    }
}
