<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Alerts of Mes rapports the merchant closed with the cross. Each key names one situation
     * (an agency silent since a given day, one message, a number of reports to check): when the
     * situation changes, the key changes and the alert comes back.
     */
    public function up(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->json('dismissed_alerts')->nullable()->after('delivery_tip_dismissed_at');
        });
    }

    public function down(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn('dismissed_alerts');
        });
    }
};
