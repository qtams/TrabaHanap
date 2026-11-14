<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\Resume;
use App\Services\ResumeAi;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    private const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'freelance', 'internship'];

    public function show()
    {
        return $this->present(Profile::current());
    }

    public function update(Request $request)
    {
        $s = ['nullable', 'string', 'max:255'];
        $text = ['nullable', 'string', 'max:5000'];
        $list = ['array'];
        $item = ['string', 'max:500'];
        $url = ['nullable', 'string', 'max:255']; // links: "github.com/me" is fine too, no https:// needed

        $valid = $request->validate([
            'data' => ['required', 'array'],
            'synced_resume_id' => ['nullable', 'exists:resumes,id'], // sent after an import, to record the sync

            'data.personal.full_name' => $s, 'data.personal.email' => ['nullable', 'email', 'max:255'], 'data.personal.phone' => $s,
            'data.personal.location' => $s, 'data.personal.linkedin' => $url, 'data.personal.github' => $url, 'data.personal.portfolio' => $url,

            'data.summary.career_objective' => $text, 'data.summary.introduction' => $text, 'data.summary.career_goals' => $text,
            'data.summary.years_experience' => ['nullable', 'numeric', 'min:0', 'max:60'],
            'data.summary.employment_status' => ['nullable', Rule::in(['', 'employed', 'unemployed', 'freelancing', 'student'])],

            'data.experience' => $list,
            // A job needs a title or a company; everything else is optional. Fully blank entries are dropped (Profile::data).
            'data.experience.*.company' => $s,
            'data.experience.*.title' => ['nullable', 'required_without:data.experience.*.company', 'string', 'max:255'],
            'data.experience.*.employment_type' => ['nullable', Rule::in(['', ...self::EMPLOYMENT_TYPES])],
            'data.experience.*.start_date' => $s, 'data.experience.*.end_date' => $s,
            'data.experience.*.responsibilities' => $list, 'data.experience.*.responsibilities.*' => ['string', 'max:1000'],
            'data.experience.*.achievements' => $list, 'data.experience.*.achievements.*' => ['string', 'max:1000'],
            'data.experience.*.technologies' => $list, 'data.experience.*.technologies.*' => $item,

            'data.education' => $list,
            'data.education.*.school' => $s, 'data.education.*.degree' => $s,
            'data.education.*.field_of_study' => $s, 'data.education.*.graduation_date' => $s,

            'data.skills' => ['array'], 'data.skills.*' => $list, 'data.skills.*.*' => $item,

            'data.certifications' => $list,
            'data.certifications.*.name' => $s, 'data.certifications.*.issuer' => $s,
            'data.certifications.*.date' => $s, 'data.certifications.*.link' => $url, 'data.certifications.*.description' => $text,

            'data.projects' => $list,
            'data.projects.*.name' => $s, 'data.projects.*.description' => $text,
            'data.projects.*.date' => $s, 'data.projects.*.link' => $url,
            'data.projects.*.technologies' => $list, 'data.projects.*.technologies.*' => $item,

            'data.preferences.job_titles' => $list, 'data.preferences.job_titles.*' => $item,
            'data.preferences.industries' => $list, 'data.preferences.industries.*' => $item,
            'data.preferences.locations' => $list, 'data.preferences.locations.*' => $item,
            'data.preferences.work_setups' => $list, 'data.preferences.work_setups.*' => Rule::in(['remote', 'hybrid', 'onsite']),
            'data.preferences.employment_types' => $list, 'data.preferences.employment_types.*' => Rule::in(self::EMPLOYMENT_TYPES),
            'data.preferences.salary_min' => ['nullable', 'integer', 'min:0'],
            'data.preferences.salary_max' => ['nullable', 'integer', 'min:0', 'gte:data.preferences.salary_min'],
            'data.preferences.salary_currency' => ['nullable', 'string', 'size:3'],
            'data.preferences.experience_level' => ['nullable', Rule::in(['', 'entry', 'junior', 'mid', 'senior', 'lead'])],
        ], [], [
            // Names in error messages ("The email address field must be…", not "data.personal.email").
            'data.personal.full_name' => 'full name', 'data.personal.email' => 'email address', 'data.personal.phone' => 'phone number',
            'data.personal.location' => 'location', 'data.personal.linkedin' => 'LinkedIn', 'data.personal.github' => 'GitHub',
            'data.personal.portfolio' => 'website', 'data.summary.years_experience' => 'years of experience',
            'data.experience.*.company' => 'company name', 'data.experience.*.title' => 'job title',
            'data.education.*.school' => 'school', 'data.certifications.*.name' => 'name', 'data.projects.*.name' => 'name',
            'data.preferences.salary_min' => 'expected salary', 'data.preferences.salary_max' => 'maximum salary',
            'data.preferences.work_setups.*' => 'work setup', 'data.preferences.employment_types.*' => 'employment type',
        ]);

        $profile = Profile::current();
        $profile->data = array_replace_recursive(Profile::BLANK, $this->onlyKnown($valid['data']));
        if ($valid['synced_resume_id'] ?? null) {
            $profile->synced_resume_id = $valid['synced_resume_id'];
            $profile->synced_at = now();
        }
        $profile->save();

        return $this->present($profile);
    }

    // Profile fields proposed from one resume. Not saved: the user reviews them in the form first.
    public function importFromResume(Resume $resume, ResumeAi $ai)
    {
        abort_unless($resume->data, 422, 'Extract the resume information first.');

        return ['resume_id' => $resume->id, 'data' => $ai->profileFromResume($resume->data)];
    }

    // Drafts the summary fields from the profile as it is in the form (unsaved edits included). Not saved.
    public function writeSummary(Request $request, ResumeAi $ai)
    {
        $data = $request->validate(['data' => ['required', 'array']])['data'];
        $hasFacts = ! empty($data['experience']) || ! empty($data['education']) || ! empty(array_filter($data['skills'] ?? []));
        abort_unless($hasFacts, 422, 'Add your work experience, education or skills first, so there is something to write from.');

        return $ai->writeSummary($data);
    }

    // The profile plus the newest extracted resume that isn't in it yet (drives the "sync" banner).
    private function present(Profile $profile): array
    {
        $newer = Resume::whereNull('tailored_from_id')->whereNotNull('extracted_at')
            ->when($profile->synced_at, fn ($q) => $q->where('extracted_at', '>', $profile->synced_at))
            ->latest('extracted_at')->first(['id', 'title', 'extracted_at']);

        return [
            'data' => $profile->data,
            'synced_resume_id' => $profile->synced_resume_id,
            'synced_at' => $profile->synced_at,
            'updated_at' => $profile->updated_at,
            'newer_resume' => $newer,
        ];
    }

    // Drop any keys not in Profile::BLANK (sections and their fields); list items are kept as validated.
    private function onlyKnown(array $data): array
    {
        $out = [];
        foreach (Profile::BLANK as $section => $blank) {
            $value = $data[$section] ?? $blank;
            $out[$section] = $this->emptyStrings(array_is_list($blank) ? array_values($value) : array_intersect_key($value, $blank), $blank);
        }

        return $out;
    }

    // Laravel turns empty inputs into null; store "" for text so the form always gets strings.
    // Fields whose blank is null (years, salary) stay null.
    private function emptyStrings(mixed $value, mixed $blank): mixed
    {
        if (is_array($value)) {
            foreach ($value as $key => $item) {
                $value[$key] = $this->emptyStrings($item, is_array($blank) && array_key_exists($key, $blank) ? $blank[$key] : '');
            }

            return $value;
        }

        return $value ?? $blank;
    }
}
