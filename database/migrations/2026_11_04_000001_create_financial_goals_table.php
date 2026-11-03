<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Money targets the merchant sets for a day, a week and a month.
     */
    public function up(): void
    {
        Schema::create('financial_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained()->cascadeOnDelete();
            $table->string('period', 10);
            $table->string('metric', 10)->default('profit');
            $table->unsignedBigInteger('amount');
            $table->timestamps();

            $table->unique(['merchant_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_goals');
    }
};
