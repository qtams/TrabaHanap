<?php

namespace App\Services\JobSources;

use Illuminate\Support\Carbon;

/** Company career sites on Lever (public Postings API: api.lever.co/v0/postings). */
class Lever extends CompanyBoards
{
    private const COMMITMENT = [
        'full-time' => 'full_time', 'full time' => 'full_time', 'part-time' => 'part_time', 'part time' => 'part_time',
        'contract' => 'contract', 'contractor' => 'contract', 'freelance' => 'freelance', 'intern' => 'internship', 'internship' => 'internship',
    ];

    public function key(): string
    {
        return 'lever';
    }

    public function name(): string
    {
        return 'Lever career sites';
    }

    public function note(): string
    {
        return 'Company career pages. Type a company name, e.g. "Palantir".';
    }

    protected function board(string $slug): ?array
    {
        return $this->get("https://api.lever.co/v0/postings/{$slug}?mode=json");
    }

    protected function map(array $job, string $slug): array
    {
        // Lever splits the posting into an intro, titled lists (responsibilities, requirements…) and a closing part.
        $lists = collect($job['lists'] ?? [])->map(fn ($l) => "<h3>{$l['text']}</h3><ul>{$l['content']}</ul>")->implode('');
        $salary = $job['salaryRange'] ?? null;

        return [
            'source' => 'lever',
            'external_id' => $job['id'],
            'title' => $job['text'] ?? '',
            'company' => ucfirst($slug),
            'location' => $job['categories']['location'] ?? null,
            'work_setup' => in_array($job['workplaceType'] ?? '', ['remote', 'hybrid', 'onsite'], true) ? $job['workplaceType'] : null,
            'employment_type' => self::COMMITMENT[strtolower($job['categories']['commitment'] ?? '')] ?? null,
            'salary_text' => $salary ? trim(($salary['currency'] ?? '').' '.number_format($salary['min'] ?? 0).' - '.number_format($salary['max'] ?? 0).' '.($salary['interval'] ?? '')) : null,
            'description' => ($job['description'] ?? '').$lists.($job['additional'] ?? ''),
            'tags' => $job['categories']['team'] ?? null,
            'url' => $job['hostedUrl'],
            'posted_at' => isset($job['createdAt']) ? Carbon::createFromTimestampMs($job['createdAt']) : null,
        ];
    }
}
