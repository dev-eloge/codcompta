<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReportRequest;
use App\Jobs\CheckGoals;
use App\Models\Agency;
use App\Models\Product;
use App\Models\RawMessage;
use App\Models\Report;
use App\Services\Parsing\ProductMatcher;
use App\Services\PeriodReport;
use App\Services\ReportPeriod;
use App\Services\ReportRecorder;
use App\Services\ResultsTrend;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /** Session key holding the country and dates last shown on the results page. */
    private const FILTERS_KEY = 'reports.filters';

    /**
     * Financial report of one country for a day, a week, a month (BF-16, BF-17) or any range of days.
     */
    public function index(Request $request, PeriodReport $periodReport, ResultsTrend $trend): Response
    {
        $merchant = $this->merchantOf($request);

        // The page remembers what the merchant last looked at: coming back from another page
        // shows the same country and dates, not today's week.
        $keys = ['country', 'period', 'date', 'du', 'au'];
        $fromSession = ! $request->hasAny($keys);
        $input = $fromSession ? (array) $request->session()->get(self::FILTERS_KEY, []) : $request->only($keys);

        $validator = Validator::make($input, [
            'country' => ['nullable', 'integer'],
            'period' => ['nullable', Rule::in(ReportPeriod::TYPES)],
            'date' => ['nullable', 'date'],
            'du' => ['nullable', 'required_if:period,'.ReportPeriod::CUSTOM, 'date'],
            'au' => ['nullable', 'required_if:period,'.ReportPeriod::CUSTOM, 'date', 'after_or_equal:du'],
        ], [
            'du.required_if' => 'Choisissez la date de début.',
            'au.required_if' => 'Choisissez la date de fin.',
            'au.after_or_equal' => 'La date de fin doit être après la date de début.',
        ]);

        if ($fromSession && $validator->fails()) {
            $request->session()->forget(self::FILTERS_KEY);
            $filters = [];
        } else {
            $filters = $validator->validate();
        }

        $countries = $merchant->countries()->orderBy('name')->get(['id', 'merchant_id', 'name', 'code']);

        $country = match (true) {
            ! isset($filters['country']) => $countries->first(),
            // A remembered country may have been deleted since: fall back to the first one.
            $fromSession => $countries->firstWhere('id', (int) $filters['country']) ?? $countries->first(),
            default => $merchant->countries()->findOrFail($filters['country']),
        };

        $period = ($filters['period'] ?? null) === ReportPeriod::CUSTOM
            ? ReportPeriod::between($filters['du'], $filters['au'])
            : ReportPeriod::containing(
                $filters['period'] ?? ReportPeriod::WEEK,
                $filters['date'] ?? now($merchant->timezone)->toDateString(),
            );

        if ($period->days() > ReportPeriod::MAX_CUSTOM_DAYS) {
            throw ValidationException::withMessages(['au' => 'Choisissez au plus un an entre les deux dates.']);
        }

        $request->session()->put(self::FILTERS_KEY, array_filter([
            'country' => $country?->id,
            'period' => $period->type,
            'date' => $period->type === ReportPeriod::CUSTOM ? null : $period->from->toDateString(),
            'du' => $period->type === ReportPeriod::CUSTOM ? $period->from->toDateString() : null,
            'au' => $period->type === ReportPeriod::CUSTOM ? $period->to->toDateString() : null,
        ]));

        $from = $period->from->toDateString();
        $to = $period->to->toDateString();

        $entries = $country === null ? collect() : Report::query()
            ->whereIn('agency_id', $country->agencies()->select('id'))
            ->endingBetween($from, $to)
            ->with(['agency:id,name', 'lines'])
            ->orderBy('period_end')
            ->orderBy('agency_id')
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'agency' => $report->agency->name,
                'period_start' => $report->period_start->toDateString(),
                'period_end' => $report->period_end->toDateString(),
                'delivered' => $report->deliveredQuantity(),
                'revenue' => $report->revenue(),
                'delivery_fees' => $report->delivery_fees,
                'announced_total' => $report->announced_total,
                'status' => $report->status,
                'source' => $report->source,
            ]);

        return Inertia::render('reports/index', [
            'countries' => $countries->map->only(['id', 'name', 'code'])->values(),
            'countryId' => $country?->id,
            'period' => [...$period->toArray(), 'is_current' => $period->type !== ReportPeriod::CUSTOM && $period->from->lessThanOrEqualTo(now($merchant->timezone)) && $period->to->greaterThanOrEqualTo(now($merchant->timezone)->startOfDay())],
            'report' => $country === null ? null : $periodReport->forCountry($country, $from, $to),
            'entries' => $entries,
            // Deferred: the page shows the results first, the small charts arrive right after.
            'trend' => Inertia::defer(fn () => $country === null ? null : $trend->forCountry($country, $period)),
        ]);
    }

    /**
     * Every report received, newest first, with filters: the history of the "Mes rapports" section.
     */
    public function history(Request $request): Response
    {
        $merchant = $this->merchantOf($request);

        $filters = $request->validate([
            'pays' => ['nullable', 'integer'],
            'agence' => ['nullable', 'integer'],
            'statut' => ['nullable', Rule::in([Report::STATUS_COUNTED, Report::STATUS_DETAIL, Report::STATUS_TO_VERIFY])],
            'source' => ['nullable', Rule::in([Report::SOURCE_MANUAL, Report::SOURCE_MESSAGE, Report::SOURCE_SHEET])],
            'du' => ['nullable', 'date'],
            'au' => ['nullable', 'date'],
        ]);

        $countries = $merchant->countries()->with(['agencies' => fn ($query) => $query->orderBy('name')])->orderBy('name')->get();
        $agencyIds = $countries->flatMap->agencies->pluck('id');

        $query = Report::query()
            ->whereIn('agency_id', $agencyIds)
            ->when($filters['pays'] ?? null, fn ($q, $country) => $q->whereIn('agency_id', $countries->firstWhere('id', (int) $country)?->agencies->pluck('id') ?? []))
            ->when($filters['agence'] ?? null, fn ($q, $agency) => $q->where('agency_id', (int) $agency))
            ->when($filters['statut'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['source'] ?? null, fn ($q, $source) => $q->where('source', $source))
            ->when($filters['du'] ?? null, fn ($q, $from) => $q->whereDate('period_end', '>=', $from))
            ->when($filters['au'] ?? null, fn ($q, $to) => $q->whereDate('period_end', '<=', $to));

        $page = (clone $query)
            ->with(['agency:id,name,country_id', 'agency.country:id,name', 'lines'])
            ->orderByDesc('period_end')
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Report $report) => [
                'id' => $report->id,
                'country' => $report->agency->country->name,
                'agency' => $report->agency->name,
                'period_start' => $report->period_start->toDateString(),
                'period_end' => $report->period_end->toDateString(),
                'delivered' => $report->deliveredQuantity(),
                'revenue' => $report->revenue(),
                'fees' => $report->delivery_fees + $report->closing_fees + $report->other_fees,
                'status' => $report->status,
                'source' => $report->source,
                'created_at' => $report->created_at?->toIso8601String(),
            ]);

        return Inertia::render('reports/history', [
            'reports' => $page,
            'filters' => [
                'pays' => $filters['pays'] ?? null,
                'agence' => $filters['agence'] ?? null,
                'statut' => $filters['statut'] ?? null,
                'source' => $filters['source'] ?? null,
                'du' => $filters['du'] ?? null,
                'au' => $filters['au'] ?? null,
            ],
            'countries' => $countries->map(fn ($country) => [
                'id' => $country->id,
                'name' => $country->name,
                'agencies' => $country->agencies->map->only(['id', 'name'])->values(),
            ]),
            'total' => $agencyIds->isEmpty() ? 0 : Report::whereIn('agency_id', $agencyIds)->count(),
        ]);
    }

    /**
     * Form to enter an agency report by hand (BF-07).
     */
    public function create(Request $request): Response
    {
        return Inertia::render('reports/create', $this->formProps($request));
    }

    public function edit(Request $request, Report $report): Response|RedirectResponse
    {
        $report->load('agency.country', 'lines');
        $this->ensureOwned($request, $report->agency->country->merchant_id);

        if ($report->source === Report::SOURCE_SHEET) {
            return back()->with('warning', 'Ce rapport a été importé d\'un Google Sheet : il ne peut pas être modifié. Supprimez-le et saisissez-le à nouveau pour le corriger.');
        }

        return Inertia::render('reports/create', [
            ...$this->formProps($request),
            'report' => [
                'id' => $report->id,
                'agency_id' => $report->agency_id,
                'period_start' => $report->period_start->toDateString(),
                'period_end' => $report->period_end->toDateString(),
                'status' => $report->status,
                'delivery_fees' => $report->delivery_fees,
                'closing_fees' => $report->closing_fees,
                'other_fees' => $report->other_fees,
                'announced_total' => $report->announced_total,
                'note' => $report->note,
                'lines' => $report->lines->map(fn ($line) => [
                    'product_id' => $line->product_id,
                    'quantity' => $line->quantity,
                    'amount' => $line->amount,
                ])->values(),
            ],
        ]);
    }

    public function update(StoreReportRequest $request, Report $report, ReportRecorder $recorder): RedirectResponse
    {
        $report->load('agency.country');
        $this->ensureOwned($request, $report->agency->country->merchant_id);

        $agency = Agency::findOrFail($request->integer('agency_id'));
        abort_unless($agency->id === $report->agency_id, 422, 'Un rapport ne peut pas changer d\'agence.');

        $report = $recorder->update($report, $request->validated(), $request->user());
        CheckGoals::dispatch($agency->country->merchant_id);

        return to_route('reports.index', [
            'country' => $agency->country_id,
            'period' => ReportPeriod::WEEK,
            'date' => $report->period_end->toDateString(),
        ])->with(
            $report->status === Report::STATUS_TO_VERIFY ? 'warning' : 'success',
            $report->status === Report::STATUS_TO_VERIFY
                ? 'Rapport modifié, marqué « à vérifier » : le total des lignes ne correspond pas au total annoncé.'
                : 'Rapport modifié.',
        );
    }

    public function destroy(Request $request, Report $report, ReportRecorder $recorder): RedirectResponse
    {
        $report->load('agency.country');
        $this->ensureOwned($request, $report->agency->country->merchant_id);

        $recorder->delete($report);
        CheckGoals::dispatch($report->agency->country->merchant_id);

        return back()->with('success', 'Rapport supprimé.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formProps(Request $request): array
    {
        $merchant = $this->merchantOf($request);
        $today = now($merchant->timezone)->toDateString();

        return [
            'agencies' => Agency::query()
                ->whereIn('country_id', $merchant->countries()->select('id'))
                ->with('country:id,name')
                ->orderBy('name')
                ->get()
                ->map(fn (Agency $agency) => [
                    'id' => $agency->id,
                    'name' => $agency->name,
                    'country' => $agency->country->name,
                ]),
            'products' => $merchant->products()
                ->orderBy('name')
                ->get()
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'unit_cost' => $product->costAt($today),
                    'reference_price' => $product->reference_price,
                ]),
            'today' => $today,
        ];
    }

    public function store(StoreReportRequest $request, ReportRecorder $recorder): RedirectResponse
    {
        $agency = Agency::findOrFail($request->integer('agency_id'));

        $fromMessage = $request->filled('raw_message_id');

        $report = $recorder->record($agency, [
            ...$request->validated(),
            'source' => $fromMessage ? Report::SOURCE_MESSAGE : Report::SOURCE_MANUAL,
        ], $request->user());
        CheckGoals::dispatch($agency->country->merchant_id);

        $message = $report->status === Report::STATUS_TO_VERIFY
            ? 'Rapport enregistré « à vérifier » : le total des lignes ne correspond pas au total annoncé par l\'agence.'
            : 'Rapport enregistré.';

        if ($fromMessage) {
            $rawMessage = RawMessage::findOrFail($request->integer('raw_message_id'));
            $matcher = new ProductMatcher($agency);

            foreach ($request->validated('lines') as $line) {
                if (filled($line['label'] ?? null)) {
                    $matcher->remember($line['label'], (int) $line['product_id']);
                }
            }

            if ($rawMessage->reports()->count() >= count($rawMessage->proposals())) {
                $rawMessage->update(['status' => RawMessage::STATUS_VALIDATED]);
            }

            return to_route('messages.show', $rawMessage)
                ->with($report->status === Report::STATUS_TO_VERIFY ? 'warning' : 'success', $message);
        }

        return to_route('reports.index', [
            'country' => $agency->country_id,
            'period' => ReportPeriod::WEEK,
            'date' => $report->period_end->toDateString(),
        ])->with($report->status === Report::STATUS_TO_VERIFY ? 'warning' : 'success', $message);
    }
}
