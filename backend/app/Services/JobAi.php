<?php

namespace App\Services;

use App\Models\JobPosting;

/** Claude calls for the AI Job Finder: analyse a posting, check fit with the profile, compare with a resume. */
class JobAi extends ClaudeService
{
    /** Structure the posting into the job-details sections. Only what the posting says. */
    public function analyze(JobPosting $job): array
    {
        return $this->ask(
            system: <<<'TXT'
                You read a job posting and organise it for a job seeker.
                Use only what the posting says. When it doesn't state something, use null or an empty list; never guess salaries, deadlines or requirements.
                Lists hold short items in the posting's own terms. required_qualifications are must-haves; preferred_qualifications are nice-to-haves ("bonus", "preferred", "plus").
                technical_skills are the specific technologies, languages and tools the posting names.
                experience_level is your reading of the level the posting asks for, from its requirements (years, scope): one of entry, junior, mid, senior, lead, or null.
                red_flags are concrete concerns a careful applicant would want to check (e.g. unpaid trial work, vague pay, unrealistic requirements); empty if none.
                TXT,
            content: [['type' => 'text', 'text' => $this->posting($job)."\n\nOrganise this posting."]],
            schema: self::object([
                'summary' => self::STR,
                'company_overview' => self::NSTR,
                'responsibilities' => self::STRS,
                'required_qualifications' => self::STRS,
                'preferred_qualifications' => self::STRS,
                'technical_skills' => self::STRS,
                'salary_and_benefits' => self::NSTR,
                'work_arrangement' => self::NSTR,
                'application_deadline' => self::NSTR,
                'experience_level' => self::NSTR, // entry | junior | mid | senior | lead (see prompt)
                'red_flags' => self::STRS,
            ]),
            effort: 'low',
        );
    }

    /** How well the job fits the candidate's Professional Profile, including their preferences. */
    public function compatibility(JobPosting $job, array $profile): array
    {
        return $this->ask(
            system: <<<'TXT'
                You judge how well a job fits a job seeker, from their professional profile. Be honest and specific; do not flatter.
                Base every point on the profile and the posting; never assume skills or experience the profile doesn't show.
                score is 0-100 for overall fit (qualifications matter most; preferences adjust it).
                For each preference (location, work setup, salary, employment type), say whether the job fits it, or that it's unknown if either side doesn't state it.
                TXT,
            content: [['type' => 'text', 'text' => "<professional_profile>\n".json_encode($profile, JSON_PRETTY_PRINT)."\n</professional_profile>\n\n".$this->posting($job)."\n\nHow well does this job fit me?"]],
            schema: self::object([
                'score' => ['type' => 'integer'],
                'verdict' => self::STR,
                'strengths' => self::STRS,
                'gaps' => self::STRS,
                'preferences' => ['type' => 'array', 'items' => self::object([
                    'preference' => ['type' => 'string', 'enum' => ['location', 'work_setup', 'salary', 'employment_type']],
                    'fit' => ['type' => 'string', 'enum' => ['fits', 'partly', 'does_not_fit', 'unknown']],
                    'note' => self::STR,
                ])],
                'recommendation' => self::STR,
            ]),
        );
    }

    /** Requirement-by-requirement check against one resume version. */
    public function compareResume(JobPosting $job, array $resume): array
    {
        return $this->ask(
            system: <<<'TXT'
                You compare a resume with a job posting, requirement by requirement.
                For each requirement in the posting, mark it met, partial or missing, and quote or name the resume evidence (null when missing). Never count something the resume doesn't show.
                coverage is the percentage of requirements met (partial counts half).
                missing_keywords are terms from the posting the resume lacks; suggestions say how to present real experience better, never to add experience the candidate may not have.
                TXT,
            content: [['type' => 'text', 'text' => "<resume>\n".json_encode($resume, JSON_PRETTY_PRINT)."\n</resume>\n\n".$this->posting($job)."\n\nCompare my resume with this job."]],
            schema: self::object([
                'coverage' => ['type' => 'integer'],
                'summary' => self::STR,
                'requirements' => ['type' => 'array', 'items' => self::object([
                    'requirement' => self::STR,
                    'status' => ['type' => 'string', 'enum' => ['met', 'partial', 'missing']],
                    'evidence' => self::NSTR,
                ])],
                'missing_keywords' => self::STRS,
                'suggestions' => self::STRS,
            ]),
        );
    }

    private function posting(JobPosting $job): string
    {
        $facts = array_filter([
            'Title' => $job->title, 'Company' => $job->company, 'Location' => $job->location,
            'Work setup' => $job->work_setup, 'Employment type' => $job->employment_type,
            'Salary' => $job->salary_text, 'Deadline' => $job->deadline?->toDateString(),
        ]);
        $head = collect($facts)->map(fn ($v, $k) => "{$k}: {$v}")->implode("\n");

        return "<job_posting>\n{$head}\n\n{$job->description}\n</job_posting>";
    }
}
