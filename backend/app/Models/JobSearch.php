<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** One run of the AI Job Finder: what was searched, when, and what it found. Saved when it has a name. */
class JobSearch extends Model
{
    use BelongsToUser;

    protected $fillable = ['user_id', 'params', 'results_count', 'name'];

    protected function casts(): array
    {
        return ['params' => 'array'];
    }

    public function jobs(): BelongsToMany
    {
        return $this->belongsToMany(JobPosting::class);
    }
}
