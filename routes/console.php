<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Each morning, linked Google Sheets are read again; new rows wait in "Sheets" for the merchant's check.
Schedule::command('sheets:sync')->dailyAt('06:00')->timezone('Africa/Lome')->withoutOverlapping();
