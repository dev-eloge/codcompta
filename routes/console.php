<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sika: a goal can end without a new report, so its result is checked every hour.
Schedule::command('codcompta:verifier-objectifs')->hourly()->withoutOverlapping();
