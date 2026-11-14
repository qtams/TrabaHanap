<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resumes', function (Blueprint $table) {
            $table->id();
            // Nullable until auth lands; then scope every query by the signed-in user.
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('title'); // version name, e.g. "React Developer Resume"

            // Uploaded file (null for AI-tailored versions, which have no file of their own).
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedInteger('file_size')->nullable();

            $table->json('data')->nullable();       // extracted info (ResumeAi::extract)
            $table->json('analysis')->nullable();   // AI review (ResumeAi::analyze)
            $table->timestamp('extracted_at')->nullable();
            $table->timestamp('analyzed_at')->nullable();

            // Set on AI-tailored versions.
            $table->foreignId('tailored_from_id')->nullable()->constrained('resumes')->nullOnDelete();
            $table->string('job_title')->nullable();
            $table->text('job_description')->nullable();
            $table->json('tailoring_notes')->nullable(); // what was changed and why

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resumes');
    }
};
