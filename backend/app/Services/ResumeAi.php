<?php

namespace App\Services;

use App\Models\Resume;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;
use ZipArchive;

/**
 * Every Claude call for the resume and profile modules. Each method returns a plain array that
 * matches its JSON schema (structured outputs), ready to store.
 */
class ResumeAi extends ClaudeService
{
    /** Pull structured information out of the uploaded file. */
    public function extract(Resume $resume): array
    {
        return $this->ask(
            system: <<<'TXT'
                You extract information from resumes into JSON.
                Copy what the resume says; do not infer, embellish or fill gaps. If something is not in the resume, use null or an empty list.
                Keep the candidate's own wording for summaries and responsibilities, split into one item per bullet or sentence.
                Dates stay as written (e.g. "Jan 2022", "2019", "Present").
                TXT,
            content: [...$this->fileBlocks($resume), ['type' => 'text', 'text' => 'Extract the information from this resume.']],
            schema: self::resumeSchema(),
        );
    }

    /** Review the resume: what works, what's missing, what to fix. Reads the file too, to judge layout. */
    // The scoring rubric: the same for every resume and every run, so scores are comparable (an improved
    // version is measured exactly like the original). Five criteria, 20 points each; overall = their sum.
    private const RUBRIC = <<<'TXT'
        Score each criterion out of 20 by adding up these points (give a point only for what the resume actually shows):
        - completeness (20): name, email, phone and location (4); a summary (3); every job has title, company, start and end dates (6); education with school, degree and dates or expected date (4); a skills section (3).
        - relevant_skills (20): skills are specific named tools, software or abilities, not vague words (8); the skills are shown in use in the experience bullets (8); most relevant first, no padding with generic soft skills (4).
        - work_experience (20): bullets start with action verbs (5); bullets state concrete results, scope or numbers (8; only what is written counts); specific to the job rather than generic duties (5); most recent first (2).
        - professional_summary (20): 3-4 sentences naming the target role (5); its strongest real skills (5); a concrete experience or achievement (6); no clichés and no "I" (4).
        - formatting_readability (20): one clear layout with consistent headings and dates (8); concise bullets of one to two lines (6); ATS-friendly: plain text, no tables, images or multi-column text (6).
        TXT;

    /** Review the resume against the rubric: what works, what's missing, what to fix. */
    public function analyze(Resume $resume): array
    {
        $content = $resume->file_path ? $this->fileBlocks($resume) : [];
        $content[] = ['type' => 'text', 'text' => "Resume information:\n".json_encode($resume->data, JSON_PRETTY_PRINT)];
        $content[] = ['type' => 'text', 'text' => 'Review this resume.'];
        $layout = $resume->file_path
            ? 'Judge formatting from the original file.'
            : 'This version has no file: it is printed with TrabaHanap\'s standard template (one column, clear headings, consistent dates, plain ATS-friendly text). Give the layout points for that template and judge only what the content controls (bullet length, consistency).';

        $result = $this->ask(
            system: <<<TXT
                You are an experienced recruiter reviewing a job seeker's resume, for any field (not only tech). Be specific, honest and kind.
                {$this->rubric()}
                {$layout}
                Base every comment on what is actually in the resume and quote or name the part you mean.
                Suggestions must be things the candidate can do; never suggest adding experience or skills they may not have, instead suggest how to present what they have, or what to add if it is true.
                TXT,
            content: $content,
            schema: self::analysisSchema(),
        );

        // Consistent numbers: each criterion 0-20, overall exactly their sum.
        $result['criteria'] = array_map(fn ($c) => [...$c, 'score' => max(0, min(20, (int) $c['score'])), 'max' => 20], $result['criteria']);
        $result['overall_score'] = array_sum(array_column($result['criteria'], 'score'));

        return $result;
    }

    private function rubric(): string
    {
        return self::RUBRIC;
    }

    /**
     * Turn a resume's extracted information into Professional Profile fields (shape: Profile::BLANK,
     * without preferences, which a resume doesn't state).
     */
    public function profileFromResume(array $data): array
    {
        return self::toProfileShape($this->ask(
            system: <<<'TXT'
                You copy a job seeker's resume information into their professional profile.
                Use only what the resume information says; never infer or add anything. Leave a field empty ("" or [] or null) when the resume doesn't state it.
                - personal: put LinkedIn, GitHub and portfolio URLs from the contact links in their own fields (full URLs, add https:// if missing).
                - summary: introduction is the resume summary. Fill career_objective, career_goals and employment_status only if the resume states them; employment_status is one of employed, unemployed, freelancing, student, or "". years_experience only if stated.
                - experience: split each job's bullets into responsibilities (duties) and achievements (bullets with a result, number or recognition). technologies are the tools and languages named in that job's bullets. employment_type only if stated (full_time, part_time, contract, freelance, internship), else "".
                - education: split the degree into degree (e.g. "Bachelor of Science") and field_of_study (e.g. "Information Technology"). graduation_date is the end date as written.
                - skills: list every technical and soft skill the resume names, once each, with a category: programming_languages, frontend, backend, databases, frameworks, tools, soft_skills or other. Put a framework or library (React, Laravel) in frameworks, not in frontend or backend; frontend and backend are for other skills of that kind (HTML, CSS, REST APIs). tools are software tools (Git, Docker, VS Code, Figma, Excel). other is every professional skill that isn't technical or soft (customer service, bookkeeping, patient care, sales, lesson planning).
                - Keep dates as written in the resume.
                TXT,
            content: [['type' => 'text', 'text' => "<resume_information>\n".json_encode($data, JSON_PRETTY_PRINT)."\n</resume_information>\n\nCopy this into the profile."]],
            schema: self::profileSchema(),
            effort: 'low', // a mapping task
        ));
    }

    /**
     * Draft the Professional summary fields from the rest of the profile. Facts only from the
     * profile; goals and objective follow its preferences and career path. Nothing is saved.
     */
    public function writeSummary(array $profile): array
    {
        unset($profile['summary']['introduction'], $profile['summary']['career_objective'], $profile['summary']['career_goals']);

        return $this->ask(
            system: <<<'TXT'
                You write the professional summary section of a job seeker's profile, from their own profile information.
                Use only facts the profile states: titles, employers, years, skills, achievements, education. Never invent numbers, employers, skills or results, and don't overstate seniority.
                - introduction: 3 to 4 sentences for the top of a resume. Who they are, what they do best, with their strongest real skills and a concrete achievement if the profile has one. Resume style: no "I", no clichés ("hardworking", "passionate", "go-getter").
                - career_objective: 1 to 2 sentences on the role they're after now, from their preferred job titles and industries (or their latest role if none), and what they bring to it.
                - career_goals: 1 to 2 sentences on where they want to grow over the next few years, following naturally from their path and preferences. Keep it modest and plausible.
                Write in clear, simple English that reads naturally for employers in the Philippines.
                TXT,
            content: [['type' => 'text', 'text' => "<profile>\n".json_encode($profile, JSON_PRETTY_PRINT)."\n</profile>\n\nWrite the summary fields."]],
            schema: self::object(['introduction' => self::STR, 'career_objective' => self::STR, 'career_goals' => self::STR]),
            effort: 'low',
        );
    }

    /**
     * Rewrite the resume for one job using only the candidate's verified information:
     * the resume's extracted data, plus their Professional Profile when they have filled it in.
     * Returns ['resume' => <resume schema>, 'notes' => ['changes' => [...], 'gaps' => [...]]].
     */
    public function tailor(array $data, string $jobTitle, string $jobDescription, ?array $profile = null): array
    {
        $profileBlock = $profile ? "<professional_profile>\n".json_encode($profile, JSON_PRETTY_PRINT)."\n</professional_profile>\n\n" : '';

        $result = $this->ask(
            system: <<<'TXT'
                You tailor a job seeker's resume to one job posting.
                The candidate's verified information is the only source of truth: the resume information, and their professional profile when given. The profile is maintained by the candidate and is the main reference; where the two disagree, follow the profile. Preferences in the profile are not qualifications; never put them on the resume.
                You must not invent or inflate anything: no new employers, titles, dates, degrees, certifications, projects, skills, tools, numbers or achievements.
                You may: reorder sections and bullets, choose which items to keep or drop, rewrite the professional title and summary, rephrase bullets to use the job's vocabulary when it describes the same thing, and put the most relevant skills first.
                A skill may only appear if it is in the verified information or plainly shown by a verified bullet.
                List every requirement of the job the candidate does not meet in gaps, so they can decide what to do. Do not hide gaps in the resume.
                In changes, explain each change and point to the verified fact it comes from.
                TXT,
            content: [[
                'type' => 'text',
                'text' => "<resume_information>\n".json_encode($data, JSON_PRETTY_PRINT)."\n</resume_information>\n\n"
                    .$profileBlock
                    ."<job title=\"".e($jobTitle)."\">\n{$jobDescription}\n</job>\n\nTailor the resume for this job.",
            ]],
            schema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['resume', 'changes', 'gaps'],
                'properties' => [
                    'resume' => self::resumeSchema(),
                    'changes' => ['type' => 'array', 'items' => self::object(['change' => self::STR, 'based_on' => self::STR])],
                    'gaps' => self::STRS,
                ],
            ],
            effort: 'high', // honesty matters more than speed here
        );

        return ['resume' => $result['resume'], 'notes' => ['changes' => $result['changes'], 'gaps' => $result['gaps']]];
    }

    // Shared rules for every resume Claude writes: strong, but only from verified facts.
    private const WRITING_RULES = <<<'TXT'
        The candidate's verified information is the only source of truth. You must not invent or inflate anything: no new employers, titles, dates, degrees, certifications, projects, skills, tools, numbers or achievements.
        Write it as strongly as the facts allow:
        - professional_title: the role they are going for (preferred job title, else their latest title).
        - summary: 3-4 sentences, resume style (no "I"), leading with their strongest real skills and experience; no clichés ("hardworking", "passionate", "go-getter", "team player").
        - responsibilities: one achievement-focused bullet per item, starting with a strong action verb (Built, Led, Reduced, Handled...), naming the tools used and the result when the information gives one. Keep any numbers exactly as given; never add numbers.
        - Most relevant and recent first; drop filler; keep every job, school and certification they have.
        - technical_skills: their skills, most relevant first, as short skill names.
        Dates stay as written. Use null or empty lists for anything not given.
        In changes, explain each important choice and the fact it is based on.
        In gaps, list the most valuable things the resume is missing that only the candidate can add if they are true (e.g. "Add a number to your sales results, such as how many clients you handled"), at most 6.
        TXT;

    /** Write a complete resume from the Professional Profile (for people who have none). */
    public function build(array $profile): array
    {
        return $this->writeResume(
            'You write a complete, professional resume for a job seeker from their professional profile.',
            "<professional_profile>\n".json_encode($profile, JSON_PRETTY_PRINT)."\n</professional_profile>\n\nWrite the resume.",
        );
    }

    /**
     * Rewrite a resume stronger, using its analysis (when there is one) and the profile as extra
     * verified facts. Returns ['resume' => …, 'notes' => ['changes' => …, 'gaps' => …]].
     */
    public function improve(array $data, ?array $analysis, ?array $profile): array
    {
        $text = "<resume_information>\n".json_encode($data, JSON_PRETTY_PRINT)."\n</resume_information>\n\n"
            .($profile ? "<professional_profile>\n".json_encode($profile, JSON_PRETTY_PRINT)."\n</professional_profile>\n\n" : '')
            .($analysis ? "<recruiter_review>\n".json_encode($analysis, JSON_PRETTY_PRINT)."\n</recruiter_review>\n\n" : '')
            .'Rewrite this resume as strongly as the facts allow.';

        return $this->writeResume(
            'You rewrite a job seeker\'s resume to make it as strong as possible for recruiters and applicant tracking systems. '
            .'It will be scored again with this rubric, so earn every point the verified information allows; '
            .'points that need facts you don\'t have go in gaps:'."\n".self::RUBRIC."\n"
            .'Fix every point of the recruiter review that the verified information allows; the rest go in gaps. '
            .'The professional profile, when given, is verified too and maintained by the candidate; where the two disagree, follow the profile. Preferences are not qualifications.',
            $text,
        );
    }

    private function writeResume(string $role, string $text): array
    {
        $result = $this->ask(
            system: $role."\n".self::WRITING_RULES,
            content: [['type' => 'text', 'text' => $text]],
            schema: [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['resume', 'changes', 'gaps'],
                'properties' => [
                    'resume' => self::resumeSchema(),
                    'changes' => ['type' => 'array', 'items' => self::object(['change' => self::STR, 'based_on' => self::STR])],
                    'gaps' => self::STRS,
                ],
            ],
            effort: 'high', // honesty and quality matter more than speed here
        );

        return ['resume' => $result['resume'], 'notes' => ['changes' => $result['changes'], 'gaps' => $result['gaps']]];
    }

    /** PDF goes to Claude as a document (it sees the layout); DOCX as its plain text. */
    private function fileBlocks(Resume $resume): array
    {
        $bytes = Storage::disk('local')->get($resume->file_path);

        if ($resume->isPdf()) {
            return [['type' => 'document', 'source' => ['type' => 'base64', 'mediaType' => 'application/pdf', 'data' => base64_encode($bytes)]]];
        }

        return [['type' => 'text', 'text' => "<resume format=\"docx\">\n".$this->docxText($resume)."\n</resume>"]];
    }

    private function docxText(Resume $resume): string
    {
        $zip = new ZipArchive;
        if ($zip->open(Storage::disk('local')->path($resume->file_path)) !== true) {
            throw new HttpException(422, 'This DOCX file could not be opened.');
        }
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        if ($xml === false) {
            throw new HttpException(422, 'This DOCX file has no document body.');
        }

        // Paragraph and line breaks become newlines, tabs stay tabs, everything else is just text.
        $xml = preg_replace(['#</w:p>#', '#<w:br[^>]*/>#', '#<w:tab/>#'], ["\n", "\n", "\t"], $xml);
        $text = html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');

        return trim(preg_replace("/\n{3,}/", "\n\n", $text));
    }

    // ---- JSON schemas ----

    public static function resumeSchema(): array
    {
        return self::object([
            'full_name' => self::NSTR,
            'professional_title' => self::NSTR,
            'contact' => self::object(['email' => self::NSTR, 'phone' => self::NSTR, 'location' => self::NSTR, 'links' => self::STRS]),
            'summary' => self::NSTR,
            'work_experience' => ['type' => 'array', 'items' => self::object([
                'company' => self::STR, 'position' => self::STR, 'location' => self::NSTR,
                'start_date' => self::NSTR, 'end_date' => self::NSTR, 'responsibilities' => self::STRS,
            ])],
            'education' => ['type' => 'array', 'items' => self::object([
                'school' => self::STR, 'degree' => self::NSTR, 'start_date' => self::NSTR, 'end_date' => self::NSTR, 'details' => self::NSTR,
            ])],
            'technical_skills' => self::STRS,
            'certifications' => ['type' => 'array', 'items' => self::object(['name' => self::STR, 'issuer' => self::NSTR, 'date' => self::NSTR])],
            'projects' => ['type' => 'array', 'items' => self::object(['name' => self::STR, 'description' => self::NSTR, 'technologies' => self::STRS])],
            'languages' => ['type' => 'array', 'items' => self::object(['language' => self::STR, 'proficiency' => self::NSTR])],
        ]);
    }

    private const SKILL_CATEGORIES = ['programming_languages', 'frontend', 'backend', 'databases', 'frameworks', 'tools', 'soft_skills', 'other'];
    private const EMPLOYMENT_STATUSES = ['employed', 'unemployed', 'freelancing', 'student'];
    private const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'freelance', 'internship'];

    /**
     * The answer's shape is kept small enough for the API's structured-output limit: skills come as
     * one list of {name, category} and the fixed choices as plain strings. This puts them back into
     * the profile's shape (Profile::BLANK): skills grouped by category, unknown choices emptied.
     */
    private static function toProfileShape(array $answer): array
    {
        $skills = array_fill_keys(self::SKILL_CATEGORIES, []);
        foreach ($answer['skills'] ?? [] as $skill) {
            $name = trim($skill['name'] ?? '');
            $category = in_array($skill['category'] ?? '', self::SKILL_CATEGORIES, true) ? $skill['category'] : 'other';
            if ($name !== '' && ! in_array($name, $skills[$category], true)) {
                $skills[$category][] = $name;
            }
        }
        $answer['skills'] = $skills;

        if (! in_array($answer['summary']['employment_status'] ?? '', self::EMPLOYMENT_STATUSES, true)) {
            $answer['summary']['employment_status'] = '';
        }
        foreach ($answer['experience'] ?? [] as $i => $job) {
            if (! in_array($job['employment_type'] ?? '', self::EMPLOYMENT_TYPES, true)) {
                $answer['experience'][$i]['employment_type'] = '';
            }
        }

        return $answer;
    }

    // Profile::BLANK minus preferences, as a schema (skills flattened, see toProfileShape).
    private static function profileSchema(): array
    {
        $fields = fn (array $names) => self::object(array_fill_keys($names, self::STR));

        return self::object([
            'personal' => $fields(['full_name', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio']),
            'summary' => self::object([
                'career_objective' => self::STR, 'introduction' => self::STR, 'career_goals' => self::STR,
                'years_experience' => ['type' => ['number', 'null']],
                'employment_status' => self::STR, // one of EMPLOYMENT_STATUSES or ""
            ]),
            'experience' => ['type' => 'array', 'items' => self::object([
                'company' => self::STR, 'title' => self::STR,
                'employment_type' => self::STR, // one of EMPLOYMENT_TYPES or ""
                'start_date' => self::STR, 'end_date' => self::STR,
                'responsibilities' => self::STRS, 'achievements' => self::STRS, 'technologies' => self::STRS,
            ])],
            'education' => ['type' => 'array', 'items' => $fields(['school', 'degree', 'field_of_study', 'graduation_date'])],
            'skills' => ['type' => 'array', 'items' => $fields(['name', 'category'])], // category: one of SKILL_CATEGORIES
            'certifications' => ['type' => 'array', 'items' => $fields(['name', 'issuer', 'date', 'link', 'description'])],
            'projects' => ['type' => 'array', 'items' => self::object([
                'name' => self::STR, 'description' => self::STR, 'date' => self::STR, 'link' => self::STR, 'technologies' => self::STRS,
            ])],
        ]);
    }

    private static function analysisSchema(): array
    {
        return self::object([
            'overall_score' => ['type' => 'integer'],
            'verdict' => self::STR, // one or two sentences
            'criteria' => ['type' => 'array', 'items' => self::object([
                'key' => ['type' => 'string', 'enum' => ['completeness', 'relevant_skills', 'work_experience', 'professional_summary', 'formatting_readability']],
                'score' => ['type' => 'integer'],
                'assessment' => self::STR,
            ])],
            'strengths' => self::STRS,
            'missing_information' => self::STRS,
            'suggestions' => ['type' => 'array', 'items' => self::object([
                'priority' => ['type' => 'string', 'enum' => ['high', 'medium', 'low']],
                'suggestion' => self::STR,
            ])],
        ]);
    }
}
