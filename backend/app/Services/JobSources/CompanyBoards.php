<?php

namespace App\Services\JobSources;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Shared logic for company career sites hosted on an applicant-tracking system's public job-board API.
 * Which boards are read: the "Company" search field (as a board name), plus the boards listed in
 * JOB_BOARDS in .env (e.g. "greenhouse:gitlab,lever:palantir").
 */
abstract class CompanyBoards implements JobSource
{
    /** Raw jobs for one board, or null when the board doesn't exist. */
    abstract protected function board(string $slug): ?array;

    /** One raw job → the array Normalize::job() takes. */
    abstract protected function map(array $job, string $slug): array;

    public function fetch(array $params): array
    {
        $slugs = $this->configuredBoards();
        if ($company = trim($params['company'] ?? '')) {
            $slugs[] = Str::of($company)->lower()->replaceMatches('/[^a-z0-9]+/', '')->toString();
        }
        $slugs = array_values(array_unique(array_filter($slugs)));

        $jobs = [];
        $notes = [];
        foreach ($slugs as $slug) {
            $raw = Cache::remember("job-source:{$this->key()}:{$slug}", now()->addHour(), fn () => $this->board($slug) ?? false);
            if ($raw === false) {
                $notes[] = "{$this->name()}: no public job board named \"{$slug}\".";
                continue;
            }
            foreach ($raw as $job) {
                $jobs[] = Normalize::job($this->map($job, $slug));
            }
        }

        return ['jobs' => $jobs, 'notes' => $notes];
    }

    /** Boards from JOB_BOARDS for this source. */
    private function configuredBoards(): array
    {
        return collect(explode(',', (string) config('services.job_boards')))
            ->map(fn ($entry) => explode(':', trim($entry), 2))
            ->filter(fn ($parts) => count($parts) === 2 && $parts[0] === $this->key())
            ->map(fn ($parts) => strtolower(trim($parts[1])))
            ->values()->all();
    }

    protected function get(string $url): ?array
    {
        $response = Http::timeout(30)->acceptJson()->get($url);
        if ($response->notFound()) {
            return null;
        }

        return $response->throw()->json();
    }
}
