<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReportRequest;
use App\Models\Agency;
use App\Models\Product;
use App\Models\RawMessage;
use App\Models\Report;
use App\Models\SheetImport;
use App\Services\Parsing\ProductMatcher;
use App\Services\PeriodReport;
use App\Services\ReportPeriod;
use App\Services\ReportRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Financial report of one country for a day, a week or a month (BF-16, BF-17).
     */
    public function index(Request $request, PeriodReport $periodReport): Response
    {
        $merchant = $this->merchantOf($request);

        $filters = $request->validate([
            'country' => ['nullable', 'integer'],
            'period' => ['nullable', Rule::in(ReportPeriod::TYPES)],
            'date' => ['nullable', 'date'],
        ]);

        $countries = $merchant->countries()->orderBy('name')->get(['id', 'merchant_id', 'name', 'code']);

        $country = isset($filters['country'])
            ? $merchant->countries()->findOrFail($filters['country'])
            : $countries->first();

        $period = ReportPeriod::containing(
            $filters['period'] ?? ReportPeriod::WEEK,
            $filters['date'] ?? now($merchant->timezone)->toDateString(),
        );

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
            'period' => $period->toArray(),
            'report' => $country === null ? null : $periodReport->forCountry($country, $from, $to),
            'entries' => $entries,
            'sheetImportsToCheck' => SheetImport::query()
                ->whereIn('sheet_source_id', $merchant->sheetSources()->select('id'))
                ->where('status', SheetImport::STATUS_READY)
                ->latest('id')
                ->get(['id', 'sheet_source_id', 'proposals'])
                ->map(fn (SheetImport $import) => ['id' => $import->id, 'rows' => count($import->proposals ?? [])])
                ->values(),
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
            return back()->with('warning', 'Ce rapport vient de votre Google Sheet : corrigez la ligne dans le Sheet puis synchronisez-le.');
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
