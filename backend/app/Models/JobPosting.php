<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** A job found by the AI Job Finder (one row per source + external id). */
class JobPosting extends Model
{
    protected $fillable = [
        'source', 'external_id', 'title', 'company', 'company_logo', 'location', 'work_setup', 'employment_type',
        'experience_level', 'salary_text', 'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'description', 'tags',
        'url', 'source_url', 'posted_at', 'deadline', 'expires_at', 'saved_at',
        'analysis', 'compatibility', 'resume_comparison', 'compared_resume_id',
    ];

    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
            'deadline' => 'date:Y-m-d',
            'saved_at' => 'datetime',
            'expires_at' => 'datetime',
            'analysis' => 'array',
            'compatibility' => 'array',
            'resume_comparison' => 'array',
        ];
    }

    public function searches(): BelongsToMany
    {
        return $this->belongsToMany(JobSearch::class);
    }
}
