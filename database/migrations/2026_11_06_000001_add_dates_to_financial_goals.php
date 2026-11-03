<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A goal now has its own name, first day and last day, instead of repeating every day, week or month.
     * Existing goals become goals for the current day, week or month.
     */
    public function up(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->string('title', 80)->nullable()->after('merchant_id');
            $table->date('starts_on')->nullable()->after('amount');
            $table->date('ends_on')->nullable()->after('starts_on');
            // The foreign key needs its own index before the old unique one can go.
            $table->index('merchant_id');
        });

        $today = CarbonImmutable::now('Africa/Lome')->startOfDay();

        foreach (DB::table('financial_goals')->get() as $goal) {
            [$start, $end, $title] = match ($goal->period) {
                'day' => [$today, $today, 'Objectif du '.$today->locale('fr')->translatedFormat('j F Y')],
                'week' => [$today->startOfWeek(), $today->endOfWeek()->startOfDay(), 'Objectif de la semaine'],
                default => [$today->startOfMonth(), $today->endOfMonth()->startOfDay(), $this->monthTitle($today)],
            };

            DB::table('financial_goals')->where('id', $goal->id)->update([
                'title' => $title,
                'starts_on' => $start->toDateString(),
                'ends_on' => $end->toDateString(),
            ]);
        }

        Schema::table('financial_goals', function (Blueprint $table) {
            $table->dropUnique(['merchant_id', 'period']);
            $table->dropColumn('period');
            $table->index(['merchant_id', 'ends_on']);
        });
    }

    /**
     * "Objectif de novembre 2026", "Objectif d'octobre 2026".
     */
    private function monthTitle(CarbonImmutable $day): string
    {
        $month = $day->locale('fr')->translatedFormat('F Y');

        return preg_match('/^[aeiouyàâéèêh]/iu', $month) ? "Objectif d'{$month}" : "Objectif de {$month}";
    }

    public function down(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->dropIndex(['merchant_id', 'ends_on']);
            $table->string('period', 10)->default('month')->after('merchant_id');
        });

        DB::table('financial_goals')->delete();

        Schema::table('financial_goals', function (Blueprint $table) {
            $table->dropColumn(['title', 'starts_on', 'ends_on']);
            $table->unique(['merchant_id', 'period']);
        });
    }
};
