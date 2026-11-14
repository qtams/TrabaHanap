<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Auth;

/**
 * A job found by the AI Job Finder (one row per source + external id). The posting is a public
 * listing, shared by everyone; what the signed-in user did with it (saved, AI results) is their
 * UserJob, shown here as saved_at, analysis, compatibility, resume_comparison, compared_resume_id.
 */
class JobPosting extends Model
{
    private const MINE = ['saved_at', 'analysis', 'compatibility', 'resume_comparison', 'compared_resume_id'];

    protected $fillable = [
        'source', 'external_id', 'title', 'company', 'company_logo', 'location', 'work_setup', 'employment_type',
        'experience_level', 'salary_text', 'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'description', 'tags',
        'url', 'source_url', 'posted_at', 'deadline', 'expires_at',
    ];

    protected $with = ['mine'];

    protected $hidden = ['mine'];

    protected $appends = self::MINE;

    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
            'deadline' => 'date:Y-m-d',
            'expires_at' => 'datetime',
        ];
    }

    public function searches(): BelongsToMany
    {
        return $this->belongsToMany(JobSearch::class);
    }

    /** The signed-in user's state for this job (UserJob is scoped to them). */
    public function mine(): HasOne
    {
        return $this->hasOne(UserJob::class);
    }

    /** Save the signed-in user's state for this job (saved, AI results) and return the posting. */
    public function remember(array $state): static
    {
        UserJob::updateOrCreate(['user_id' => Auth::id(), 'job_posting_id' => $this->id], $state);

        return $this->load('mine');
    }

    // The user's state, read as if it were part of the posting ($job->saved_at, and in JSON via $appends).
    protected function getSavedAtAttribute() { return $this->mine?->saved_at; }

    protected function getAnalysisAttribute() { return $this->mine?->analysis; }

    protected function getCompatibilityAttribute() { return $this->mine?->compatibility; }

    protected function getResumeComparisonAttribute() { return $this->mine?->resume_comparison; }

    protected function getComparedResumeIdAttribute() { return $this->mine?->compared_resume_id; }
}
