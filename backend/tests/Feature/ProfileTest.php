<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\Resume;
use App\Services\ResumeAi;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private function data(array $overrides = []): array
    {
        return array_replace_recursive(Profile::BLANK, $overrides);
    }

    public function test_starts_blank_with_every_section(): void
    {
        $this->getJson('/api/profile')->assertOk()
            ->assertJsonPath('data', Profile::BLANK)
            ->assertJsonPath('newer_resume', null);
    }

    public function test_saves_and_returns_profile(): void
    {
        $data = $this->data([
            'personal' => ['full_name' => 'Juan dela Cruz', 'github' => 'https://github.com/juan'],
            'experience' => [['company' => 'Acme', 'title' => 'Web Developer', 'employment_type' => 'full_time', 'start_date' => 'Jan 2022',
                'end_date' => '', 'responsibilities' => ['Built pages'], 'achievements' => [], 'technologies' => ['React']]],
            'skills' => ['frameworks' => ['React', 'Laravel']],
            'preferences' => ['work_setups' => ['remote', 'hybrid'], 'salary_min' => 40000, 'salary_max' => 60000],
        ]);

        $this->putJson('/api/profile', ['data' => $data])->assertOk()->assertJsonPath('data', $data);
        $this->assertSame($data, Profile::current()->data);
    }

    public function test_rejects_invalid_values(): void
    {
        $data = $this->data([
            'personal' => ['email' => 'not-an-email', 'linkedin' => 'linkedin'],
            'experience' => [['company' => '', 'title' => 'Dev']],
            'preferences' => ['work_setups' => ['moon'], 'salary_min' => 60000, 'salary_max' => 40000],
        ]);

        $this->putJson('/api/profile', ['data' => $data])->assertUnprocessable()->assertJsonValidationErrors([
            'data.personal.email', 'data.personal.linkedin', 'data.experience.0.company',
            'data.preferences.work_setups.0', 'data.preferences.salary_max',
        ]);
    }

    public function test_ignores_unknown_fields(): void
    {
        $this->putJson('/api/profile', ['data' => $this->data(['hacked' => 1, 'personal' => ['extra' => 'x']])])->assertOk()
            ->assertJsonMissingPath('data.hacked')->assertJsonMissingPath('data.personal.extra');
    }

    public function test_import_proposes_fields_without_saving(): void
    {
        $resume = Resume::create(['title' => 'CV', 'data' => ['full_name' => 'Juan'], 'extracted_at' => now()]);
        $this->mock(ResumeAi::class)->shouldReceive('profileFromResume')->once()->with(['full_name' => 'Juan'])
            ->andReturn(['personal' => ['full_name' => 'Juan']]);

        $this->postJson("/api/profile/import/{$resume->id}")->assertOk()
            ->assertJson(['resume_id' => $resume->id, 'data' => ['personal' => ['full_name' => 'Juan']]]);
        $this->assertSame('', Profile::current()->data['personal']['full_name']);
    }

    public function test_write_summary_drafts_from_the_form_without_saving(): void
    {
        $data = Profile::BLANK;
        $data['experience'] = [['company' => 'Acme', 'title' => 'Developer']];
        $this->mock(ResumeAi::class)->shouldReceive('writeSummary')->once()->with($data)
            ->andReturn(['introduction' => 'Developer at Acme.', 'career_objective' => 'x', 'career_goals' => 'y']);

        $this->postJson('/api/profile/summary', ['data' => $data])->assertOk()->assertJsonPath('introduction', 'Developer at Acme.');
        $this->assertSame('', Profile::current()->data['summary']['introduction']);
    }

    public function test_write_summary_needs_something_to_write_from(): void
    {
        $this->postJson('/api/profile/summary', ['data' => Profile::BLANK])->assertUnprocessable();
    }

    public function test_import_needs_extracted_resume(): void
    {
        $resume = Resume::create(['title' => 'CV']);

        $this->postJson("/api/profile/import/{$resume->id}")->assertUnprocessable();
    }

    public function test_flags_resume_newer_than_last_sync_until_saved_with_it(): void
    {
        $resume = Resume::create(['title' => 'CV', 'data' => ['full_name' => 'Juan'], 'extracted_at' => now()]);
        Resume::create(['title' => 'Tailored', 'data' => [], 'extracted_at' => now()->addMinute(), 'tailored_from_id' => $resume->id]);

        $this->getJson('/api/profile')->assertJsonPath('newer_resume.id', $resume->id); // tailored versions don't count

        $this->travel(1)->minutes();
        $this->putJson('/api/profile', ['data' => $this->data(), 'synced_resume_id' => $resume->id])->assertOk()
            ->assertJsonPath('synced_resume_id', $resume->id)
            ->assertJsonPath('newer_resume', null);
    }

    public function test_tailoring_uses_filled_in_profile(): void
    {
        $resume = Resume::create(['title' => 'CV', 'data' => ['full_name' => 'Juan'], 'extracted_at' => now()]);
        $profile = $this->data(['personal' => ['full_name' => 'Juan dela Cruz']]);
        Profile::current()->update(['data' => $profile]);
        $this->mock(ResumeAi::class)->shouldReceive('tailor')->once()->with(['full_name' => 'Juan'], 'Dev', 'React', $profile)
            ->andReturn(['resume' => ['full_name' => 'Juan dela Cruz'], 'notes' => ['changes' => [], 'gaps' => []]]);

        $this->postJson("/api/resumes/{$resume->id}/tailor", ['job_title' => 'Dev', 'job_description' => 'React'])->assertCreated();
    }
}
