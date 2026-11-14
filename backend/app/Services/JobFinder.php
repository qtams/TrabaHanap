<?php

namespace App\Services;

use App\Models\JobPosting;
use App\Models\JobSearch;
use App\Services\JobSources\Greenhouse;
use App\Services\JobSources\Himalayas;
use App\Services\JobSources\JobSource;
use App\Services\JobSources\Lever;
use App\Services\JobSources\Remotive;
use Illuminate\Support\Carbon;
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

    /** @return array{search: JobSearch, jobs: \Illuminate\Support\Collection, notes: list<string>} */
    public function search(array $params): array
    {
        self::purgeExpired();
        $wanted = $params['sources'] ?? [];
        $found = [];
        $notes = [];

        foreach ($this->sources() as $source) {
            if ($wanted && ! in_array($source->key(), $wanted, true)) {
                continue;
            }
            try {
                $result = $source->fetch($params);
                array_push($found, ...$result['jobs']);
                array_push($notes, ...$result['notes']);
            } catch (Throwable $e) {
                report($e);
                $notes[] = "{$source->name()} could not be reached right now.";
            }
        }

        $matches = collect($found)
            ->filter(fn ($job) => $this->matches($job, $params))
            ->reject(fn ($job) => $job['expires_at'] && Carbon::parse($job['expires_at'])->isPast())
            ->sortByDesc(fn ($job) => $job['posted_at'] ? strtotime($job['posted_at']) : 0)
            ->take(self::MAX_RESULTS)
            ->values();

        return DB::transaction(function () use ($params, $matches, $notes) {
            // Upsert, keeping what the user added (saved, AI results).
            $jobs = $matches->map(fn ($job) => JobPosting::updateOrCreate(
                ['source' => $job['source'], 'external_id' => $job['external_id']],
                $job,
            ));
            // The same search again (e.g. the automatic one each time the page opens) refreshes the
            // latest history entry instead of adding a duplicate. Named searches are kept as they are.
            $last = JobSearch::latest('id')->first();
            if ($last && ! $last->name && $last->params == $params) {
                $last->forceFill(['results_count' => $jobs->count(), 'created_at' => now()])->save();
                $last->jobs()->sync($jobs->pluck('id'));

                return ['search' => $last, 'jobs' => $jobs, 'notes' => $notes];
            }
            $search = JobSearch::create(['params' => $params, 'results_count' => $jobs->count()]);
            $search->jobs()->attach($jobs->pluck('id'));

            return ['search' => $search, 'jobs' => $jobs, 'notes' => $notes];
        });
    }

    /**
     * Every field the user filled must match. A filter on work setup, employment type or level
     * hides jobs that don't state it. The salary filter (monthly amounts) only hides jobs whose stated
     * salary, in the same currency, is entirely outside the range; jobs without a comparable salary stay.
     */
    public function matches(array $job, array $p): bool
    {
        $has = fn (string $haystack, string $needle) => str_contains(mb_strtolower($haystack), mb_strtolower($needle));
        $allWords = fn (string $haystack, ?string $query) => collect(preg_split('/[\s,]+/', trim($query ?? ''), -1, PREG_SPLIT_NO_EMPTY))
            ->every(fn ($word) => $has($haystack, $word));

        if (! $allWords($job['title'], $p['title'] ?? null)) {
            return false;
        }
        if (! $allWords("{$job['title']} {$job['tags']} {$job['description']}", $p['keywords'] ?? null)) {
            return false;
        }
        if (($loc = trim($p['location'] ?? '')) !== ''
            && $job['source'] !== 'himalayas' // filtered by country at the source
            && ! $has($job['location'] ?? '', $loc)
            && ! preg_match('/\b(worldwide|anywhere)\b/i', $job['location'] ?? '')) { // open-to-all remote jobs fit any location
            return false;
        }
        if (($company = trim($p['company'] ?? '')) !== '' && $job['source'] === 'remotive' && ! $has($job['company'], $company)) {
            return false; // company boards are already that company's jobs
        }

        foreach (['work_setups' => 'work_setup', 'employment_types' => 'employment_type', 'levels' => 'experience_level'] as $param => $field) {
            if (! empty($p[$param]) && ! in_array($job[$field], $p[$param], true)) {
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
