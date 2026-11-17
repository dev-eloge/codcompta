<?php

namespace App\Console\Commands;

use App\Services\Push\ReportReminders;
use Illuminate\Console\Command;

class SendReportReminders extends Command
{
    /**
     * @var string
     */
    protected $signature = 'codcompta:rappels-rapport';

    /**
     * @var string
     */
    protected $description = 'Rappelle (notification Sika) de saisir le rapport du jour, à 12 h, 17 h et 20 h 30';

    public function handle(ReportReminders $reminders): int
    {
        $this->info($reminders->sendDue().' rappel(s) envoyé(s).');

        return self::SUCCESS;
    }
}
