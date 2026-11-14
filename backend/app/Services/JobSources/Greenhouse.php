<?php

namespace App\Services\JobSources;

/** Company career sites on Greenhouse (public Job Board API: boards-api.greenhouse.io). */
class Greenhouse extends CompanyBoards
{
    public function key(): string
    {
        return 'greenhouse';
    }

    public function name(): string
    {
        return 'Greenhouse career sites';
    }

    public function note(): string
    {
        return 'Company career pages. Type a company name, e.g. "GitLab".';
    }

    protected function board(string $slug): ?array
    {
        return $this->get("https://boards-api.greenhouse.io/v1/boards/{$slug}/jobs?content=true")['jobs'] ?? null;
    }

    protected function map(array $job, string $slug): array
    {
        return [
            'source' => 'greenhouse',
            'external_id' => $job['id'],
            'title' => $job['title'] ?? '',
            'company' => $job['company_name'] ?? ucfirst($slug),
            'location' => $job['location']['name'] ?? null,
            'description' => $job['content'] ?? '',
            'tags' => implode(', ', array_column($job['departments'] ?? [], 'name')),
            'url' => $job['absolute_url'],
            'posted_at' => $job['first_published'] ?? $job['updated_at'] ?? null,
            'deadline' => $job['application_deadline'] ?? null,
        ];
    }
}
