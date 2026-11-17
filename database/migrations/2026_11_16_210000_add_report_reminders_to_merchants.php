<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sika reminds the merchant, up to 3 times a day, when no report was typed that day. On by default.
     */
    public function up(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->boolean('report_reminders')->default(true)->after('custom_rates');
        });
    }

    public function down(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn('report_reminders');
        });
    }
};
