<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A merchant can set their own rate for the euro or the dollar, for example the rate of their
     * money changer. Null, or a missing currency, keeps the automatic rate.
     */
    public function up(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            // {"EUR": 650, "USD": 600}: francs CFA for one unit.
            $table->json('custom_rates')->nullable()->after('display_currency');
        });
    }

    public function down(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn('custom_rates');
        });
    }
};
