<?php

namespace App\Http\Controllers;

use App\Models\GoogleConnection;
use App\Services\Sheets\GoogleClient;
use App\Services\Sheets\GoogleSheetsException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Links the merchant's Google account (read-only access to its spreadsheets).
 */
class GoogleController extends Controller
{
    public function redirect(Request $request, GoogleClient $google): Response
    {
        $this->merchantOf($request);

        if (! $google->isConfigured()) {
            return to_route('sheets.index')->with('warning', 'La connexion Google n\'est pas encore configurée : ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans le fichier .env.');
        }

        $state = Str::random(40);
        $request->session()->put('google_oauth_state', $state);

        return redirect()->away($google->authorizationUrl($state));
    }

    public function callback(Request $request, GoogleClient $google): RedirectResponse
    {
        $merchant = $this->merchantOf($request);
        $expectedState = $request->session()->pull('google_oauth_state');

        if ($request->filled('error')) {
            return to_route('sheets.index')->with('warning', 'Connexion Google annulée.');
        }

        if (! is_string($expectedState) || ! hash_equals($expectedState, (string) $request->query('state'))) {
            return to_route('sheets.index')->with('warning', 'La connexion Google a expiré. Recommencez.');
        }

        try {
            $account = $google->exchangeCode((string) $request->query('code'));
        } catch (GoogleSheetsException $exception) {
            return to_route('sheets.index')->with('warning', $exception->getMessage());
        }

        $existing = $merchant->googleConnection()->first();

        GoogleConnection::updateOrCreate(['merchant_id' => $merchant->id], [
            'user_id' => $request->user()->id,
            'google_email' => $account['email'],
            'access_token' => $account['access_token'],
            // Google only sends a refresh token on the first consent: keep the old one otherwise.
            'refresh_token' => $account['refresh_token'] ?? $existing?->refresh_token,
            'expires_at' => $account['expires_at'],
        ]);

        return to_route('sheets.index')->with('success', "Compte Google {$account['email']} connecté.");
    }

    public function disconnect(Request $request, GoogleClient $google): RedirectResponse
    {
        $connection = $this->merchantOf($request)->googleConnection()->first();

        if ($connection !== null) {
            $google->revoke($connection);
            $connection->delete();
        }

        return to_route('sheets.index')->with('success', 'Compte Google déconnecté. Les rapports déjà importés sont gardés.');
    }
}
