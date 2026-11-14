<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobPosting;
use App\Models\JobSearch;
use App\Models\Profile;
use App\Models\Resume;
use App\Models\UserJob;
use App\Services\JobAi;
use App\Services\JobFinder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// TODO when auth lands: set user_id on searches and scope searches, saved jobs and AI results by user.
class JobFinderController extends Controller
{
    public function sources(JobFinder $finder)
    {
        return collect($finder->sources())->map(fn ($s) => ['key' => $s->key(), 'name' => $s->name(), 'note' => $s->note()]);
    }

    public function search(Request $request, JobFinder $finder)
    {
        $sourceKeys = array_map(fn ($s) => $s->key(), $finder->sources());
        // Long skills (straight from a resume) become their key word instead of failing validation.
        if (is_array($request->input('keywords'))) {
            $request->merge(['keywords' => array_values(array_unique(array_filter(array_map(
                fn ($k) => JobFinder::shortKeyword((string) $k),
                $request->input('keywords'),
            ))))]);
        }
        $params = $request->validate([
            // Several titles / locations (any of them matches). title / location: one, as older searches stored.
            // query: what the user typed in the search box. When given, it replaces the job titles.
            'query' => ['nullable', 'string', 'max:120'],
            'titles' => ['array', 'max:5'], 'titles.*' => ['string', 'max:120'],
            'locations' => ['array', 'max:5'], 'locations.*' => ['string', 'max:120'],
            'title' => ['nullable', 'string', 'max:120'],
            // A list of skills (a job mentioning any of them matches), or text where every word must appear.
            'keywords' => ['nullable', fn ($attr, $v, $fail) => is_string($v) ? (mb_strlen($v) > 200 && $fail('Keywords are too long.')) : (is_array($v) && count($v) <= 15 ? null : $fail('Up to 15 keywords.'))],
            'keywords.*' => ['string', 'max:60'],
            'location' => ['nullable', 'string', 'max:120'],
            'company' => ['nullable', 'string', 'max:120'],
            'salary_min' => ['nullable', 'integer', 'min:0'],
            'salary_max' => ['nullable', 'integer', 'min:0', 'gte:salary_min'],
            'salary_currency' => ['nullable', Rule::in(['PHP', 'USD', 'EUR', 'GBP'])],
            'sources' => ['array'], 'sources.*' => Rule::in($sourceKeys),
            'work_setups' => ['array'], 'work_setups.*' => Rule::in(['remote', 'hybrid', 'onsite']),
            'employment_types' => ['array'], 'employment_types.*' => Rule::in(['full_time', 'part_time', 'contract', 'freelance', 'internship']),
            'levels' => ['array'], 'levels.*' => Rule::in(['entry', 'junior', 'mid', 'senior', 'lead']),
            'posted_within' => ['nullable', Rule::in([1, 3, 7, 14, 30])],
        ]);
        // One shape from here on: lists of titles and locations.
        $params['titles'] = JobFinder::titlesOf($params);
        $params['locations'] = JobFinder::locationsOf($params);
        unset($params['title'], $params['location']);
        // Nothing to search for is fine: then every job from the sources is listed (newest first).

        $result = $finder->search(array_filter($params, fn ($v) => $v !== null && $v !== []));

        // jobs: what matches the search; related: similar roles in the same places (see JobFinder::related).
        // jobs: every job, most relevant first, each with tier match | related | other (see JobFinder::search).
        return ['search' => $result['search'], 'jobs' => $result['jobs'], 'counts' => $result['counts'], 'filtered' => $result['filtered'], 'notes' => $result['notes']];
    }

    // ---- Search history ----

    public function searches()
    {
        return JobSearch::latest()->limit(100)->get();
    }

    public function showSearch(JobSearch $search)
    {
        return ['search' => $search, 'jobs' => $search->jobs()->orderByDesc('posted_at')->get()];
    }

    // Name it to save the search; null to unsave.
    public function updateSearch(Request $request, JobSearch $search)
    {
        $search->update($request->validate(['name' => ['nullable', 'string', 'max:80']]));

        return $search;
    }

    public function destroySearch(JobSearch $search)
    {
        $search->delete();

        return response()->noContent();
    }

    // ---- Jobs ----

    // ?saved=1 for the user's saved jobs; otherwise the jobs their searches found, newest first.
    public function jobs(Request $request)
    {
        JobFinder::purgeExpired();

        if ($request->boolean('saved')) {
            return UserJob::whereNotNull('saved_at')->orderByDesc('saved_at')->limit(200)->pluck('job_posting_id')
                ->pipe(fn ($ids) => JobPosting::whereIn('id', $ids)->get()->sortBy(fn ($j) => $ids->search($j->id))->values());
        }

        return JobPosting::whereHas('searches')->orderByDesc('created_at')->limit(200)->get(); // searches: only theirs
    }

    public function show(JobPosting $job)
    {
        return $job;
    }

    public function save(JobPosting $job)
    {
        return $job->remember(['saved_at' => $job->saved_at ?? now()]);
    }

    public function unsave(JobPosting $job)
    {
        return $job->remember(['saved_at' => null]);
    }

    // ---- AI ----

    public function analyze(JobPosting $job, JobAi $ai)
    {
        return $job->remember(['analysis' => $ai->analyze($job)]);
    }

    public function compatibility(JobPosting $job, JobAi $ai)
    {
        $profile = Profile::current()->data;
        abort_if($profile === Profile::BLANK, 422, 'Fill in My Professional Profile first; the check is based on it.');

        return $job->remember(['compatibility' => $ai->compatibility($job, $profile)]);
    }

    public function compare(Request $request, JobPosting $job, JobAi $ai)
    {
        $resume = Resume::findOrFail($request->validate(['resume_id' => ['required', 'integer']])['resume_id']);
        abort_unless($resume->data, 422, 'Extract that resume\'s information first (My Resume).');

        return $job->remember(['resume_comparison' => $ai->compareResume($job, $resume->data), 'compared_resume_id' => $resume->id]);
    }
}
