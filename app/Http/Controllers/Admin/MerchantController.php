<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Agency;
use App\Models\Country;
use App\Models\Merchant;
use App\Models\Report;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Merchants of the platform: list, detail, suspension.
 */
class MerchantController extends Controller
{
    use MerchantQueries;

    public const STATUSES = ['tous', 'actifs', 'suspendus'];

    public const SORTS = ['recents', 'activite', 'nom'];

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'statut' => ['nullable', Rule::in(self::STATUSES)],
            'tri' => ['nullable', Rule::in(self::SORTS)],
        ]);

        $search = trim($filters['q'] ?? '');
        $status = $filters['statut'] ?? 'tous';
        $sort = $filters['tri'] ?? 'recents';

        $query = $this->withActivity(Merchant::query()->select('merchants.*'))
            ->when($search !== '', fn ($query) => $query->where(fn ($inner) => $inner
                ->where('merchants.name', 'like', "%{$search}%")
                ->orWhereHas('users', fn ($users) => $users->where('email', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"))))
            ->when($status === 'actifs', fn ($query) => $query->whereNull('suspended_at'))
            ->when($status === 'suspendus', fn ($query) => $query->whereNotNull('suspended_at'));

        match ($sort) {
            'nom' => $query->orderBy('merchants.name'),
            'activite' => $query->orderByDesc('last_report_at')->orderByDesc('merchants.created_at'),
            default => $query->latest('merchants.created_at'),
        };

        $page = $query->paginate(20)->withQueryString();

        return Inertia::render('admin/merchants/index', [
            'merchants' => $page->through(fn (Merchant $merchant) => $this->presentMerchant($merchant)),
            'filters' => ['q' => $search, 'statut' => $status, 'tri' => $sort],
            'counts' => [
                'tous' => Merchant::count(),
                'actifs' => Merchant::whereNull('suspended_at')->count(),
                'suspendus' => Merchant::whereNotNull('suspended_at')->count(),
            ],
        ]);
    }

    public function show(Merchant $merchant): Response
    {
        $merchant = $this->withActivity(Merchant::query()->select('merchants.*'))->findOrFail($merchant->id);
        $merchant->load(['countries' => fn ($query) => $query->withCount('adSpends')->with(['agencies' => fn ($agencies) => $agencies->withCount('reports')])]);

        return Inertia::render('admin/merchants/show', [
            'merchant' => [
                ...$this->presentMerchant($merchant),
                'timezone' => $merchant->timezone,
                'currency' => $merchant->currency,
                'users' => $merchant->users->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'google' => $user->google_id !== null,
                    'is_super_admin' => $user->is_super_admin,
                    'created_at' => $user->created_at?->toIso8601String(),
                ]),
                'countries' => $merchant->countries->map(fn (Country $country) => [
                    'id' => $country->id,
                    'name' => $country->name,
                    'agencies' => $country->agencies->map(fn (Agency $agency) => [
                        'name' => $agency->name,
                        'reports_count' => $agency->reports_count,
                        'last_report_at' => $agency->last_report_at?->toDateString(),
                    ]),
                ]),
                'products_count' => $merchant->products()->count(),
                'messages_count' => $merchant->rawMessagesQuery()->count(),
            ],
            'recentReports' => Report::query()
                ->whereIn('agency_id', Agency::whereIn('country_id', $merchant->countries->pluck('id'))->select('id'))
                ->with(['agency:id,name', 'lines'])
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (Report $report) => [
                    'id' => $report->id,
                    'agency' => $report->agency->name,
                    'period_start' => $report->period_start->toDateString(),
                    'period_end' => $report->period_end->toDateString(),
                    'revenue' => $report->revenue(),
                    'source' => $report->source,
                    'status' => $report->status,
                    'created_at' => $report->created_at?->toIso8601String(),
                ]),
            'auditLogs' => AdminAuditLog::where('merchant_id', $merchant->id)
                ->with('admin:id,name')
                ->latest('created_at')
                ->limit(10)
                ->get()
                ->map(fn (AdminAuditLog $log) => [
                    'id' => $log->id,
                    'label' => $log->label(),
                    'admin' => $log->admin?->name,
                    'reason' => $log->details['reason'] ?? null,
                    'created_at' => $log->created_at?->toIso8601String(),
                ]),
        ]);
    }

    public function suspend(Request $request, Merchant $merchant): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:255'],
        ], [
            'reason.required' => 'Indiquez la raison de la suspension : elle reste dans le journal.',
            'reason.min' => 'Donnez une raison un peu plus précise.',
        ]);

        if ($merchant->users()->where('is_super_admin', true)->exists()) {
            return back()->with('warning', 'Un compte super admin ne peut pas être suspendu.');
        }

        $merchant->update(['suspended_at' => now(), 'suspension_reason' => $data['reason']]);
        AdminAuditLog::record($request, $request->user(), AdminAuditLog::SUSPENDED, $merchant, ['reason' => $data['reason']]);

        return back()->with('success', "« {$merchant->name} » est suspendu : ses utilisateurs ne peuvent plus se connecter.");
    }

    public function reactivate(Request $request, Merchant $merchant): RedirectResponse
    {
        $merchant->update(['suspended_at' => null, 'suspension_reason' => null]);
        AdminAuditLog::record($request, $request->user(), AdminAuditLog::REACTIVATED, $merchant);

        return back()->with('success', "« {$merchant->name} » est réactivé.");
    }
}
