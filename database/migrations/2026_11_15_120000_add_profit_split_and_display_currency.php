<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Each merchant can name and size the parts of the net profit (2 to 5 parts making 100 %),
     * and read the reports in euros or US dollars as well as in francs CFA.
     * Reports are still stored in francs CFA: only the display changes.
     */
    public function up(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            // Null keeps the 3 historical shares (share_savings, share_pocket, share_reinvestment).
            $table->json('profit_split')->nullable()->after('share_reinvestment');
            // Null, EUR or USD.
            $table->string('display_currency', 3)->nullable()->after('currency');
        });

        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->string('currency', 3);
            $table->date('rate_date');
            // Francs CFA for one unit of the currency.
            $table->decimal('rate', 12, 4);
            $table->string('source')->nullable();
            $table->timestamps();

            $table->unique(['currency', 'rate_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');

        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn(['profit_split', 'display_currency']);
        });
    }
};
