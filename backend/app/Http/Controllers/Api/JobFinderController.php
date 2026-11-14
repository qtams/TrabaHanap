<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobPosting;
use App\Models\JobSearch;
use App\Models\Profile;
use App\Models\Resume;
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
        $params = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
            'keywords' => ['nullable', 'string', 'max:200'],
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
        abort_unless(
            collect($params)->only(['title', 'keywords', 'company'])->filter()->isNotEmpty(),
            422, 'Enter a job title, keywords or a company.',
        );

        $result = $finder->search(array_filter($params, fn ($v) => $v !== null && $v !== []));

        return ['search' => $result['search'], 'jobs' => $result['jobs'], 'notes' => $result['notes']];
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

    // ?saved=1 for saved jobs; otherwise every discovered job, newest first.
    public function jobs(Request $request)
    {
        JobFinder::purgeExpired();

        return JobPosting::when($request->boolean('saved'), fn ($q) => $q->whereNotNull('saved_at')->orderByDesc('saved_at'))
            ->orderByDesc('created_at')->limit(200)->get();
    }

    public function show(JobPosting $job)
    {
        return $job;
    }

    public function save(JobPosting $job)
    {
        $job->update(['saved_at' => $job->saved_at ?? now()]);

        return $job;
    }

    public function unsave(JobPosting $job)
    {
        $job->update(['saved_at' => null]);

        return $job;
    }

    // ---- AI ----

    public function analyze(JobPosting $job, JobAi $ai)
    {
        $job->update(['analysis' => $ai->analyze($job)]);

        return $job;
    }

    public function compatibility(JobPosting $job, JobAi $ai)
    {
        $profile = Profile::current()->data;
        abort_if($profile === Profile::BLANK, 422, 'Fill in My Professional Profile first; the check is based on it.');

        $job->update(['compatibility' => $ai->compatibility($job, $profile)]);

        return $job;
    }

    public function compare(Request $request, JobPosting $job, JobAi $ai)
    {
        $resume = Resume::findOrFail($request->validate(['resume_id' => ['required', 'integer']])['resume_id']);
        abort_unless($resume->data, 422, 'Extract that resume\'s information first (My Resume).');

        $job->update(['resume_comparison' => $ai->compareResume($job, $resume->data), 'compared_resume_id' => $resume->id]);

        return $job;
    }
}
