<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRawMessageRequest;
use App\Jobs\ParseRawMessage;
use App\Models\Agency;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\RawMessage;
use App\Models\Report;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Paste an agency message, let it be read, then check and record the proposed reports (BF-08, BF-09).
 */
class RawMessageController extends Controller
{
    public function create(Request $request): Response
    {
        $merchant = $this->merchantOf($request);

        return Inertia::render('messages/create', [
            'agencies' => $this->agenciesOf($merchant)->map(fn (Agency $agency) => [
                'id' => $agency->id,
                'name' => $agency->name,
                'country' => $agency->country->name,
            ]),
            'recent' => RawMessage::query()
                ->whereIn('agency_id', $this->agenciesOf($merchant)->pluck('id'))
                ->with('agency:id,name')
                ->withCount('reports')
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (RawMessage $message) => [
                    'id' => $message->id,
                    'agency' => $message->agency->name,
                    'status' => $message->status,
                    'excerpt' => mb_strimwidth(preg_replace('/\s+/u', ' ', $message->body), 0, 90, '…'),
                    'received_at' => $message->created_at->toIso8601String(),
                    'proposals' => count($message->proposals()),
                    'recorded' => $message->reports_count,
                ]),
            'parserReady' => filled(config('services.anthropic.key')),
        ]);
    }

    public function store(StoreRawMessageRequest $request): RedirectResponse
    {
        $merchant = $this->merchantOf($request);
        $agency = Agency::findOrFail($request->integer('agency_id'));
        $body = trim($request->string('body'));
        $hash = RawMessage::hashBody($body);

        $duplicate = RawMessage::query()
            ->where('agency_id', $agency->id)
            ->where('body_hash', $hash)
            ->latest()
            ->first();

        if ($duplicate !== null) {
            return to_route('messages.show', $duplicate)
                ->with('warning', 'Ce message a déjà été collé le '.$duplicate->created_at->timezone($merchant->timezone)->translatedFormat('j F à H\hi').' : voici sa lecture.');
        }

        $message = $agency->rawMessages()->create([
            'user_id' => $request->user()->id,
            'body' => $body,
            'body_hash' => $hash,
            'status' => RawMessage::STATUS_RECEIVED,
            'received_at' => now(),
        ]);

        ParseRawMessage::dispatch($message);

        return to_route('messages.show', $message);
    }

    public function show(Request $request, RawMessage $message): Response
    {
        $merchant = $this->merchantOf($request);
        $message->load('agency.country');

        abort_unless($message->agency->country->merchant_id === $merchant->id, 404);

        $agency = $message->agency;
        $recorded = $message->reports()->get();

        return Inertia::render('messages/show', [
            'message' => [
                'id' => $message->id,
                'body' => $message->body,
                'status' => $message->status,
                'error' => $message->error,
                'received_at' => ($message->received_at ?? $message->created_at)->toIso8601String(),
                'agency' => ['id' => $agency->id, 'name' => $agency->name, 'country' => $agency->country->name],
            ],
            'warnings' => $message->parsed['warnings'] ?? [],
            'proposals' => collect($message->proposals())
                ->map(fn (array $proposal, int $index) => $this->presentProposal($proposal, $index, $agency, $recorded->all()))
                ->values(),
            'products' => $merchant->products()
                ->orderBy('name')
                ->get()
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'unit_cost' => $product->costAt(now($merchant->timezone)->toDateString()),
                ]),
        ]);
    }

    public function retry(Request $request, RawMessage $message): RedirectResponse
    {
        $merchant = $this->merchantOf($request);
        $message->load('agency.country');

        abort_unless($message->agency->country->merchant_id === $merchant->id, 404);

        $message->update(['status' => RawMessage::STATUS_RECEIVED, 'error' => null]);

        ParseRawMessage::dispatch($message);

        return to_route('messages.show', $message);
    }

    /**
     * @param  array<string, mixed>  $proposal
     * @param  list<Report>  $recorded
     * @return array<string, mixed>
     */
    private function presentProposal(array $proposal, int $index, Agency $agency, array $recorded): array
    {
        $report = collect($recorded)->first(
            fn (Report $report) => $report->period_start->toDateString() === $proposal['period_start']
                && $report->period_end->toDateString() === $proposal['period_end'],
        );

        $warnings = $proposal['warnings'] ?? [];
        $status = $proposal['suggested_status'] ?? Report::STATUS_COUNTED;

        if ($report === null && $status === Report::STATUS_COUNTED) {
            $alreadyCounted = $agency->reports()
                ->counted()
                ->whereDate('period_start', '<=', $proposal['period_end'])
                ->whereDate('period_end', '>=', $proposal['period_start'])
                ->exists();

            if ($alreadyCounted) {
                $status = Report::STATUS_DETAIL;
                $warnings[] = 'Ces jours sont déjà comptés pour cette agence : le rapport est proposé en « Détail ».';
            }
        }

        return [
            ...$proposal,
            'index' => $index,
            'suggested_status' => $status,
            'warnings' => $warnings,
            'recorded' => $report === null ? null : [
                'id' => $report->id,
                'status' => $report->status,
                'revenue' => $report->revenue(),
            ],
        ];
    }

    /**
     * @return Collection<int, Agency>
     */
    private function agenciesOf(Merchant $merchant)
    {
        return Agency::query()
            ->whereIn('country_id', $merchant->countries()->select('id'))
            ->with('country:id,name')
            ->orderBy('name')
            ->get();
    }
}
