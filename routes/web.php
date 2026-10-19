<?php

use App\Http\Controllers\AdSpendController;
use App\Http\Controllers\RawMessageController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::redirect('dashboard', 'rapports')->name('dashboard');

    Route::get('rapports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('rapports/saisie', [ReportController::class, 'create'])->name('reports.create');
    Route::post('rapports', [ReportController::class, 'store'])->name('reports.store');

    Route::get('messages/coller', [RawMessageController::class, 'create'])->name('messages.create');
    Route::post('messages', [RawMessageController::class, 'store'])->name('messages.store');
    Route::get('messages/{message}', [RawMessageController::class, 'show'])->name('messages.show');
    Route::post('messages/{message}/relire', [RawMessageController::class, 'retry'])->name('messages.retry');

    Route::get('pub', [AdSpendController::class, 'index'])->name('ad-spends.index');
    Route::post('pub', [AdSpendController::class, 'store'])->name('ad-spends.store');

    Route::get('referentiel', [ReferenceController::class, 'index'])->name('reference.index');
    Route::post('referentiel/pays', [ReferenceController::class, 'storeCountry'])->name('reference.countries.store');
    Route::post('referentiel/agences', [ReferenceController::class, 'storeAgency'])->name('reference.agencies.store');
    Route::post('referentiel/produits', [ReferenceController::class, 'storeProduct'])->name('reference.products.store');
    Route::post('referentiel/produits/{product}/couts', [ReferenceController::class, 'storeProductCost'])->name('reference.products.costs.store');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
