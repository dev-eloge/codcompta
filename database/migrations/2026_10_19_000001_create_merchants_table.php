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
        Schema::create('merchants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('timezone')->default('Africa/Lome');
            $table->string('currency', 3)->default('XOF');
            $table->unsignedTinyInteger('share_savings')->default(40);
            $table->unsignedTinyInteger('share_pocket')->default(20);
            $table->unsignedTinyInteger('share_reinvestment')->default(40);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('merchant_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->string('role')->default('owner')->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('merchant_id');
            $table->dropColumn('role');
        });

        Schema::dropIfExists('merchants');
    }
};
