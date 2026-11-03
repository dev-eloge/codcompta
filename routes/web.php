<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AdSpendController;
use App\Http\Controllers\Auth\GoogleSignIn;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\RawMessageController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'demoVideoUrl' => config('codcompta.demo_video_url'),
    ]);
})->name('home');

// "Continuer avec Google": Google sends the person back here after choosing an account.
Route::get('google/callback', [GoogleSignIn::class, 'callback'])->middleware('guest')->name('google.callback');
Route::get('auth/google', [GoogleSignIn::class, 'redirect'])->middleware('guest')->name('google.sign-in');

Route::middleware(['auth', 'merchant.active'])->group(function () {
    Route::redirect('dashboard', 'rapports')->name('dashboard');

    Route::get('rapports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('rapports/saisie', [ReportController::class, 'create'])->name('reports.create');
    Route::get('rapports/historique', [ReportController::class, 'history'])->name('reports.history');
    Route::post('rapports', [ReportController::class, 'store'])->name('reports.store');
    Route::get('rapports/{report}/modifier', [ReportController::class, 'edit'])->name('reports.edit');
    Route::put('rapports/{report}', [ReportController::class, 'update'])->name('reports.update');
    Route::delete('rapports/{report}', [ReportController::class, 'destroy'])->name('reports.destroy');

    Route::get('messages/coller', [RawMessageController::class, 'create'])->name('messages.create');
    Route::post('messages', [RawMessageController::class, 'store'])->name('messages.store');
    Route::get('messages/{message}', [RawMessageController::class, 'show'])->name('messages.show');
    Route::post('messages/{message}/relire', [RawMessageController::class, 'retry'])->name('messages.retry');
    Route::delete('messages/{message}', [RawMessageController::class, 'destroy'])->name('messages.destroy');

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

    Route::get('objectifs', [GoalController::class, 'index'])->name('goals.index');
    Route::post('objectifs', [GoalController::class, 'store'])->name('goals.store');
    Route::put('objectifs/{goal}', [GoalController::class, 'update'])->name('goals.update');
    Route::delete('objectifs/{goal}', [GoalController::class, 'destroy'])->name('goals.destroy');

    // Sika's notifications on this phone or computer.
    Route::post('notifications/abonnement', [PushSubscriptionController::class, 'store'])->middleware('throttle:20,1')->name('push.subscribe');
    Route::delete('notifications/abonnement', [PushSubscriptionController::class, 'destroy'])->name('push.unsubscribe');
    Route::post('notifications/essai', [PushSubscriptionController::class, 'test'])->middleware('throttle:5,1')->name('push.test');
});

// Platform owner area (super admin). Refused (403) to everyone else.
Route::middleware(['auth', 'can:access-admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', Admin\DashboardController::class)->name('dashboard');
    Route::get('commercants', [Admin\MerchantController::class, 'index'])->name('merchants.index');
    Route::get('commercants/{merchant}', [Admin\MerchantController::class, 'show'])->name('merchants.show');
    Route::post('commercants/{merchant}/suspendre', [Admin\MerchantController::class, 'suspend'])->name('merchants.suspend');
    Route::post('commercants/{merchant}/reactiver', [Admin\MerchantController::class, 'reactivate'])->name('merchants.reactivate');
    Route::post('commercants/{merchant}/consulter', [Admin\ImpersonationController::class, 'start'])->name('merchants.impersonate');
    Route::get('journal', Admin\AuditLogController::class)->name('journal');
});

// Ends a consultation: reachable while signed in as the merchant.
Route::post('admin/consultation/terminer', [Admin\ImpersonationController::class, 'stop'])->middleware('auth')->name('admin.impersonation.stop');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
