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
        // The platform owner: sees every merchant, can suspend one and open its account for support.
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_super_admin')->default(false)->after('role');
        });

        Schema::table('merchants', function (Blueprint $table) {
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspension_reason')->nullable();
        });

        // Claude usage per pasted message, to follow the API cost.
        Schema::table('raw_messages', function (Blueprint $table) {
            $table->unsignedInteger('ai_input_tokens')->nullable()->after('parsed_at');
            $table->unsignedInteger('ai_output_tokens')->nullable()->after('ai_input_tokens');
        });

        // Every super admin action on a merchant: suspensions, account consultations.
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('merchant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->json('details')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['merchant_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_audit_logs');

        Schema::table('raw_messages', function (Blueprint $table) {
            $table->dropColumn(['ai_input_tokens', 'ai_output_tokens']);
        });

        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn(['suspended_at', 'suspension_reason']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_super_admin');
        });
    }
};
