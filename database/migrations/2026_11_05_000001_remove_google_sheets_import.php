<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The Google Sheets import is removed: its links, readings and stored Google tokens go away.
     * Reports and ad spends already imported stay, with their lines and amounts.
     */
    public function up(): void
    {
        Schema::table('ad_spends', function (Blueprint $table) {
            $table->dropIndex(['sheet_row_key']);
            $table->dropColumn('sheet_row_key');
            $table->dropConstrainedForeignId('sheet_source_id');
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex(['sheet_row_key']);
            $table->dropColumn('sheet_row_key');
            $table->dropConstrainedForeignId('sheet_source_id');
        });

        Schema::dropIfExists('sheet_imports');
        Schema::dropIfExists('sheet_sources');
        Schema::dropIfExists('google_connections');
    }

    /**
     * Brings back the empty structure (not the deleted links or tokens).
     */
    public function down(): void
    {
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

        Schema::table('reports', function (Blueprint $table) {
            $table->foreignId('sheet_source_id')->nullable()->after('raw_message_id')->constrained()->nullOnDelete();
            $table->string('sheet_row_key', 64)->nullable()->after('sheet_source_id')->index();
        });

        Schema::table('ad_spends', function (Blueprint $table) {
            $table->foreignId('sheet_source_id')->nullable()->after('report_id')->constrained()->nullOnDelete();
            $table->string('sheet_row_key', 64)->nullable()->after('sheet_source_id')->index();
        });
    }
};
