<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Jobs found by the AI Job Finder. Named job_postings because Laravel's queue owns "jobs".
        Schema::create('job_postings', function (Blueprint $table) {
            $table->id();
            $table->string('source');      // remotive | greenhouse | lever (App\Services\JobSources)
            $table->string('external_id'); // the job's id at the source
            $table->string('title');
            $table->string('company');
            $table->string('company_logo')->nullable();
            $table->string('location')->nullable();
            $table->string('work_setup')->nullable();       // remote | hybrid | onsite
            $table->string('employment_type')->nullable();  // full_time | part_time | contract | freelance | internship
            $table->string('experience_level')->nullable(); // entry | junior | mid | senior | lead (guessed from the title)
            $table->string('salary_text')->nullable();      // as the source states it
            $table->unsignedInteger('salary_min')->nullable();
            $table->unsignedInteger('salary_max')->nullable();
            $table->string('salary_currency', 3)->nullable();
            $table->longText('description');                // plain text
            $table->text('tags')->nullable();               // comma-separated, from the source
            $table->string('url', 1000);                    // original posting
            $table->timestamp('posted_at')->nullable();
            $table->date('deadline')->nullable();
            $table->timestamp('saved_at')->nullable();

            // AI results (JobAi)
            $table->json('analysis')->nullable();
            $table->json('compatibility')->nullable();
            $table->json('resume_comparison')->nullable();
            $table->foreignId('compared_resume_id')->nullable()->constrained('resumes')->nullOnDelete();

            $table->timestamps();
            $table->unique(['source', 'external_id']);
        });

        Schema::create('job_searches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete(); // until auth lands
            $table->json('params');
            $table->unsignedInteger('results_count')->default(0);
            $table->string('name')->nullable(); // set = a saved search
            $table->timestamps();
        });

        // Which jobs each search discovered.
        Schema::create('job_posting_job_search', function (Blueprint $table) {
            $table->foreignId('job_posting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_search_id')->constrained()->cascadeOnDelete();
            $table->primary(['job_posting_id', 'job_search_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_posting_job_search');
        Schema::dropIfExists('job_searches');
        Schema::dropIfExists('job_postings');
    }
};
