<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            // One profile per user; nullable until auth lands (then there is one shared profile).
            $table->foreignId('user_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $table->json('data'); // sections A-G, shape in Profile::BLANK
            // Last resume imported into the profile, to tell when a newer one should be synced.
            $table->foreignId('synced_resume_id')->nullable()->constrained('resumes')->nullOnDelete();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
