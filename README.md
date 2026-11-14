# TrabaHanap

React SPA (`frontend/`) talking to a Laravel JSON API (`backend/`).

```
TrabaHanap/
├── frontend/                 React 19 + Vite + Tailwind CSS 4 + React Router + Axios
│   └── src/
│       ├── api/              API client (client.js) + one file per resource
│       ├── components/       Reusable UI pieces
│       ├── hooks/            Custom React hooks
│       ├── layouts/          Page shells (header/nav + <Outlet/>)
│       ├── lib/              Helpers (alerts.js = SweetAlert2 confirm)
│       ├── pages/            One component per route
│       ├── App.jsx           Route table
│       └── main.jsx          Entry: BrowserRouter, AOS init, ToastContainer
└── backend/                  Laravel 13 (API only, Sanctum installed)
    ├── routes/api.php        All API routes (served under /api)
    ├── app/Http/Controllers/Api/   API controllers
    ├── app/Http/Requests/    Request validation
    └── app/Models/           Eloquent models
```

Frontend packages: `react`, `react-dom`, `react-router-dom`, `axios`, `tailwindcss` (via `@tailwindcss/vite`),
`react-icons`, `aos`, `sweetalert2`, `react-toastify`.

## Run in development

```bash
# 1. Backend  → http://127.0.0.1:8000
cd backend
php artisan serve

# 2. Frontend → http://localhost:5173
cd frontend
npm run dev
```

Vite proxies `/api/*` to Laravel, so the frontend calls `api.get('/health')` with no CORS setup in dev.

## First-time setup (after cloning)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate

cd ../frontend
npm install
```

## Adding a feature (example: job posts)

Note: Laravel already uses a `jobs` table for its queue, so don't name a model `Job`.

1. Backend: `php artisan make:model JobPost -mcr --api` → move controller to `Api/`, add `Route::apiResource('job-posts', JobPostController::class);` in `routes/api.php`.
2. Frontend: add `src/api/jobPosts.js` using the shared client, a page in `src/pages/`, and a route in `App.jsx`.

## Resume module (`/resume`)

Upload PDF/DOCX resumes (drag and drop), preview, download, replace, delete, and keep several named versions.
Claude (`claude-opus-5-5`) does three things, in `backend/app/Services/ResumeAi.php`:

- **Extract**: name, title, summary, work experience, education, skills, certifications, projects, languages. Runs right after upload.
- **Analyze**: 0-100 score, a 0-10 score per criterion, strengths, missing information, prioritised suggestions.
- **Tailor**: paste a job posting and get a new version built only from the extracted information. It never adds experience,
  skills or qualifications; requirements you don't meet are listed separately as gaps.

Setup: put your key in `backend/.env` as `ANTHROPIC_API_KEY=...` (from https://platform.claude.com). Without it, upload,
preview and download still work, and the AI buttons show "ANTHROPIC_API_KEY is not set".

- Backend: `ResumeController` + `routes/api.php`; files are stored privately in `storage/app/private/resumes`. Tests: `tests/Feature/ResumeTest.php` (Claude is mocked).
- Frontend: `src/api/resumes.js`, `src/pages/resume/`.
- No auth yet: every resume is visible to anyone who can reach the API. Scope by user once login exists (see the TODO in `ResumeController`).

## Professional profile (`/profile`)

Editable, structured background (personal info, summary, work experience, education, categorised skills, certifications,
projects, career preferences). Claude's main reference: tailoring a resume uses it alongside the resume, and wins on conflicts.

Keeping it in sync with My Resume:
- **Import from resume** sends a resume's extracted information to Claude (`ResumeAi::profileFromResume`), which sorts skills into
  categories and splits achievements from responsibilities. The result is merged into the form (empty fields filled, missing
  jobs/schools/projects/skills added, nothing you typed is overwritten, preferences untouched); you review and save.
- After a newer resume is extracted, the page shows a banner offering to import it.

- Backend: `ProfileController`, `Profile` model (shape in `Profile::BLANK`). Tests: `tests/Feature/ProfileTest.php`.
- Frontend: `src/api/profile.js`, `src/pages/profile/` (`mergeProfile.js` holds the merge rules).

## AI Job Finder (`/job-finder`)

Discovers jobs from permitted sources only (official/public APIs whose terms allow showing their jobs in our own app):

| Source | What | Terms we follow |
|---|---|---|
| Himalayas (`himalayas.app/jobs/api/search`) | Remote jobs, filtered by country | Apply button uses `applicationLink` unchanged; "via Himalayas" link on every job; expired jobs deleted; never re-published elsewhere; each query cached 12 h |
| Remotive (`remotive.com/api/remote-jobs`) | Remote jobs (the free API returns only the latest ~16) | "via Remotive" link to the Remotive URL; feed fetched at most every 6 h (they ask for ≤ 4/day) |
| Greenhouse / Lever job-board APIs | A company's own career site | Searched when you type a company in **Company**, or always for boards listed in `JOB_BOARDS` (`backend/.env`, e.g. `greenhouse:gitlab,lever:palantir`) |

LinkedIn, Indeed and JobStreet have no public search API and don't allow scraping, so they are not sources.

- Filters run locally after fetching. Work setup / type / level filters hide jobs that don't state them; the salary filter
  compares monthly estimates (hourly × 160, yearly ÷ 12) in the same currency and keeps jobs that don't state pay.
  Experience level comes from the source or is guessed from the title.
- AI buttons (`App\Services\JobAi`): Analyze This Job (splits the posting into the details sections), Check My Compatibility
  (vs. My Professional Profile), Compare With My Resume (requirement by requirement), Prepare Application (creates a tailored
  resume version on My Resume). Results are saved on the job.
- History: every search is stored with what it found; star one to save it. All discovered jobs are kept (until expired).
- Add a source: a class implementing `App\Services\JobSources\JobSource`, listed in `JobFinder::SOURCES`.
- Backend: `JobFinderController`, `JobFinder`, `JobSources/*`, models `JobPosting` (table `job_postings`; Laravel's queue owns `jobs`) and `JobSearch`. Tests: `tests/Feature/JobFinderTest.php` (HTTP faked).
- Frontend: `src/api/jobs.js`, `src/pages/jobs/`.
