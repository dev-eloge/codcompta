<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phones and computers that accept Sika's notifications, and what each goal has already announced.
     */
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('endpoint');
            $table->char('endpoint_hash', 64)->unique();
            $table->string('public_key', 255);
            $table->string('auth_token', 255);
            $table->string('device', 120)->nullable();
            $table->timestamps();
        });

        Schema::table('financial_goals', function (Blueprint $table) {
            $table->timestamp('reached_notified_at')->nullable();
            $table->timestamp('missed_notified_at')->nullable();
        });

        // Goals that ended before notifications existed are not announced afterwards.
        DB::table('financial_goals')
            ->whereDate('ends_on', '<', now()->toDateString())
            ->update(['reached_notified_at' => now(), 'missed_notified_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->dropColumn(['reached_notified_at', 'missed_notified_at']);
        });

        Schema::dropIfExists('push_subscriptions');
    }
};
