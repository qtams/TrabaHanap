<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\Resume;
use App\Services\ResumeAi;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// TODO when auth lands: set user_id on create and scope every query to $request->user().
class ResumeController extends Controller
{
    private const FILE_RULES = ['required', 'file', 'mimes:pdf,docx', 'max:10240']; // 10 MB

    public function index()
    {
        return Resume::latest()->get();
    }

    public function show(Resume $resume)
    {
        return $resume;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'file' => self::FILE_RULES,
        ]);

        return response()->json(Resume::create(['title' => $data['title'], ...$this->storeFile($data['file'])])->fresh(), 201);
    }

    public function update(Request $request, Resume $resume)
    {
        $resume->update($request->validate(['title' => ['required', 'string', 'max:120']]));

        return $resume;
    }

    // Replace the file; the old extraction and analysis no longer apply.
    public function replaceFile(Request $request, Resume $resume)
    {
        $file = $request->validate(['file' => self::FILE_RULES])['file'];
        $old = $resume->file_path;

        $resume->update([
            ...$this->storeFile($file),
            'data' => null, 'analysis' => null, 'extracted_at' => null, 'analyzed_at' => null,
        ]);
        if ($old) {
            Storage::disk('local')->delete($old);
        }

        return $resume;
    }

    public function destroy(Resume $resume)
    {
        $resume->delete();

        return response()->noContent();
    }

    // Inline for preview; ?download=1 for a download.
    public function file(Request $request, Resume $resume)
    {
        abort_unless($resume->file_path && Storage::disk('local')->exists($resume->file_path), 404, 'This version has no file.');

        $path = Storage::disk('local')->path($resume->file_path);
        $headers = ['Content-Type' => $resume->mime_type];

        return $request->boolean('download')
            ? response()->download($path, $resume->file_name, $headers)
            : response()->file($path, $headers + ['Content-Disposition' => 'inline; filename="'.addslashes($resume->file_name).'"']);
    }

    public function extract(Resume $resume, ResumeAi $ai)
    {
        abort_unless($resume->file_path, 422, 'This version has no file to read.');

        $resume->update(['data' => $ai->extract($resume), 'extracted_at' => now()]);

        return $resume;
    }

    public function analyze(Resume $resume, ResumeAi $ai)
    {
        abort_unless($resume->data, 422, 'Extract the resume information first.');

        $resume->update(['analysis' => $ai->analyze($resume), 'analyzed_at' => now()]);

        return $resume;
    }

    // Creates a new version tailored to a job, built only from this resume's extracted information
    // and the Professional Profile.
    public function tailor(Request $request, Resume $resume, ResumeAi $ai)
    {
        abort_unless($resume->data, 422, 'Extract the resume information first.');

        $job = $request->validate([
            'job_title' => ['required', 'string', 'max:160'],
            'job_description' => ['required', 'string', 'max:20000'],
        ]);
        $profile = Profile::current()->data;
        $hasProfile = $profile !== Profile::BLANK; // skip an untouched profile
        $result = $ai->tailor($resume->data, $job['job_title'], $job['job_description'], $hasProfile ? $profile : null);

        return response()->json(Resume::create([
            'title' => "{$job['job_title']} (tailored)",
            'data' => $result['resume'],
            'extracted_at' => now(),
            'tailored_from_id' => $resume->id,
            'job_title' => $job['job_title'],
            'job_description' => $job['job_description'],
            'tailoring_notes' => $result['notes'],
        ])->fresh(), 201);
    }

    private function storeFile(UploadedFile $file): array
    {
        return [
            'file_path' => $file->store('resumes', 'local'),
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ];
    }
}
