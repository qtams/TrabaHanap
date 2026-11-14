<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

/**
 * One user's own state for a job posting: saved, and their AI results (the posting itself is a
 * public listing, shared). Shown on the posting as saved_at, analysis, compatibility, resume_comparison.
 */
class UserJob extends Model
{
    use BelongsToUser;

    protected $fillable = ['user_id', 'job_posting_id', 'saved_at', 'analysis', 'compatibility', 'resume_comparison', 'compared_resume_id'];

    protected function casts(): array
    {
        return [
            'saved_at' => 'datetime',
            'analysis' => 'array',
            'compatibility' => 'array',
            'resume_comparison' => 'array',
        ];
    }
}
