<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            // url = where to apply; source_url = the listing on the source site (credited in the UI).
            $table->string('source_url', 1000)->nullable()->after('url');
            // When the source takes the listing down; expired jobs are deleted (Himalayas terms).
            $table->timestamp('expires_at')->nullable()->after('deadline');
            // salary_min/max hold a monthly estimate; this is the period the source stated.
            $table->string('salary_period')->nullable()->after('salary_currency');
        });
    }

    public function down(): void
    {
        Schema::table('job_postings', function (Blueprint $table) {
            $table->dropColumn(['source_url', 'expires_at', 'salary_period']);
        });
    }
};
