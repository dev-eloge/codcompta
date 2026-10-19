<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // The Google account a merchant linked to read its spreadsheets (tokens are encrypted by the model).
        Schema::create('google_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('google_email');
            $table->text('access_token');
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // One tab of a spreadsheet, with the meaning of its columns.
        Schema::create('sheet_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('country_id')->constrained()->cascadeOnDelete();
            $table->foreignId('default_agency_id')->nullable()->constrained('agencies')->nullOnDelete();
            $table->string('spreadsheet_id');
            $table->string('spreadsheet_title');
            $table->string('sheet_title');
            $table->unsignedInteger('header_row')->default(1);
            $table->json('columns');
            $table->boolean('auto_sync')->default(true);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['merchant_id', 'spreadsheet_id', 'sheet_title']);
        });

        // One reading of a tab: the proposed reports waiting for the merchant's check.
        Schema::create('sheet_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sheet_source_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('pending');
            $table->json('proposals')->nullable();
            $table->json('warnings')->nullable();
            $table->text('error')->nullable();
            $table->unsignedInteger('rows_read')->default(0);
            $table->timestamps();
        });

        // A sheet row gives totals, not products: a line can carry its own purchase cost.
        Schema::table('report_lines', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->change();
            $table->string('label')->nullable()->after('product_id');
            $table->unsignedInteger('purchase_cost')->nullable()->after('unit_cost_applied');
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->foreignId('sheet_source_id')->nullable()->after('raw_message_id')->constrained()->nullOnDelete();
            $table->string('sheet_row_key', 64)->nullable()->after('sheet_source_id')->index();
        });

        // Ad spend written on a sheet row belongs to that row's report, or stands alone on a pub-only row.
        Schema::table('ad_spends', function (Blueprint $table) {
            $table->foreignId('report_id')->nullable()->after('agency_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sheet_source_id')->nullable()->after('report_id')->constrained()->nullOnDelete();
            $table->string('sheet_row_key', 64)->nullable()->after('sheet_source_id')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ad_spends', function (Blueprint $table) {
            $table->dropIndex(['sheet_row_key']);
            $table->dropColumn('sheet_row_key');
            $table->dropConstrainedForeignId('sheet_source_id');
            $table->dropConstrainedForeignId('report_id');
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex(['sheet_row_key']);
            $table->dropColumn('sheet_row_key');
            $table->dropConstrainedForeignId('sheet_source_id');
        });

        Schema::table('report_lines', function (Blueprint $table) {
            $table->dropColumn(['label', 'purchase_cost']);
        });

        Schema::dropIfExists('sheet_imports');
        Schema::dropIfExists('sheet_sources');
        Schema::dropIfExists('google_connections');
    }
};
