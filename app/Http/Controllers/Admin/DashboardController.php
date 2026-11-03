<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\RawMessage;
use App\Models\Report;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform overview for the super admin: sign-ups, activity, AI usage.
 */
class DashboardController extends Controller
{
    use MerchantQueries;

    public function __invoke(): Response
    {
        $now = CarbonImmutable::now();
        $weekAgo = $now->subDays(7);
        $monthAgo = $now->subDays(30);

        $activeMerchantIds = Report::query()
            ->where('reports.created_at', '>=', $weekAgo)
            ->join('agencies', 'agencies.id', '=', 'reports.agency_id')
            ->join('countries', 'countries.id', '=', 'agencies.country_id')
            ->distinct()
            ->pluck('countries.merchant_id')
            ->merge(RawMessage::query()
                ->where('raw_messages.created_at', '>=', $weekAgo)
                ->join('agencies', 'agencies.id', '=', 'raw_messages.agency_id')
                ->join('countries', 'countries.id', '=', 'agencies.country_id')
                ->distinct()
                ->pluck('countries.merchant_id'))
            ->unique();

        $messages30 = RawMessage::where('created_at', '>=', $monthAgo);

        // Sign-ups of the last 8 weeks, oldest first (weeks start on Monday).
        $start = $now->startOfWeek()->subWeeks(7);
        $signups = Merchant::where('created_at', '>=', $start)->pluck('created_at');
        $weeks = collect(range(0, 7))->map(function (int $offset) use ($start, $signups) {
            $from = $start->addWeeks($offset);

            return [
                'week_start' => $from->toDateString(),
                'count' => $signups->filter(fn ($date) => $date >= $from && $date < $from->addWeek())->count(),
            ];
        });

        return Inertia::render('admin/dashboard', [
            'metrics' => [
                'merchants' => Merchant::count(),
                'new_7d' => Merchant::where('created_at', '>=', $weekAgo)->count(),
                'new_30d' => Merchant::where('created_at', '>=', $monthAgo)->count(),
                'active_7d' => $activeMerchantIds->count(),
                'suspended' => Merchant::whereNotNull('suspended_at')->count(),
                'reports_7d' => Report::where('created_at', '>=', $weekAgo)->count(),
                'messages_30d' => (clone $messages30)->count(),
                'messages_failed_30d' => (clone $messages30)->where('status', RawMessage::STATUS_FAILED)->count(),
                'ai_input_tokens_30d' => (int) (clone $messages30)->sum('ai_input_tokens'),
                'ai_output_tokens_30d' => (int) (clone $messages30)->sum('ai_output_tokens'),
                'google_sign_ins' => User::whereNotNull('google_id')->count(),
            ],
            'signupsByWeek' => $weeks,
            'recentMerchants' => $this->withActivity(Merchant::query()->select('merchants.*'))
                ->latest('merchants.created_at')
                ->limit(6)
                ->get()
                ->map(fn (Merchant $merchant) => $this->presentMerchant($merchant)),
        ]);
    }
}
