<?php

namespace App\Services\JobSources;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Remotive public API (remote jobs). Terms: credit Remotive and link to the job's Remotive URL,
 * and call at most a few times a day. So the whole feed is fetched at most every 6 hours and
 * searched locally; the UI shows "via Remotive" with the original link on every Remotive job.
 */
class Remotive implements JobSource
{
    public function key(): string
    {
        return 'remotive';
    }

    public function name(): string
    {
        return 'Remotive';
    }

    public function note(): string
    {
        return 'Remote jobs worldwide. Listings are about a day old.';
    }

    public function fetch(array $params): array
    {
        // Cached already normalised, so searches don't re-convert ~1,500 descriptions each time.
        $jobs = Cache::remember('job-source:remotive', now()->addHours(6), function () {
            $raw = Http::timeout(30)->acceptJson()->get('https://remotive.com/api/remote-jobs')->throw()->json('jobs', []);

            return array_map(fn (array $j) => $this->map($j), $raw);
        });

        return ['jobs' => $jobs, 'notes' => []];
    }

    private function map(array $j): array
    {
        return Normalize::job([
            'source' => 'remotive',
            'external_id' => $j['id'],
            'title' => $j['title'] ?? '',
            'company' => $j['company_name'] ?? null,
            'company_logo' => $j['company_logo_url'] ?? $j['company_logo'] ?? null,
            'location' => $j['candidate_required_location'] ?? null,
            'work_setup' => 'remote',
            'employment_type' => in_array($j['job_type'] ?? '', ['full_time', 'part_time', 'contract', 'freelance', 'internship'], true) ? $j['job_type'] : null,
            'salary_text' => $j['salary'] ?? null,
            'description' => $j['description'] ?? '',
            'tags' => implode(', ', $j['tags'] ?? []),
            'url' => $j['url'],
            'posted_at' => $j['publication_date'] ?? null,
        ]);
    }
}
