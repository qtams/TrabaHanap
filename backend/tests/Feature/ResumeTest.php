<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Services\ResumeAi;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function upload(string $name = 'cv.pdf', string $mime = 'application/pdf'): Resume
    {
        $id = $this->post('/api/resumes', [
            'title' => 'General',
            'file' => UploadedFile::fake()->create($name, 100, $mime),
        ], ['Accept' => 'application/json'])->assertCreated()->json('id');

        return Resume::findOrFail($id);
    }

    public function test_uploads_pdf_and_docx(): void
    {
        $pdf = $this->upload();
        $docx = $this->upload('cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        Storage::disk('local')->assertExists([$pdf->file_path, $docx->file_path]);
        $this->getJson('/api/resumes')->assertOk()->assertJsonCount(2)->assertJsonMissingPath('0.file_path');
    }

    public function test_rejects_other_file_types_and_large_files(): void
    {
        $this->postJson('/api/resumes', ['title' => 'x', 'file' => UploadedFile::fake()->create('cv.txt', 1, 'text/plain')])
            ->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->postJson('/api/resumes', ['title' => 'x', 'file' => UploadedFile::fake()->create('cv.pdf', 11000, 'application/pdf')])
            ->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_previews_and_downloads_file(): void
    {
        $resume = $this->upload();

        $this->get("/api/resumes/{$resume->id}/file")->assertOk()->assertHeader('Content-Disposition', 'inline; filename="cv.pdf"');
        $this->get("/api/resumes/{$resume->id}/file?download=1")->assertOk()->assertDownload('cv.pdf');
    }

    public function test_replacing_file_removes_old_file_and_clears_ai_results(): void
    {
        $resume = $this->upload();
        $resume->update(['data' => ['full_name' => 'Juan'], 'analysis' => ['overall_score' => 80]]);
        $old = $resume->file_path;

        $this->post("/api/resumes/{$resume->id}/file", ['file' => UploadedFile::fake()->create('new.pdf', 50, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertOk()->assertJson(['file_name' => 'new.pdf', 'data' => null, 'analysis' => null]);

        Storage::disk('local')->assertMissing($old);
        Storage::disk('local')->assertExists($resume->fresh()->file_path);
    }

    public function test_delete_removes_row_and_file(): void
    {
        $resume = $this->upload();

        $this->deleteJson("/api/resumes/{$resume->id}")->assertNoContent();

        $this->assertModelMissing($resume);
        Storage::disk('local')->assertMissing($resume->file_path);
    }

    public function test_extract_saves_ai_result(): void
    {
        $resume = $this->upload();
        $this->mock(ResumeAi::class)->shouldReceive('extract')->once()->andReturn(['full_name' => 'Juan dela Cruz']);

        $this->postJson("/api/resumes/{$resume->id}/extract")->assertOk()->assertJsonPath('data.full_name', 'Juan dela Cruz');
    }

    public function test_analyze_passes_the_resume_and_saves_the_review(): void
    {
        $resume = $this->upload();
        $resume->update(['data' => ['full_name' => 'Juan']]);
        $this->mock(ResumeAi::class)->shouldReceive('analyze')->once()
            ->withArgs(fn ($r) => $r instanceof \App\Models\Resume && $r->is($resume))
            ->andReturn(['overall_score' => 72]);

        $this->postJson("/api/resumes/{$resume->id}/analyze")->assertOk()->assertJsonPath('analysis.overall_score', 72);
    }

    public function test_build_writes_a_resume_from_the_profile(): void
    {
        $this->postJson('/api/resume-builder')->assertUnprocessable(); // empty profile: nothing to build from

        $data = \App\Models\Profile::BLANK;
        $data['personal']['full_name'] = 'Juan';
        $data['experience'] = [['company' => 'Acme', 'title' => 'Cashier', 'employment_type' => '', 'start_date' => '', 'end_date' => '', 'responsibilities' => [], 'achievements' => [], 'technologies' => []]];
        \App\Models\Profile::current()->update(['data' => $data]);
        $this->mock(ResumeAi::class)->shouldReceive('build')->once()
            ->andReturn(['resume' => ['full_name' => 'Juan'], 'notes' => ['changes' => [], 'gaps' => ['Add a number']]]);

        $this->postJson('/api/resume-builder')->assertCreated()
            ->assertJsonPath('title', 'Juan resume (built by AI)')->assertJsonPath('file_path', null)
            ->assertJsonPath('tailoring_notes.kind', 'built')->assertJsonPath('data.full_name', 'Juan');
    }

    public function test_improve_creates_a_stronger_version(): void
    {
        $resume = $this->upload();
        $resume->update(['data' => ['full_name' => 'Juan'], 'analysis' => ['overall_score' => 60]]);
        $this->mock(ResumeAi::class)->shouldReceive('improve')->once()->with(['full_name' => 'Juan'], ['overall_score' => 60], null)
            ->andReturn(['resume' => ['full_name' => 'Juan'], 'notes' => ['changes' => [['change' => 'x', 'based_on' => 'y']], 'gaps' => []]]);

        $this->postJson("/api/resumes/{$resume->id}/improve")->assertCreated()
            ->assertJsonPath('tailored_from_id', $resume->id)->assertJsonPath('tailoring_notes.kind', 'improved')
            ->assertJsonPath('title', "{$resume->title} (improved)");
    }

    public function test_analyze_and_tailor_need_extracted_info_first(): void
    {
        $resume = $this->upload();

        $this->postJson("/api/resumes/{$resume->id}/analyze")->assertUnprocessable();
        $this->postJson("/api/resumes/{$resume->id}/tailor", ['job_title' => 'Dev', 'job_description' => 'React'])->assertUnprocessable();
    }

    public function test_tailor_creates_new_version_linked_to_the_original(): void
    {
        $resume = $this->upload();
        $resume->update(['data' => ['full_name' => 'Juan']]);
        $this->mock(ResumeAi::class)->shouldReceive('tailor')->once()
            ->with(['full_name' => 'Juan'], 'React Developer', 'Build UIs', null) // null: profile still blank
            ->andReturn(['resume' => ['full_name' => 'Juan'], 'notes' => ['changes' => [], 'gaps' => ['3 years React']]]);

        $this->postJson("/api/resumes/{$resume->id}/tailor", ['job_title' => 'React Developer', 'job_description' => 'Build UIs'])
            ->assertCreated()
            ->assertJson(['title' => 'React Developer (tailored)', 'tailored_from_id' => $resume->id, 'file_name' => null])
            ->assertJsonPath('tailoring_notes.gaps.0', '3 years React');
    }
}
