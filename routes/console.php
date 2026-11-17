<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sika: a goal can end without a new report, so its result is checked every hour.
Schedule::command('codcompta:verifier-objectifs')->hourly()->withoutOverlapping();

// Dollar rate, checked every 3 hours, for merchants who read their reports in dollars.
Schedule::command('codcompta:taux-dollar')->cron('10 */3 * * *')->withoutOverlapping();

// "No report today" reminders, at 12:00, 17:00 and 20:30 in each merchant's time zone.
Schedule::command('codcompta:rappels-rapport')->everyFifteenMinutes()->withoutOverlapping();
