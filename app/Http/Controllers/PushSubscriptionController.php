<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Services\Push\WebPush;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Turns Sika's notifications on or off for the browser the user is on.
 */
class PushSubscriptionController extends Controller
{
    /**
     * Push services of the browsers we support. Any other address is refused, so the server
     * never posts to a host chosen by someone else.
     *
     * @var list<string>
     */
    private const PUSH_HOSTS = [
        'fcm.googleapis.com',
        'android.googleapis.com',
        'updates.push.services.mozilla.com',
        'push.services.mozilla.com',
        'web.push.apple.com',
        'push.apple.com',
        'notify.windows.com',
    ];

    public function store(Request $request, WebPush $webPush): JsonResponse
    {
        abort_unless($webPush->isConfigured(), 503, 'Les notifications ne sont pas encore activées sur ce serveur.');

        $data = $request->validate([
            'endpoint' => ['required', 'url:https', 'max:1000'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'device' => ['nullable', 'string', 'max:120'],
        ]);

        if (! self::isPushService($data['endpoint'])) {
            throw ValidationException::withMessages(['endpoint' => 'Ce navigateur n\'est pas pris en charge pour les notifications.']);
        }

        PushSubscription::updateOrCreate(
            ['endpoint_hash' => PushSubscription::hashOf($data['endpoint'])],
            [
                'user_id' => $request->user()->id,
                'endpoint' => $data['endpoint'],
                'public_key' => $data['keys']['p256dh'],
                'auth_token' => $data['keys']['auth'],
                'device' => $data['device'] ?? null,
            ],
        );

        return response()->json(['subscribed' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['endpoint' => ['required', 'string', 'max:1000']]);

        $request->user()->pushSubscriptions()
            ->where('endpoint_hash', PushSubscription::hashOf($data['endpoint']))
            ->delete();

        return response()->json(['subscribed' => false]);
    }

    /**
     * Sends a hello from Sika to the user's own devices, to check that everything works.
     */
    public function test(Request $request, WebPush $webPush): JsonResponse
    {
        $sent = 0;

        foreach ($request->user()->pushSubscriptions as $subscription) {
            $sent += $webPush->send($subscription, [
                'title' => 'Sika est prêt 👋',
                'body' => 'C\'est ici que je vous dirai quand un objectif est noté, atteint ou manqué.',
                'url' => route('goals.index', absolute: false),
                'tag' => 'sika-test',
            ]) ? 1 : 0;
        }

        return response()->json(['sent' => $sent]);
    }

    private static function isPushService(string $endpoint): bool
    {
        $host = strtolower((string) parse_url($endpoint, PHP_URL_HOST));

        foreach (self::PUSH_HOSTS as $allowed) {
            if ($host === $allowed || str_ends_with($host, '.'.$allowed)) {
                return true;
            }
        }

        return false;
    }
}
