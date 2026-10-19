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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->foreignId('raw_message_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedInteger('delivery_fees')->default(0);
            $table->unsignedInteger('closing_fees')->default(0);
            $table->unsignedInteger('other_fees')->default(0);
            $table->unsignedInteger('announced_total')->nullable();
            $table->string('status')->default('counted');
            $table->string('source')->default('manual');
            $table->text('note')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();

            $table->index(['agency_id', 'period_end']);
        });

        Schema::create('report_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('amount');
            $table->unsignedInteger('unit_cost_applied');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_lines');
        Schema::dropIfExists('reports');
    }
};
