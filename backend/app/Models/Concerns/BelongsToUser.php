<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Rows that belong to one account (resumes, profile, search history). While someone is signed in,
 * every query only sees their rows (so another user's id in a URL is a 404) and new rows are theirs.
 * Outside a request (console, seeders) there is no filter.
 */
trait BelongsToUser
{
    public static function bootBelongsToUser(): void
    {
        static::addGlobalScope('owner', function (Builder $query) {
            if (Auth::hasUser()) {
                $query->where($query->qualifyColumn('user_id'), Auth::id());
            }
        });

        static::creating(function ($model) {
            if (! $model->user_id && Auth::hasUser()) {
                $model->user_id = Auth::id();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
