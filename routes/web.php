<?php

use App\Http\Controllers\AdSpendController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\RawMessageController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SheetController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'demoVideoUrl' => config('codcompta.demo_video_url'),
    ]);
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::redirect('dashboard', 'rapports')->name('dashboard');

    Route::get('rapports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('rapports/saisie', [ReportController::class, 'create'])->name('reports.create');
    Route::post('rapports', [ReportController::class, 'store'])->name('reports.store');
    Route::get('rapports/{report}/modifier', [ReportController::class, 'edit'])->name('reports.edit');
    Route::put('rapports/{report}', [ReportController::class, 'update'])->name('reports.update');
    Route::delete('rapports/{report}', [ReportController::class, 'destroy'])->name('reports.destroy');

    Route::get('messages/coller', [RawMessageController::class, 'create'])->name('messages.create');
    Route::post('messages', [RawMessageController::class, 'store'])->name('messages.store');
    Route::get('messages/{message}', [RawMessageController::class, 'show'])->name('messages.show');
    Route::post('messages/{message}/relire', [RawMessageController::class, 'retry'])->name('messages.retry');
    Route::delete('messages/{message}', [RawMessageController::class, 'destroy'])->name('messages.destroy');

    Route::get('google/connecter', [GoogleController::class, 'redirect'])->name('google.redirect');
    Route::get('google/callback', [GoogleController::class, 'callback'])->name('google.callback');
    Route::delete('google', [GoogleController::class, 'disconnect'])->name('google.disconnect');

    Route::get('sheets', [SheetController::class, 'index'])->name('sheets.index');
    Route::get('sheets/relier', [SheetController::class, 'create'])->name('sheets.create');
    Route::post('sheets', [SheetController::class, 'store'])->name('sheets.store');
    Route::get('sheets/{source}/modifier', [SheetController::class, 'edit'])->name('sheets.edit');
    Route::put('sheets/{source}', [SheetController::class, 'update'])->name('sheets.update');
    Route::delete('sheets/{source}', [SheetController::class, 'destroy'])->name('sheets.destroy');
    Route::post('sheets/{source}/synchroniser', [SheetController::class, 'sync'])->name('sheets.sync');
    Route::get('sheets/lectures/{import}', [SheetController::class, 'showImport'])->name('sheets.imports.show');
    Route::post('sheets/lectures/{import}', [SheetController::class, 'confirmImport'])->name('sheets.imports.confirm');

    Route::get('pub', [AdSpendController::class, 'index'])->name('ad-spends.index');
    Route::post('pub', [AdSpendController::class, 'store'])->name('ad-spends.store');
    Route::put('pub/{adSpend}', [AdSpendController::class, 'update'])->name('ad-spends.update');
    Route::delete('pub/{adSpend}', [AdSpendController::class, 'destroy'])->name('ad-spends.destroy');

    Route::get('referentiel', [ReferenceController::class, 'index'])->name('reference.index');
    Route::post('referentiel/pays', [ReferenceController::class, 'storeCountry'])->name('reference.countries.store');
    Route::post('referentiel/agences', [ReferenceController::class, 'storeAgency'])->name('reference.agencies.store');
    Route::post('referentiel/produits', [ReferenceController::class, 'storeProduct'])->name('reference.products.store');
    Route::post('referentiel/produits/{product}/couts', [ReferenceController::class, 'storeProductCost'])->name('reference.products.costs.store');
    Route::delete('referentiel/produits/{product}/couts/{cost}', [ReferenceController::class, 'destroyProductCost'])->name('reference.products.costs.destroy');
    Route::put('referentiel/pays/{country}', [ReferenceController::class, 'updateCountry'])->name('reference.countries.update');
    Route::delete('referentiel/pays/{country}', [ReferenceController::class, 'destroyCountry'])->name('reference.countries.destroy');
    Route::put('referentiel/agences/{agency}', [ReferenceController::class, 'updateAgency'])->name('reference.agencies.update');
    Route::delete('referentiel/agences/{agency}', [ReferenceController::class, 'destroyAgency'])->name('reference.agencies.destroy');
    Route::put('referentiel/produits/{product}', [ReferenceController::class, 'updateProduct'])->name('reference.products.update');
    Route::delete('referentiel/produits/{product}', [ReferenceController::class, 'destroyProduct'])->name('reference.products.destroy');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
