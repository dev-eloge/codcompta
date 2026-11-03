<?php

namespace App\Http\Middleware;

use App\Services\GoalTracker;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return array_merge(parent::share($request), [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
                'isSuperAdmin' => (bool) $request->user()?->is_super_admin,
            ],
            // Progress towards the merchant's goals, shown in the sidebar and on the results page.
            'goals' => fn () => $request->user()?->merchant ? app(GoalTracker::class)->current($request->user()->merchant) : [],
            // Public key of Sika's notifications (null until the server owner sets the VAPID keys).
            'push' => ['publicKey' => config('services.webpush.public_key') ?: null],
            'impersonation' => fn () => $request->session()->has('impersonator_id')
                ? ['merchant' => $request->session()->get('impersonated_merchant')]
                : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
        ]);
    }
}
