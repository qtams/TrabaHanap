<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every account gets its own data. Resumes, the profile and search history already have user_id;
 * what a user does with a job (saved, AI results) moves from job_postings to user_jobs, so postings
 * stay shared public listings. Data from before accounts goes to the first admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_posting_id')->constrained()->cascadeOnDelete();
            $table->timestamp('saved_at')->nullable();
            $table->json('analysis')->nullable();
            $table->json('compatibility')->nullable();
            $table->json('resume_comparison')->nullable();
            $table->foreignId('compared_resume_id')->nullable()->constrained('resumes')->nullOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'job_posting_id']);
        });

        $owner = DB::table('users')->where('role', 'admin')->orderBy('id')->value('id');
        if ($owner) {
            foreach (['resumes', 'profiles', 'job_searches'] as $table) {
                DB::table($table)->whereNull('user_id')->update(['user_id' => $owner]);
            }
            DB::table('job_postings')
                ->where(fn ($q) => $q->whereNotNull('saved_at')->orWhereNotNull('analysis')->orWhereNotNull('compatibility')->orWhereNotNull('resume_comparison'))
                ->orderBy('id')
                ->each(fn ($job) => DB::table('user_jobs')->insert([
                    'user_id' => $owner, 'job_posting_id' => $job->id, 'saved_at' => $job->saved_at,
                    'analysis' => $job->analysis, 'compatibility' => $job->compatibility, 'resume_comparison' => $job->resume_comparison,
                    'compared_resume_id' => $job->compared_resume_id, 'created_at' => now(), 'updated_at' => now(),
                ]));
        }

        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('compared_resume_id');
            $table->dropColumn(['saved_at', 'analysis', 'compatibility', 'resume_comparison']);
        });
    }

    public function down(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->timestamp('saved_at')->nullable();
            $table->json('analysis')->nullable();
            $table->json('compatibility')->nullable();
            $table->json('resume_comparison')->nullable();
            $table->foreignId('compared_resume_id')->nullable()->constrained('resumes')->nullOnDelete();
        });
        Schema::dropIfExists('user_jobs');
    }
};
