<?php

namespace App\Services\JobSources;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Himalayas public jobs API (remote jobs, searchable by country). Free, no key.
 * Terms (himalayas.app/api): Apply buttons use applicationLink unchanged; credit Himalayas with a visible
 * link; show the jobs only in our own app (never re-publish to other boards or feeds); remove jobs once
 * they expire (JobFinder deletes expired rows). Data refreshes daily, so each query is cached 12 hours.
 */
class Himalayas implements JobSource
{
    private const PAGES = 3; // 20 jobs a page

    private const TYPES = ['Full Time' => 'full_time', 'Part Time' => 'part_time', 'Contractor' => 'contract', 'Temporary' => 'contract', 'Intern' => 'internship'];

    private const LEVELS = ['Entry-level' => 'entry', 'Mid-level' => 'mid', 'Senior' => 'senior', 'Manager' => 'lead', 'Director' => 'lead', 'Executive' => 'lead'];

    public function key(): string
    {
        return 'himalayas';
    }

    public function name(): string
    {
        return 'Himalayas';
    }

    public function note(): string
    {
        return 'Remote jobs, filtered by the country you type in Location (e.g. "Philippines").';
    }

    public function fetch(array $params): array
    {
        $query = array_filter([
            'q' => trim(($params['title'] ?? '').' '.($params['keywords'] ?? '')) ?: ($params['company'] ?? null),
            'sort' => 'recent',
        ]);
        $notes = [];

        if ($location = trim($params['location'] ?? '')) {
            $byCountry = $this->page([...$query, 'country' => $location], 1);
            if ($byCountry === null) { // not a country Himalayas knows (e.g. a city)
                $notes[] = "Himalayas filters by country, not city: showing its jobs open to applicants anywhere.";
                $query['worldwide'] = 'true';
            } else {
                $query['country'] = $location;
            }
        }

        $jobs = [];
        // pages: how deep to go (the "every job" fetch asks for more; capped to stay polite).
        $pages = min((int) ($params['pages'] ?? self::PAGES), 8);
        for ($page = 1; $page <= $pages; $page++) {
            $batch = $this->page($query, $page) ?? [];
            foreach ($batch as $job) {
                $jobs[$job['guid']] = $job; // results can shift between pages
            }
            if (count($batch) < 20) {
                break;
            }
        }

        return ['jobs' => array_values(array_map(fn ($j) => $this->map($j), $jobs)), 'notes' => $notes];
    }

    /** One page of results, or null when Himalayas rejects the query. */
    private function page(array $query, int $page): ?array
    {
        $query['page'] = $page;
        ksort($query);
        $key = 'job-source:himalayas:'.md5(http_build_query($query));

        $result = Cache::remember($key, now()->addHours(12), function () use ($query) {
            $response = Http::timeout(30)->acceptJson()->get('https://himalayas.app/jobs/api/search', $query);
            if ($response->clientError()) {
                return false;
            }

            return $response->throw()->json('jobs') ?? false;
        });

        return $result === false ? null : $result;
    }

    private function map(array $j): array
    {
        $countries = $j['locationRestrictions'] ?? [];
        $location = match (true) {
            ! $countries => 'Worldwide',
            count($countries) <= 3 => implode(', ', $countries),
            default => implode(', ', array_slice($countries, 0, 3)).' +'.(count($countries) - 3).' more',
        };
        $period = $j['salaryPeriod'] ?? null;
        $salaryText = ($j['minSalary'] ?? null) || ($j['maxSalary'] ?? null)
            ? trim(($j['currency'] ?? '').' '.number_format($j['minSalary'] ?? $j['maxSalary']).(($j['maxSalary'] ?? null) && $j['maxSalary'] != ($j['minSalary'] ?? null) ? ' – '.number_format($j['maxSalary']) : '').($period ? " / {$period}" : ''))
            : null;
        $seniority = $j['seniority'] ?? [];

        return Normalize::job([
            'source' => 'himalayas',
            'external_id' => $j['guid'],
            'title' => $j['title'] ?? '',
            'company' => $j['companyName'] ?? null,
            'company_logo' => $j['companyLogo'] ?? null,
            'location' => $location,
            'work_setup' => 'remote',
            'employment_type' => self::TYPES[$j['employmentType'] ?? ''] ?? null,
            // Several seniorities = open to a range; only trust a single one.
            'experience_level' => count($seniority) === 1 ? (self::LEVELS[$seniority[0]] ?? null) : null,
            'salary_text' => $salaryText,
            'salary' => [$j['minSalary'] ?? null, $j['maxSalary'] ?? null, $j['currency'] ?? null, $period],
            'description' => $j['description'] ?? $j['excerpt'] ?? '',
            'tags' => implode(', ', $j['categories'] ?? []),
            'url' => $j['applicationLink'] ?? $j['guid'],   // Apply: unchanged, as the terms require
            'source_url' => $j['guid'],                    // the listing on Himalayas (credited)
            'posted_at' => $j['pubDate'] ?? null,
            'expires_at' => $j['expiryDate'] ?? null,
        ]);
    }
}
