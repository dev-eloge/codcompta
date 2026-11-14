<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * An ad spend now belongs to a product and says where the ad ran.
     *
     * Old rows keep no product ("Pub sans produit") and stay valid. The "meta" platform becomes
     * "facebook". The amount stays the total paid, so every existing sum keeps working.
     * Deleting a report no longer deletes its ad: another agency's report may share it.
     */
    public function up(): void
    {
        Schema::table('ad_spends', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('report_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('facebook_amount')->nullable()->after('amount');
            $table->unsignedInteger('tiktok_amount')->nullable()->after('facebook_amount');
            $table->unsignedInteger('orders_received')->nullable()->after('platform');
            $table->string('platform')->nullable()->default(null)->change();

            $table->dropForeign(['report_id']);
            $table->foreign('report_id')->references('id')->on('reports')->nullOnDelete();

            $table->index(['country_id', 'product_id', 'period_end']);
        });

        DB::table('ad_spends')->where('platform', 'meta')->update(['platform' => 'facebook']);
    }

    /**
     * Back to the old shape. The Facebook/TikTok split and the orders received are lost.
     */
    public function down(): void
    {
        DB::table('ad_spends')->where('platform', 'facebook')->update(['platform' => 'meta']);
        DB::table('ad_spends')->where('platform', 'facebook_tiktok')->update(['platform' => 'autre']);
        DB::table('ad_spends')->whereNull('platform')->update(['platform' => 'meta']);

        Schema::table('ad_spends', function (Blueprint $table) {
            $table->dropIndex(['country_id', 'product_id', 'period_end']);

            $table->dropForeign(['report_id']);
            $table->foreign('report_id')->references('id')->on('reports')->cascadeOnDelete();

            $table->string('platform')->default('meta')->nullable(false)->change();
            $table->dropColumn(['facebook_amount', 'tiktok_amount', 'orders_received']);
            $table->dropConstrainedForeignId('product_id');
        });
    }
};
