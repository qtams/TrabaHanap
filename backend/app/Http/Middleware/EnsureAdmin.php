<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Only admins pass (e.g. the Users module). */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only administrators can do this.');

        return $next($request);
    }
}
