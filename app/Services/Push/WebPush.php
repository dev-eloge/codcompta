<?php

namespace App\Services\Push;

use App\Models\PushSubscription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Sends Web Push notifications (RFC 8030) with VAPID (RFC 8292), encrypted with "aes128gcm" (RFC 8291 and 8188).
 * Written with PHP's own OpenSSL functions, so no extra library is needed.
 */
class WebPush
{
    /** DER prefix of a P-256 public key (SubjectPublicKeyInfo), followed by the 65-byte uncompressed point. */
    private const P256_PUBLIC_PREFIX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

    public function __construct(
        private readonly ?string $publicKey,
        private readonly ?string $privateKey,
        private readonly string $subject,
    ) {}

    public function isConfigured(): bool
    {
        return filled($this->publicKey) && filled($this->privateKey);
    }

    public function subject(): string
    {
        return $this->subject;
    }

    public function publicKey(): ?string
    {
        return $this->publicKey;
    }

    /**
     * Sends one notification. A subscription the browser has withdrawn (404 or 410) is deleted.
     *
     * @param  array<string, mixed>  $payload  title, body, url, tag… read by public/sw.js
     */
    public function send(PushSubscription $subscription, array $payload): bool
    {
        return $this->deliver($subscription, $payload)['ok'];
    }

    /**
     * Same as send(), with what the push service answered, for the diagnostic command.
     *
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, status: int|null, reason: string|null}
     */
    public function deliver(PushSubscription $subscription, array $payload): array
    {
        if (! $this->isConfigured()) {
            return ['ok' => false, 'status' => null, 'reason' => 'VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY manquant'];
        }

        try {
            $body = $this->encrypt(
                json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                self::decode($subscription->public_key),
                self::decode($subscription->auth_token),
            );

            $response = Http::timeout(15)
                ->withHeaders([
                    'TTL' => '86400',
                    'Urgency' => 'high',
                    'Content-Encoding' => 'aes128gcm',
                    'Authorization' => 'vapid t='.$this->vapidToken($subscription->endpoint).', k='.$this->publicKey,
                ])
                ->withBody($body, 'application/octet-stream')
                ->post($subscription->endpoint);
        } catch (Throwable $exception) {
            Log::warning('Web push failed', ['endpoint' => $subscription->endpoint, 'error' => $exception->getMessage()]);

            return ['ok' => false, 'status' => null, 'reason' => $exception->getMessage()];
        }

        if (in_array($response->status(), [404, 410], true)) {
            $subscription->delete();

            return ['ok' => false, 'status' => $response->status(), 'reason' => 'abonnement expiré, supprimé'];
        }

        if (! $response->successful()) {
            Log::warning('Web push refused', ['status' => $response->status(), 'body' => $response->body()]);
        }

        return [
            'ok' => $response->successful(),
            'status' => $response->status(),
            'reason' => $response->successful() ? null : mb_substr(trim($response->body()), 0, 300),
        ];
    }

    /**
     * New VAPID keys, to put in the .env file once.
     *
     * @return array{public: string, private: string}
     */
    public static function generateKeys(): array
    {
        $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        $details = openssl_pkey_get_details($key);

        return [
            'public' => self::encode("\x04".self::pad($details['ec']['x']).self::pad($details['ec']['y'])),
            'private' => self::encode(self::pad($details['ec']['d'])),
        ];
    }

    /**
     * RFC 8291: one aes128gcm record holding the message, readable only by the browser that subscribed.
     */
    public function encrypt(string $plaintext, string $userPublicKey, string $authSecret): string
    {
        $local = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        $details = openssl_pkey_get_details($local);
        $localPublicKey = "\x04".self::pad($details['ec']['x']).self::pad($details['ec']['y']);

        $sharedSecret = openssl_pkey_derive(self::publicKeyPem($userPublicKey), $local, 32);

        if ($sharedSecret === false) {
            throw new RuntimeException('Clé de l\'abonnement invalide.');
        }

        $ikm = self::hkdf($authSecret, $sharedSecret, "WebPush: info\x00".$userPublicKey.$localPublicKey, 32);
        $salt = random_bytes(16);
        $contentKey = self::hkdf($salt, $ikm, "Content-Encoding: aes128gcm\x00", 16);
        $nonce = self::hkdf($salt, $ikm, "Content-Encoding: nonce\x00", 12);

        $tag = '';
        $cipher = openssl_encrypt($plaintext."\x02", 'aes-128-gcm', $contentKey, OPENSSL_RAW_DATA, $nonce, $tag);

        return $salt.pack('N', 4096).chr(strlen($localPublicKey)).$localPublicKey.$cipher.$tag;
    }

    /**
     * RFC 8292: a short-lived token proving the notification comes from this server.
     */
    private function vapidToken(string $endpoint): string
    {
        $parts = parse_url($endpoint);
        $audience = $parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : '');

        $header = self::encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256'], JSON_UNESCAPED_SLASHES));
        $claims = self::encode(json_encode(['aud' => $audience, 'exp' => time() + 12 * 3600, 'sub' => $this->subject], JSON_UNESCAPED_SLASHES));
        $unsigned = $header.'.'.$claims;

        openssl_sign($unsigned, $derSignature, $this->privateKeyPem(), OPENSSL_ALGO_SHA256);

        return $unsigned.'.'.self::encode(self::derToRaw($derSignature));
    }

    private function privateKeyPem(): string
    {
        $d = self::decode((string) $this->privateKey);
        $public = self::decode((string) $this->publicKey);
        // SEC1 ECPrivateKey: version 1, the private value, the P-256 curve, the public point.
        $der = hex2bin('30770201010420').$d.hex2bin('a00a06082a8648ce3d030107a144034200').$public;

        return "-----BEGIN EC PRIVATE KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END EC PRIVATE KEY-----\n";
    }

    private static function publicKeyPem(string $rawPoint): string
    {
        $der = hex2bin(self::P256_PUBLIC_PREFIX).$rawPoint;

        return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END PUBLIC KEY-----\n";
    }

    private static function hkdf(string $salt, string $ikm, string $info, int $length): string
    {
        $prk = hash_hmac('sha256', $ikm, $salt, true);

        return substr(hash_hmac('sha256', $info."\x01", $prk, true), 0, $length);
    }

    /** OpenSSL signs in DER; JWT wants the two 32-byte numbers side by side. */
    private static function derToRaw(string $der): string
    {
        $offset = 2;
        $rLength = ord($der[$offset + 1]);
        $r = substr($der, $offset + 2, $rLength);
        $offset += 2 + $rLength;
        $sLength = ord($der[$offset + 1]);
        $s = substr($der, $offset + 2, $sLength);

        return self::pad(ltrim($r, "\x00")).self::pad(ltrim($s, "\x00"));
    }

    private static function pad(string $bytes): string
    {
        return str_pad($bytes, 32, "\x00", STR_PAD_LEFT);
    }

    public static function encode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    public static function decode(string $text): string
    {
        return (string) base64_decode(strtr($text, '-_', '+/').str_repeat('=', (4 - strlen($text) % 4) % 4));
    }
}
