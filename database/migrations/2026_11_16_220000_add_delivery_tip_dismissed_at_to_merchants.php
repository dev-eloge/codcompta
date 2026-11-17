<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mes rapports tells merchants who only declared agencies that they can declare their own
     * delivery team. Once they close the card, it does not come back, on any device.
     */
    public function up(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->timestamp('delivery_tip_dismissed_at')->nullable()->after('report_reminders');
        });
    }

    public function down(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn('delivery_tip_dismissed_at');
        });
    }
};
