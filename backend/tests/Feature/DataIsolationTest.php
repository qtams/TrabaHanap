<?php

namespace Tests\Feature;

use App\Models\JobPosting;
use App\Models\JobSearch;
use App\Models\Profile;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Each account sees only its own resumes, profile, search history, saved jobs and AI results. */
class DataIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $signIn = false;

    public function test_each_user_has_their_own_data(): void
    {
        [$ana, $ben] = User::factory()->count(2)->create();
        $job = JobPosting::create(['source' => 'remotive', 'external_id' => '1', 'title' => 'Developer', 'company' => 'Acme', 'url' => 'https://example.com/1', 'description' => 'Build things.']);

        // Ana: a resume, a profile, a search, a saved and analysed job.
        Sanctum::actingAs($ana);
        $resume = Resume::create(['title' => 'Ana CV', 'data' => ['full_name' => 'Ana']]);
        $data = Profile::BLANK;
        $data['personal']['full_name'] = 'Ana';
        $this->putJson('/api/profile', ['data' => $data])->assertOk();
        JobSearch::create(['params' => ['titles' => ['Developer']], 'results_count' => 1]);
        $this->postJson("/api/jobs/{$job->id}/save")->assertOk()->assertJsonPath('saved_at', fn ($v) => $v !== null);
        $job->remember(['analysis' => ['summary' => 'Ana’s analysis']]);

        // Ben sees none of it, and can't open Ana's resume by id.
        Sanctum::actingAs($ben);
        $this->getJson('/api/resumes')->assertOk()->assertJsonCount(0);
        $this->getJson("/api/resumes/{$resume->id}")->assertNotFound();
        $this->getJson('/api/profile')->assertJsonPath('data.personal.full_name', '');
        $this->getJson('/api/job-searches')->assertJsonCount(0);
        $this->getJson('/api/jobs?saved=1')->assertJsonCount(0);
        $this->getJson("/api/jobs/{$job->id}")->assertOk() // the posting itself is a shared listing
            ->assertJsonPath('saved_at', null)->assertJsonPath('analysis', null);

        // Ben saving it doesn't touch Ana's state.
        $this->postJson("/api/jobs/{$job->id}/save")->assertOk();
        $this->deleteJson("/api/jobs/{$job->id}/save")->assertOk()->assertJsonPath('saved_at', null);

        Sanctum::actingAs($ana);
        $this->getJson('/api/resumes')->assertJsonCount(1);
        $this->getJson('/api/profile')->assertJsonPath('data.personal.full_name', 'Ana');
        $this->getJson('/api/jobs?saved=1')->assertJsonCount(1)->assertJsonPath('0.analysis.summary', 'Ana’s analysis');
    }
}
