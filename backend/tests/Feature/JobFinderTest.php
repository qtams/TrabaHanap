<?php

namespace Tests\Feature;

use App\Models\JobPosting;
use App\Models\JobSearch;
use App\Models\Profile;
use App\Models\Resume;
use App\Services\JobAi;
use App\Services\JobSources\Normalize;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobFinderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::fake([
            'remotive.com/*' => Http::response(['jobs' => [
                ['id' => 1, 'url' => 'https://remotive.com/remote-jobs/1', 'title' => 'Senior React Developer', 'company_name' => 'Acme',
                    'company_logo_url' => 'https://remotive.com/job/1/logo', 'job_type' => 'full_time', 'publication_date' => now()->subDay()->toIso8601String(),
                    'candidate_required_location' => 'Worldwide', 'salary' => '$60k - $80k', 'tags' => ['react', 'typescript'],
                    'description' => '<p>Build UIs.</p><ul><li>React</li><li>TypeScript</li></ul>'],
                ['id' => 2, 'url' => 'https://remotive.com/remote-jobs/2', 'title' => 'Junior PHP Developer', 'company_name' => 'Beta',
                    'job_type' => 'contract', 'publication_date' => now()->subDays(20)->toIso8601String(),
                    'candidate_required_location' => 'USA only', 'salary' => '', 'tags' => ['laravel'], 'description' => 'Laravel APIs'],
            ]]),
            // Himalayas knows countries, not cities.
            'himalayas.app/*' => fn (Request $r) => str_contains($r->url(), 'country=Manila')
                ? Http::response(['error' => 'Unknown country'], 400)
                : Http::response(['jobs' => [[
                    'guid' => 'https://himalayas.app/companies/gamma/jobs/laravel-dev', 'title' => 'Laravel Developer', 'companyName' => 'Gamma',
                    'companyLogo' => 'https://cdn-images.himalayas.app/x', 'employmentType' => 'Contractor', 'seniority' => ['Mid-level'],
                    'minSalary' => 10, 'maxSalary' => 20, 'currency' => 'USD', 'salaryPeriod' => 'hourly', 'locationRestrictions' => ['Philippines'],
                    'categories' => ['Engineering'], 'description' => '<p>Laravel work</p>', 'pubDate' => now()->subDays(2)->getTimestamp(),
                    'expiryDate' => now()->addMonth()->getTimestamp(), 'applicationLink' => 'https://himalayas.app/apply/laravel-dev?utm_source=x',
                ]]]),
            'boards-api.greenhouse.io/v1/boards/gitlab/*' => Http::response(['jobs' => [
                ['id' => 10, 'title' => 'Frontend Engineer, React', 'company_name' => 'GitLab', 'location' => ['name' => 'Remote, Philippines'],
                    'absolute_url' => 'https://job-boards.greenhouse.io/gitlab/jobs/10', 'first_published' => now()->subDays(2)->toIso8601String(),
                    'application_deadline' => '2030-01-31', 'content' => '&lt;p&gt;Ship &amp;amp; iterate&lt;/p&gt;', 'departments' => [['name' => 'Engineering']]],
            ]]),
            'boards-api.greenhouse.io/*' => Http::response([], 404),
            'api.lever.co/*' => Http::response([], 404),
        ]);
    }

    public function test_searches_remotive_and_stores_results_and_history(): void
    {
        $res = $this->postJson('/api/job-search', ['title' => 'react', 'sources' => ['remotive']])->assertOk();

        $res->assertJsonCount(1, 'jobs')->assertJsonPath('jobs.0.title', 'Senior React Developer')
            ->assertJsonPath('jobs.0.source', 'remotive')
            ->assertJsonPath('jobs.0.work_setup', 'remote')
            ->assertJsonPath('jobs.0.experience_level', 'senior')
            ->assertJsonPath('jobs.0.salary_min', 5000) // 60k a year, as monthly
            ->assertJsonPath('jobs.0.salary_period', 'year')
            ->assertJsonPath('jobs.0.description', "Build UIs.\n• React\n• TypeScript");
        $this->assertSame(1, JobSearch::first()->jobs()->count());
        $this->getJson('/api/job-searches')->assertJsonCount(1)->assertJsonPath('0.params.title', 'react');
    }

    public function test_needs_a_title_keywords_or_company(): void
    {
        $this->postJson('/api/job-search', ['location' => 'Manila'])->assertUnprocessable();
    }

    public function test_filters(): void
    {
        $titles = fn (array $p) => collect($this->postJson('/api/job-search', ['keywords' => 'developer', 'sources' => ['remotive'], ...$p])->json('jobs'))->pluck('title')->all();

        $this->assertSame(['Senior React Developer'], $titles(['location' => 'Philippines'])); // Worldwide counts
        $this->assertSame(['Junior PHP Developer'], $titles(['employment_types' => ['contract']]));
        $this->assertSame(['Junior PHP Developer'], $titles(['levels' => ['junior']]));
        $this->assertSame(['Senior React Developer'], $titles(['posted_within' => 7]));
        $this->assertSame([], $titles(['salary_min' => 9000, 'salary_currency' => 'USD', 'levels' => ['senior']]));
        $this->assertSame(['Junior PHP Developer'], $titles(['salary_min' => 9000, 'salary_currency' => 'USD', 'levels' => ['junior']])); // no salary: kept
    }

    public function test_himalayas_maps_jobs_and_follows_its_terms(): void
    {
        $res = $this->postJson('/api/job-search', ['title' => 'laravel', 'location' => 'Philippines', 'sources' => ['himalayas']])->assertOk();

        $res->assertJsonCount(1, 'jobs')
            ->assertJsonPath('jobs.0.url', 'https://himalayas.app/apply/laravel-dev?utm_source=x') // Apply link unchanged
            ->assertJsonPath('jobs.0.source_url', 'https://himalayas.app/companies/gamma/jobs/laravel-dev')
            ->assertJsonPath('jobs.0.location', 'Philippines')
            ->assertJsonPath('jobs.0.employment_type', 'contract')
            ->assertJsonPath('jobs.0.experience_level', 'mid')
            ->assertJsonPath('jobs.0.salary_min', 1600)->assertJsonPath('jobs.0.salary_max', 3200) // $10-20/h, monthly
            ->assertJsonPath('jobs.0.salary_text', 'USD 10 – 20 / hourly');
        Http::assertSent(fn (Request $r) => str_contains($r->url(), 'himalayas.app') && str_contains($r->url(), 'country=Philippines'));

        // Expired listings are removed.
        JobPosting::first()->update(['expires_at' => now()->subDay()]);
        $this->getJson('/api/jobs')->assertJsonCount(0);
    }

    public function test_himalayas_falls_back_to_worldwide_for_a_city(): void
    {
        $this->postJson('/api/job-search', ['title' => 'laravel', 'location' => 'Manila', 'sources' => ['himalayas']])
            ->assertOk()->assertJsonCount(1, 'jobs')
            ->assertJsonPath('notes.0', 'Himalayas filters by country, not city: showing its jobs open to applicants anywhere.');
        Http::assertSent(fn (Request $r) => str_contains($r->url(), 'worldwide=true'));
    }

    public function test_company_searches_career_boards_and_reports_missing_ones(): void
    {
        $res = $this->postJson('/api/job-search', ['company' => 'GitLab', 'sources' => ['greenhouse', 'lever']])->assertOk();

        $res->assertJsonCount(1, 'jobs')
            ->assertJsonPath('jobs.0.company', 'GitLab')
            ->assertJsonPath('jobs.0.work_setup', 'remote')
            ->assertJsonPath('jobs.0.deadline', '2030-01-31')
            ->assertJsonPath('jobs.0.description', 'Ship & iterate')
            ->assertJsonPath('notes.0', 'Lever career sites: no public job board named "gitlab".');
    }

    public function test_upsert_keeps_saved_state(): void
    {
        $id = $this->postJson('/api/job-search', ['title' => 'react'])->json('jobs.0.id');
        $this->postJson("/api/jobs/{$id}/save")->assertOk();

        $this->postJson('/api/job-search', ['title' => 'react'])->assertJsonPath('jobs.0.id', $id);
        $this->assertNotNull(JobPosting::find($id)->saved_at);
        $this->getJson('/api/jobs?saved=1')->assertJsonCount(1);

        $this->deleteJson("/api/jobs/{$id}/save")->assertOk()->assertJsonPath('saved_at', null);
    }

    public function test_repeating_a_search_refreshes_history_instead_of_duplicating(): void
    {
        $first = $this->postJson('/api/job-search', ['title' => 'react', 'location' => 'Philippines'])->json('search.id');
        $this->postJson('/api/job-search', ['location' => 'Philippines', 'title' => 'react'])->assertJsonPath('search.id', $first);
        $this->assertSame(1, JobSearch::count());

        $this->patchJson("/api/job-searches/{$first}", ['name' => 'Mine']);
        $this->postJson('/api/job-search', ['title' => 'react', 'location' => 'Philippines']); // named ones stay put
        $this->postJson('/api/job-search', ['title' => 'vue']);
        $this->assertSame(3, JobSearch::count());
    }

    public function test_save_rename_and_delete_searches(): void
    {
        $search = $this->postJson('/api/job-search', ['title' => 'react'])->json('search.id');

        $this->patchJson("/api/job-searches/{$search}", ['name' => 'React jobs'])->assertJsonPath('name', 'React jobs');
        $this->getJson("/api/job-searches/{$search}")->assertJsonCount(1, 'jobs');
        $this->deleteJson("/api/job-searches/{$search}")->assertNoContent();
        $this->assertSame(1, JobPosting::count()); // discovered jobs stay
    }

    public function test_ai_actions(): void
    {
        $job = JobPosting::find($this->postJson('/api/job-search', ['title' => 'react'])->json('jobs.0.id'));
        $ai = $this->mock(JobAi::class);

        $ai->shouldReceive('analyze')->once()->andReturn(['summary' => 'A React role']);
        $this->postJson("/api/jobs/{$job->id}/analyze")->assertJsonPath('analysis.summary', 'A React role');

        $this->postJson("/api/jobs/{$job->id}/compatibility")->assertUnprocessable(); // blank profile
        Profile::current()->update(['data' => array_replace_recursive(Profile::BLANK, ['personal' => ['full_name' => 'Juan']])]);
        $ai->shouldReceive('compatibility')->once()->andReturn(['score' => 70]);
        $this->postJson("/api/jobs/{$job->id}/compatibility")->assertJsonPath('compatibility.score', 70);

        $resume = Resume::create(['title' => 'CV', 'data' => ['full_name' => 'Juan'], 'extracted_at' => now()]);
        $ai->shouldReceive('compareResume')->once()->with(\Mockery::type(JobPosting::class), ['full_name' => 'Juan'])->andReturn(['coverage' => 50]);
        $this->postJson("/api/jobs/{$job->id}/compare", ['resume_id' => $resume->id])
            ->assertJsonPath('resume_comparison.coverage', 50)->assertJsonPath('compared_resume_id', $resume->id);
    }

    public function test_salary_and_level_parsing(): void
    {
        $this->assertSame([2942, 4333, 'USD', 'year'], Normalize::salary('$35,3k- $52k')); // large, no period: yearly
        $this->assertSame([30000, 45000, 'PHP', 'month'], Normalize::salary('PHP 30,000 – 45,000 / month'));
        $this->assertSame([25000, 25000, 'PHP', 'month'], Normalize::salary('₱25,000')); // PHP, no period: monthly
        $this->assertSame([3200, 4800, 'USD', 'hour'], Normalize::salary('$20-30 per hour'));
        $this->assertSame([null, null, null, null], Normalize::salary('Competitive'));
        $this->assertSame('lead', Normalize::level('Lead Frontend Engineer'));
        $this->assertSame('entry', Normalize::level('Software Engineering Intern'));
        $this->assertNull(Normalize::level('Frontend Engineer'));
    }
}
