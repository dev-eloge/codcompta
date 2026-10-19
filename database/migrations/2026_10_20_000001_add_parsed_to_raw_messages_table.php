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
        Schema::table('raw_messages', function (Blueprint $table) {
            $table->string('body_hash', 64)->nullable()->after('body');
            $table->json('parsed')->nullable()->after('status');
            $table->timestamp('parsed_at')->nullable()->after('parsed');

            $table->index('body_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('raw_messages', function (Blueprint $table) {
            $table->dropIndex(['body_hash']);
            $table->dropColumn(['body_hash', 'parsed', 'parsed_at']);
        });
    }
};
