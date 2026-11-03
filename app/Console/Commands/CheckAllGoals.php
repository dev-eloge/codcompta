<?php

namespace App\Console\Commands;

use App\Jobs\CheckGoals;
use App\Models\FinancialGoal;
use App\Models\Merchant;
use Illuminate\Console\Command;

/**
 * Runs every hour: a goal can end without any new report, Sika still has to say how it went.
 */
class CheckAllGoals extends Command
{
    /**
     * @var string
     */
    protected $signature = 'codcompta:verifier-objectifs';

    /**
     * @var string
     */
    protected $description = 'Prévient (notification Sika) des objectifs atteints ou terminés sans être atteints';

    public function handle(): int
    {
        $merchantIds = FinancialGoal::query()
            ->where(fn ($query) => $query->whereNull('reached_notified_at')->orWhereNull('missed_notified_at'))
            ->whereDate('ends_on', '>=', now()->subDays(8)->toDateString())
            ->distinct()
            ->pluck('merchant_id');

        Merchant::whereIn('id', $merchantIds)->pluck('id')->each(fn (int $id) => CheckGoals::dispatchSync($id));

        $this->info($merchantIds->count().' commerçant(s) vérifié(s).');

        return self::SUCCESS;
    }
}
