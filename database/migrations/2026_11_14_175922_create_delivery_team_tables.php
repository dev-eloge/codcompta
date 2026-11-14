<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A country can be delivered by an agency, by the merchant's own team, or both.
     *
     * The team is a special agency of the country ("Mon équipe"), so its daily reports work like the
     * others. Couriers and closers are paid per delivery, per order, per working day or by the month.
     * Monthly salaries and fixed costs leave the profit once per month, never the daily report.
     */
    public function up(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->string('delivery_mode')->default('agency')->after('currency');
            $table->unsignedInteger('bike_rent')->default(0)->after('delivery_mode');
            $table->unsignedInteger('phone_credit')->default(0)->after('bike_rent');
            $table->unsignedInteger('storage_rent')->default(0)->after('phone_credit');
        });

        Schema::table('agencies', function (Blueprint $table) {
            $table->boolean('is_own_team')->default(false)->after('name');
        });

        Schema::create('couriers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('pay_mode');
            $table->unsignedInteger('pay_amount')->default(0);
            $table->timestamps();
        });

        Schema::create('closers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('pay_mode');
            $table->unsignedInteger('pay_amount')->default(0);
            $table->timestamps();
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->unsignedInteger('fuel_fees')->default(0)->after('other_fees');
        });

        // What each team member did on the day of a report, and what it cost that day.
        Schema::create('report_team_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('courier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('closer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('count');
            $table->unsignedInteger('amount');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_team_entries');

        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('fuel_fees');
        });

        Schema::dropIfExists('closers');
        Schema::dropIfExists('couriers');

        Schema::table('agencies', function (Blueprint $table) {
            $table->dropColumn('is_own_team');
        });

        Schema::table('countries', function (Blueprint $table) {
            $table->dropColumn(['delivery_mode', 'bike_rent', 'phone_credit', 'storage_rent']);
        });
    }
};
