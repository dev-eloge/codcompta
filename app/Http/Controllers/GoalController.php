<?php

namespace App\Http\Controllers;

use App\Jobs\CheckGoals;
use App\Models\FinancialGoal;
use App\Services\GoalTracker;
use App\Services\Push\SikaNotifier;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The merchant's money targets, each between two dates of their choice.
 */
class GoalController extends Controller
{
    public function index(Request $request, GoalTracker $tracker): Response
    {
        $merchant = $this->merchantOf($request);

        return Inertia::render('goals/index', [
            'allGoals' => $tracker->all($merchant),
            'today' => CarbonImmutable::now($merchant->timezone)->toDateString(),
        ]);
    }

    public function store(Request $request, SikaNotifier $sika): RedirectResponse
    {
        $merchant = $this->merchantOf($request);

        $goal = $merchant->financialGoals()->create($this->validated($request));

        $sika->goalCreated($goal);
        CheckGoals::dispatch($merchant->id);

        return to_route('goals.index')->with('success', 'Objectif enregistré. Son avancement apparaît dans le menu et sur vos résultats.');
    }

    public function update(Request $request, FinancialGoal $goal): RedirectResponse
    {
        $this->ensureOwned($request, $goal->merchant_id);

        // A changed goal is announced again when it is reached or missed.
        $goal->update([...$this->validated($request), 'reached_notified_at' => null, 'missed_notified_at' => null]);
        CheckGoals::dispatch($goal->merchant_id);

        return to_route('goals.index')->with('success', 'Objectif modifié.');
    }

    public function destroy(Request $request, FinancialGoal $goal): RedirectResponse
    {
        $this->ensureOwned($request, $goal->merchant_id);

        $goal->delete();

        return to_route('goals.index')->with('success', 'Objectif supprimé.');
    }

    /**
     * @return array{title: string|null, metric: string, amount: int, starts_on: string, ends_on: string}
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:80'],
            'metric' => ['required', Rule::in(FinancialGoal::METRICS)],
            'amount' => ['required', 'integer', 'min:1', 'max:100000000000'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
        ], [
            'amount.required' => 'Indiquez le montant à atteindre.',
            'amount.integer' => 'Entrez un montant en nombre entier, sans espace ni lettre.',
            'amount.min' => 'L\'objectif doit être supérieur à 0.',
            'starts_on.required' => 'Choisissez le premier jour de l\'objectif.',
            'ends_on.required' => 'Choisissez le dernier jour de l\'objectif.',
            'ends_on.after_or_equal' => 'Le dernier jour doit être après le premier jour.',
            'title.max' => 'Le nom doit faire au plus 80 caractères.',
        ]);

        $days = CarbonImmutable::parse($data['starts_on'])->diffInDays(CarbonImmutable::parse($data['ends_on'])) + 1;

        if ($days > FinancialGoal::MAX_DAYS) {
            throw ValidationException::withMessages(['ends_on' => 'Un objectif dure au plus un an.']);
        }

        return [
            'title' => filled($data['title'] ?? null) ? trim($data['title']) : null,
            'metric' => $data['metric'],
            'amount' => (int) $data['amount'],
            'starts_on' => $data['starts_on'],
            'ends_on' => $data['ends_on'],
        ];
    }
}
