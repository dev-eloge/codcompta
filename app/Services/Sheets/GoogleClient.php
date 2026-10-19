<?php

namespace App\Services\Sheets;

use App\Models\GoogleConnection;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

/**
 * Talks to Google: the OAuth sign-in (read-only access to spreadsheets) and the Sheets API.
 */
class GoogleClient
{
    public const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/spreadsheets.readonly'];

    private const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

    private const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

    private const SHEETS_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

    public function __construct(
        private readonly ?string $clientId,
        private readonly ?string $clientSecret,
        private readonly string $redirectUri,
    ) {}

    public function isConfigured(): bool
    {
        return filled($this->clientId) && filled($this->clientSecret);
    }

    public function authorizationUrl(string $state): string
    {
        return self::AUTH_URL.'?'.http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', self::SCOPES),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ]);
    }

    /**
     * Swaps the code Google sent back for tokens and the account's email.
     *
     * @return array{email: string, access_token: string, refresh_token: string|null, expires_at: Carbon}
     */
    public function exchangeCode(string $code): array
    {
        $tokens = $this->send(fn () => Http::asForm()->post(self::TOKEN_URL, [
            'code' => $code,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri' => $this->redirectUri,
            'grant_type' => 'authorization_code',
        ]));

        if (! str_contains((string) ($tokens['scope'] ?? ''), 'spreadsheets.readonly')) {
            throw new GoogleSheetsException('Google n\'a pas donné l\'accès aux Sheets. Recommencez et cochez l\'accès à vos feuilles de calcul.');
        }

        $profile = $this->send(fn () => Http::withToken($tokens['access_token'])->get(self::USERINFO_URL));

        return [
            'email' => (string) ($profile['email'] ?? ''),
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'] ?? null,
            'expires_at' => now()->addSeconds((int) ($tokens['expires_in'] ?? 3600)),
        ];
    }

    public function revoke(GoogleConnection $connection): void
    {
        $token = $connection->refresh_token ?: $connection->access_token;

        try {
            Http::asForm()->timeout(10)->post(self::REVOKE_URL, ['token' => $token]);
        } catch (ConnectionException) {
            // Revoking is best effort: the connection is deleted on our side anyway.
        }
    }

    /**
     * Title and tabs of a spreadsheet.
     *
     * @return array{title: string, sheets: list<array{title: string, rows: int, columns: int}>}
     */
    public function spreadsheet(GoogleConnection $connection, string $spreadsheetId): array
    {
        $data = $this->send(fn () => Http::withToken($this->accessToken($connection))
            ->get(self::SHEETS_URL.'/'.rawurlencode($spreadsheetId), [
                'fields' => 'properties.title,sheets.properties(title,gridProperties(rowCount,columnCount))',
            ]));

        return [
            'title' => (string) ($data['properties']['title'] ?? 'Sans titre'),
            'sheets' => collect($data['sheets'] ?? [])->map(fn (array $sheet) => [
                'title' => (string) $sheet['properties']['title'],
                'rows' => (int) ($sheet['properties']['gridProperties']['rowCount'] ?? 0),
                'columns' => (int) ($sheet['properties']['gridProperties']['columnCount'] ?? 0),
            ])->values()->all(),
        ];
    }

    /**
     * Cell values of a tab: numbers as numbers, dates as the text shown in the sheet.
     *
     * @return list<list<string|int|float|bool>>
     */
    public function values(GoogleConnection $connection, string $spreadsheetId, string $sheetTitle, int $maxRows = 5000): array
    {
        $range = "'".str_replace("'", "''", $sheetTitle)."'!A1:Z{$maxRows}";

        $data = $this->send(fn () => Http::withToken($this->accessToken($connection))
            ->get(self::SHEETS_URL.'/'.rawurlencode($spreadsheetId).'/values/'.rawurlencode($range), [
                'valueRenderOption' => 'UNFORMATTED_VALUE',
                'dateTimeRenderOption' => 'FORMATTED_STRING',
            ]));

        return array_values($data['values'] ?? []);
    }

    /**
     * Access tokens last one hour: a fresh one is asked with the refresh token when needed.
     */
    public function accessToken(GoogleConnection $connection): string
    {
        if (! $connection->isExpired()) {
            return $connection->access_token;
        }

        if (blank($connection->refresh_token)) {
            throw new GoogleSheetsException('La connexion Google a expiré. Reconnectez votre compte Google.', needsReconnect: true);
        }

        $tokens = $this->send(fn () => Http::asForm()->post(self::TOKEN_URL, [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $connection->refresh_token,
            'grant_type' => 'refresh_token',
        ]));

        $connection->update([
            'access_token' => $tokens['access_token'],
            'expires_at' => now()->addSeconds((int) ($tokens['expires_in'] ?? 3600)),
        ]);

        return $connection->access_token;
    }

    /**
     * Pulls a Google spreadsheet id out of a pasted link (or returns the id as is).
     */
    public static function spreadsheetIdFrom(string $linkOrId): ?string
    {
        $linkOrId = trim($linkOrId);

        if (preg_match('#/spreadsheets/d/([a-zA-Z0-9_-]{20,})#', $linkOrId, $matches)) {
            return $matches[1];
        }

        return preg_match('/^[a-zA-Z0-9_-]{20,}$/', $linkOrId) ? $linkOrId : null;
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
            throw new GoogleSheetsException('Google ne répond pas. Vérifiez votre connexion internet et réessayez.');
        }

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        $error = $response->json('error');
        $reason = is_array($error) ? ($error['status'] ?? '') : (string) $error;

        throw match (true) {
            $reason === 'invalid_grant', $response->status() === 401 => new GoogleSheetsException('La connexion Google n\'est plus valide. Reconnectez votre compte Google.', needsReconnect: true),
            $response->status() === 403 => new GoogleSheetsException('Ce compte Google n\'a pas accès à ce Sheet. Ouvrez-le avec le même compte ou demandez à son propriétaire de vous le partager.'),
            $response->status() === 404 => new GoogleSheetsException('Ce Sheet est introuvable. Vérifiez le lien.'),
            $response->status() === 400 && str_contains((string) $response->body(), 'Unable to parse range') => new GoogleSheetsException('Cet onglet n\'existe plus dans le Sheet. Il a peut-être été renommé.'),
            default => new GoogleSheetsException('Google a refusé la demande (erreur '.$response->status().'). Réessayez dans un instant.'),
        };
    }
}
