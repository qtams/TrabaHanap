<?php

namespace App\Services;

use App\Models\JobPosting;
use App\Models\JobSearch;
use App\Models\Profile;
use App\Models\Resume;
use App\Services\JobSources\Greenhouse;
use App\Services\JobSources\Himalayas;
use App\Services\JobSources\JobSource;
use App\Services\JobSources\Lever;
use App\Services\JobSources\Remotive;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Throwable;

/** Runs a search across the selected sources, filters locally, stores the jobs and the search. */
class JobFinder
{
    public const SOURCES = [Himalayas::class, Remotive::class, Greenhouse::class, Lever::class];

    /** Sources' terms ask that expired listings be removed; called before searches and listings. */
    public static function purgeExpired(): void
    {
        JobPosting::where('expires_at', '<', now())->delete();
    }

    private const MAX_RESULTS = 100;

    /** @return list<JobSource> */
    public function sources(): array
    {
        return array_map(fn ($class) => app($class), self::SOURCES);
    }

    // Narrowing filters from the Filters panel. Titles, keywords and places say what is relevant; these say what fits.
    private const FILTERS = ['work_setups', 'employment_types', 'levels', 'posted_within', 'salary_min', 'salary_max', 'company'];

    /**
     * Jobs from the sources, most relevant first. Each job gets a tier:
     *  - match:   fits what they searched for (titles or what was typed, places, keywords, filters);
     *  - related: similar roles that mention one of their skills (from the search, else their profile);
     *  - fits:    (nothing searched, filters on) the other jobs that fit the filters, after related;
     *  - other:   every other job the sources have. Only when no filter is on: browsing shows everything,
     *             while a filter means "only what fits", so then the list stops after related.
     * Newest first within each tier. Filters apply to related jobs too.
     *
     * @return array{search: JobSearch, jobs: Collection, counts: array{match: int, related: int, other: int}, filtered: bool, notes: list<string>}
     */
    public function search(array $params): array
    {
        self::purgeExpired();

        $filtered = self::hasFilters($params);
        $searched = (bool) (self::searchTermsOf($params) || self::keywordsOf($params));
        // Nothing typed and no titles or keywords: what is "related" comes from their own profile / resume.
        $about = $searched ? $params : [...$params, ...self::fromProfile()];

        [$found, $notes] = $this->fetchAll($params);
        $relatedParams = $this->related($about, $filtered);
        [$more, $moreNotes] = $this->fetchAll($relatedParams);
        $found += $more;
        $notes = [...$notes, ...$moreNotes];
        if (! $filtered || ! $searched) {
            // Every job: recent postings with no title, in their places and anywhere.
            $everything = [...$params, 'query' => null, 'titles' => [], 'keywords' => [], 'company' => null, 'pages' => 8,
                'locations' => array_values(array_unique([...self::locationsOf($params), 'Philippines', null], SORT_REGULAR))];
            [$more, $allNotes] = $this->fetchAll($everything);
            $found += $more;
            $notes = [...$notes, ...$allNotes];
        }
        $notes = array_values(array_unique($notes));

        $live = collect($found)->reject(fn ($job) => $job['expires_at'] && Carbon::parse($job['expires_at'])->isPast());
        $newest = fn (Collection $jobs) => $jobs->sortByDesc(fn ($job) => $job['posted_at'] ? strtotime($job['posted_at']) : 0);

        // Related to them: only when we know something about them (their search, else their profile).
        $knowsThem = (bool) (self::searchTermsOf($about) || self::keywordsOf($about));
        $relatedIn = function (Collection $pool) use ($relatedParams, $newest, $knowsThem) {
            if (! $knowsThem) {
                return collect();
            }
            $found = $newest($pool->filter(fn ($job) => $this->matches($job, $relatedParams)));
            if ($found->isEmpty() && ! empty($relatedParams['must_mention'])) { // nobody mentions their skills: similar titles only
                $found = $newest($pool->filter(fn ($job) => $this->matches($job, [...$relatedParams, 'must_mention' => []])));
            }

            return $found->take(self::RELATED_MAX);
        };
        $fitsSearch = fn (Collection $pool) => $newest($pool->filter(fn ($job) => $this->matches($job, $params)))->take(self::MAX_RESULTS);

        if ($searched) { // what they searched for, then related
            $match = $fitsSearch($live);
            $related = $relatedIn($live->diffKeys($match));
            $fits = collect();
        } else { // related to them first, then (with filters) the other jobs that fit the filters
            $match = collect();
            $related = $relatedIn($live);
            $fits = $filtered ? $fitsSearch($live->diffKeys($related)) : collect();
        }
        $rest = $live->diffKeys($match)->diffKeys($fits);

        $other = collect();
        if (! $filtered) {
            // Everything else: ones that mention their skills first, then the rest; newest first in each.
            $skills = array_map(fn ($k) => mb_strtolower(preg_replace('/\.js$/i', '', $k)), self::keywordsOf($about));
            $mentionsSkill = fn ($job) => $skills && collect($skills)->contains(fn ($k) => str_contains(mb_strtolower("{$job['title']} {$job['tags']} {$job['description']}"), $k));
            $other = $rest->diffKeys($related)
                ->sortBy([fn ($a, $b) => $mentionsSkill($b) <=> $mentionsSkill($a), fn ($a, $b) => strtotime($b['posted_at'] ?? '0') <=> strtotime($a['posted_at'] ?? '0')])
                ->take(self::OTHER_MAX);
        }

        $tiers = [...$match->map(fn () => 'match'), ...$related->map(fn () => 'related'), ...$fits->map(fn () => 'fits'), ...$other->map(fn () => 'other')];

        return DB::transaction(function () use ($params, $found, $tiers, $notes, $filtered) {
            $postings = $this->store(array_intersect_key($found, $tiers));
            $jobs = collect($tiers)->map(fn ($tier, $key) => ($postings[$key] ?? null)?->setAttribute('tier', $tier))->filter()->values();
            $matchIds = $jobs->where('tier', 'match')->pluck('id');

            // The same search again (e.g. the automatic one each time the page opens) refreshes the
            // latest history entry instead of adding a duplicate. Named searches are kept as they are.
            // History keeps the matches.
            $search = JobSearch::latest('id')->first();
            if ($search && ! $search->name && $search->params == $params) {
                $search->forceFill(['results_count' => $matchIds->count(), 'created_at' => now()])->save();
                $search->jobs()->sync($matchIds);
            } else {
                $search = JobSearch::create(['params' => $params, 'results_count' => $matchIds->count()]);
                $search->jobs()->attach($matchIds);
            }

            $counts = ['match' => 0, 'related' => 0, 'fits' => 0, 'other' => 0, ...$jobs->countBy('tier')->all()];

            return ['search' => $search, 'jobs' => $jobs, 'counts' => $counts, 'filtered' => $filtered, 'notes' => $notes];
        });
    }

    /** Whether any narrowing filter is on (work setup, job type, level, date, salary, company). */
    public static function hasFilters(array $p): bool
    {
        return collect(self::FILTERS)->contains(fn ($f) => is_array($p[$f] ?? null) ? $p[$f] !== [] : trim((string) ($p[$f] ?? '')) !== '');
    }

    /**
     * Job titles and skills from the signed-in user's Professional Profile (else their latest resume),
     * to tell what is related to them when they haven't searched for anything.
     */
    private static function fromProfile(): array
    {
        if (! Auth::hasUser()) {
            return [];
        }
        $p = Profile::query()->first()?->data; // scoped to the user
        $titles = $p ? ($p['preferences']['job_titles'] ?: array_column($p['experience'], 'title')) : [];
        $skills = $p ? collect($p['skills'])->except('soft_skills')->flatten()->all() : [];

        if (! $titles || ! $skills) {
            $resume = Resume::whereNull('tailored_from_id')->whereNotNull('data')->latest()->first()?->data ?? [];
            $titles = $titles ?: array_filter([$resume['professional_title'] ?? null, ...array_column($resume['work_experience'] ?? [], 'position')]);
            $skills = $skills ?: ($resume['technical_skills'] ?? []);
        }

        return [
            'titles' => array_slice(array_values(array_unique(array_filter(array_map('trim', $titles)))), 0, 5),
            'keywords' => array_slice(array_values(array_unique(array_filter(array_map(fn ($k) => self::shortKeyword((string) $k), $skills)))), 0, 10),
        ];
    }

    /**
     * Save postings in one go (insert new, refresh known ones; the user's own state lives in UserJob)
     * and return the models keyed like the input ("source:external_id").
     */
    private function store(array $jobs): array
    {
        if (! $jobs) {
            return [];
        }
        $now = now();
        $rows = array_map(fn ($job) => [...$job, 'created_at' => $now, 'updated_at' => $now], array_values($jobs));
        foreach (array_chunk($rows, 100) as $chunk) {
            JobPosting::upsert($chunk, ['source', 'external_id'], array_diff(array_keys($chunk[0]), ['source', 'external_id', 'created_at']));
        }

        $models = [];
        foreach (collect($jobs)->groupBy('source', true) as $source => $group) {
            JobPosting::where('source', $source)->whereIn('external_id', $group->pluck('external_id'))->get()
                ->each(function ($m) use (&$models) { $models["{$m->source}:{$m->external_id}"] = $m; });
        }

        return $models;
    }

    /**
     * Ask every selected source, once per job title × location (sources cache their answers), and
     * merge. Returns [jobs keyed "source:id" so one found twice is kept once, notes].
     */
    private function fetchAll(array $params): array
    {
        $wanted = $params['sources'] ?? [];
        $combos = [];
        // locations may end with null = "anywhere too" (the all-jobs fetch).
        $places = self::locationsOf($params);
        if (in_array(null, $params['locations'] ?? [], true) || ! $places) {
            $places[] = null;
        }
        foreach (self::searchTermsOf($params) ?: [null] as $title) {
            foreach (array_unique($places, SORT_REGULAR) as $location) {
                // A keyword list is matched here (any of them), not sent to the sources, where it would
                // become one long query that every result must contain.
                $keywords = is_array($params['keywords'] ?? null) ? null : ($params['keywords'] ?? null);
                $combos[] = [...$params, 'title' => $title, 'location' => $location, 'keywords' => $keywords];
            }
        }

        $found = [];
        $notes = [];
        foreach ($this->sources() as $source) {
            if ($wanted && ! in_array($source->key(), $wanted, true)) {
                continue;
            }
            try {
                foreach ($combos as $query) {
                    $result = $source->fetch($query);
                    foreach ($result['jobs'] as $job) {
                        $found["{$job['source']}:{$job['external_id']}"] = $job;
                    }
                    array_push($notes, ...$result['notes']);
                }
            } catch (Throwable $e) {
                report($e);
                $notes[] = "{$source->name()} could not be reached right now.";
            }
        }

        return [$found, array_values(array_unique($notes))];
    }

    private const RELATED_MAX = 150;

    private const OTHER_MAX = 400; // "everything else" from the sources

    // Kinds of work, and title words that count as the same kind (for related jobs).
    private const ROLE_FAMILIES = [
        '/develop|engineer|programm|software|front.?end|back.?end|full.?stack|web|devops/i' => ['Developer', 'Engineer', 'Programmer'],
        '/customer|csr|call cent|support|chat|agent|representative/i' => ['Customer', 'Support', 'Agent', 'Representative'],
        '/account|bookkeep|finance|audit|payroll|tax/i' => ['Accountant', 'Accounting', 'Bookkeeper', 'Finance'],
        '/nurse|caregiver|medical|health|clinic/i' => ['Nurse', 'Caregiver', 'Medical', 'Healthcare'],
        '/teach|tutor|instructor|esl|educat/i' => ['Teacher', 'Tutor', 'Instructor', 'English'],
        '/design|ui|ux|graphic|video|multimedia|artist/i' => ['Designer', 'Design', 'Editor', 'Artist'],
        '/assistant|admin|secretary|encoder|data entry|clerk/i' => ['Assistant', 'Admin', 'Data Entry', 'Clerk'],
        '/sales|account exec|business develop/i' => ['Sales', 'Account Executive', 'Business Development'],
        '/market|seo|social media|content|copywrit/i' => ['Marketing', 'Content', 'SEO', 'Social Media'],
        '/\bhr\b|human resource|recruit|talent/i' => ['Recruiter', 'HR', 'Talent'],
        '/data|analyst|analytics/i' => ['Analyst', 'Data'],
        '/\bqa\b|tester|quality/i' => ['QA', 'Tester', 'Quality'],
    ];

    /**
     * The related-jobs search: the broad word of each title ("Frontend Developer" → "Developer") plus
     * the usual titles of that kind of work, in the same places, without filters, and mentioning at
     * least one of their skills (so "Engineer" finds a React engineer, not a music engineer).
     */
    private function related(array $p, bool $keepFilters = false): array
    {
        $terms = self::searchTermsOf($p);
        $about = implode(' ', $terms);
        $broad = array_map(fn ($t) => collect(preg_split('/\s+/', trim($t)))->last(), $terms);
        $family = collect(self::ROLE_FAMILIES)->filter(fn ($titles, $re) => preg_match($re, $about))->flatten()->all();
        $titles = collect([...$broad, ...$family])->filter()->unique(fn ($t) => mb_strtolower($t))->take(5)->values()->all();
        $base = array_diff_key($p, array_flip($keepFilters ? ['keywords'] : ['keywords', ...self::FILTERS]));

        // Close to them: a related job must also mention one of their skills (from the resume / profile).
        return [...$base, 'query' => null, 'titles' => $titles, 'must_mention' => self::keywordsOf($p)];
    }

    /** What each source is asked for: the typed query, else each job title. */
    public static function searchTermsOf(array $p): array
    {
        $query = trim($p['query'] ?? '');

        return $query !== '' ? [$query] : self::titlesOf($p);
    }

    /** Job titles searched: the titles list, or the single title of older searches. */
    public static function titlesOf(array $p): array
    {
        return array_values(array_filter(array_map('trim', $p['titles'] ?? [$p['title'] ?? ''])));
    }

    /**
     * A skill as a short search keyword: "JavaScript (ES6+)" → "JavaScript", "Microsoft Office: Word,
     * Excel" → "Microsoft Office", a long phrase → its first three words. Never over 60 characters.
     */
    public static function shortKeyword(string $skill): string
    {
        $k = trim(preg_replace('/\s*\(.*?\)\s*/', ' ', $skill));
        $k = trim(preg_split('/\s*[:;,|–—]\s*|\s+-\s+/u', $k)[0] ?? '');
        if (mb_strlen($k) > 30) { // a sentence, not a skill: drop the filler, keep the first thing named
            $k = preg_replace('/^((proficient|experienced|skilled|strong|good|excellent|basic|advanced|working|hands-on|solid|knowledge|familiarity|familiar|expertise|ability)( (in|with|of|at|to))?|building|using|developing|creating|managing|handling)\s+/i', '', $k);
            $k = preg_replace('/^((proficient|experienced|skilled|knowledge|familiar)( (in|with|of))?|building|using|developing|creating|managing|handling)\s+/i', '', $k);
            $k = trim(preg_split('/\s+(and|&|or)\s+/i', $k)[0]);
        }
        if (mb_strlen($k) > 30) {
            $k = implode(' ', array_slice(preg_split('/\s+/', $k), 0, 3));
        }

        return mb_substr($k, 0, 60);
    }

    /** Keywords searched, as a list (a text keyword from older searches is one item). */
    public static function keywordsOf(array $p): array
    {
        $k = $p['keywords'] ?? [];

        return array_values(array_filter(array_map('trim', is_array($k) ? $k : [$k])));
    }

    /**
     * Locations searched. "Anywhere in the Philippines" means the whole country, and the Philippines is
     * always added to chosen places (a job anywhere in the country is an opportunity too).
     * No places at all means anywhere.
     */
    public static function locationsOf(array $p): array
    {
        $list = array_filter(array_map(fn ($l) => preg_replace('/^anywhere in (the )?/i', '', trim((string) $l)), $p['locations'] ?? [$p['location'] ?? '']));
        if ($list && ! collect($list)->contains(fn ($l) => strcasecmp($l, 'Philippines') === 0)) {
            $list[] = 'Philippines';
        }

        return array_values(array_unique($list));
    }

    /**
     * Every field the user filled must match; for job titles and locations, any one of them. A filter on work setup, employment type or level
     * hides jobs that state a different one (jobs that don't say are kept). The salary filter (monthly amounts) only hides jobs whose stated
     * salary, in the same currency, is entirely outside the range; jobs without a comparable salary stay.
     */
    public function matches(array $job, array $p): bool
    {
        $has = fn (string $haystack, string $needle) => str_contains(mb_strtolower($haystack), mb_strtolower($needle));
        $allWords = fn (string $haystack, ?string $query) => collect(preg_split('/[\s,]+/', trim($query ?? ''), -1, PREG_SPLIT_NO_EMPTY))
            ->every(fn ($word) => $has($haystack, $word));

        // A typed query must appear in the job (title, company or tags); otherwise any of the job titles.
        $query = trim($p['query'] ?? '');
        if ($query !== '' && ! $allWords("{$job['title']} {$job['company']} {$job['tags']}", $query)) {
            return false;
        }
        $titles = $query === '' ? self::titlesOf($p) : [];
        if ($titles && ! collect($titles)->contains(fn ($t) => $allWords($job['title'], $t))) {
            return false;
        }
        $text = "{$job['title']} {$job['tags']} {$job['description']}";
        // Related jobs: must mention at least one of the user's skills.
        $must = array_map(fn ($k) => preg_replace('/\.js$/i', '', $k), $p['must_mention'] ?? []);
        if ($must && ! collect($must)->contains(fn ($k) => $has($text, $k))) {
            return false;
        }
        if (is_array($p['keywords'] ?? null)) {
            // A list of skills only decides the results when there's nothing else to search for (no
            // titles, nothing typed): then a job mentioning any of them matches. With titles, skills
            // don't filter (removing one must never hide jobs); the page shows which ones a job mentions.
            $skills = $query === '' && ! $titles ? array_map(fn ($k) => preg_replace('/\.js$/i', '', $k), self::keywordsOf($p)) : [];
            if ($skills && ! collect($skills)->contains(fn ($k) => $has($text, $k))) {
                return false;
            }
        } elseif (! $allWords($text, $p['keywords'] ?? null)) { // older searches: every word
            return false;
        }
        $locations = self::locationsOf($p);
        if ($locations
            && $job['source'] !== 'himalayas' // filtered by country at the source
            && ! collect($locations)->contains(fn ($l) => $has($job['location'] ?? '', $l))
            && ! preg_match('/\b(worldwide|anywhere)\b/i', $job['location'] ?? '')) { // open-to-all remote jobs fit any location
            return false;
        }
        if (($company = trim($p['company'] ?? '')) !== '' && $job['source'] === 'remotive' && ! $has($job['company'], $company)) {
            return false; // company boards are already that company's jobs
        }

        foreach (['work_setups' => 'work_setup', 'employment_types' => 'employment_type', 'levels' => 'experience_level'] as $param => $field) {
            // Only a job that states something else is hidden; most postings don't say, and those stay.
            if (! empty($p[$param]) && $job[$field] !== null && ! in_array($job[$field], $p[$param], true)) {
                return false;
            }
        }

        if (! empty($p['posted_within']) && (! $job['posted_at'] || Carbon::parse($job['posted_at'])->lt(Carbon::now()->subDays((int) $p['posted_within'])))) {
            return false;
        }

        $currency = $p['salary_currency'] ?? null;
        if ($currency && $job['salary_currency'] === $currency && $job['salary_max'] !== null) {
            if (! empty($p['salary_min']) && $job['salary_max'] < $p['salary_min']) {
                return false;
            }
            if (! empty($p['salary_max']) && $job['salary_min'] > $p['salary_max']) {
                return false;
            }
        }

        return true;
    }
}
