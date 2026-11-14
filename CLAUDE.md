# TrabaHanap

AI job-search assistant for job seekers in the Philippines (every field, not only developers):
resume → professional profile → find jobs → tailor/apply → track. React SPA + Laravel JSON API.

## Run, test, lint
- Backend (`backend/`): `php artisan serve` (port 8000) · tests `php artisan test` (all must pass) · `php artisan migrate`
- Frontend (`frontend/`): `npm run dev` (port 5173, proxies `/api` and `/sanctum` to 8000) · `npx oxlint src` · `npx vite build`
- Composer is at `C:\php\composer.bat` (run it via PowerShell or `cmd //c`).
- First admin: `php artisan db:seed` (reads ADMIN_* from `backend/.env`) or `php artisan app:create-admin`.
- Secrets (ANTHROPIC_API_KEY, ADMIN_*) live only in `backend/.env`. Never print them or ask the user to paste them.

## Stack and layout
- Frontend: React 19, Vite, Tailwind CSS 4 (tokens in `src/index.css`: surface, ink, on-ink, muted, subtle, line, hover, online; dark mode via `.dark`), React Router 7, axios (`src/api/*`), react-icons (Feather `Fi*`; `fa6` for file-type logos), sweetalert2 (`src/lib/alerts.js`), react-toastify (`src/lib/toast.js`), motion, react-datepicker, docx, jspdf.
- Pages: `src/pages/{resume,profile,jobs,users,account,auth}`. Shared UI: `src/components/` (fields, SidePanel, RecordList, TagPicker/ChipInput/ComboInput, MonthField, PasswordStrength).
- Backend: Laravel 13, Sanctum SPA session auth, SQLite. Controllers in `app/Http/Controllers/Api`, AI in `app/Services/{ClaudeService,ResumeAi,JobAi}.php`, job search in `app/Services/JobFinder.php` + `JobSources/` (Himalayas, Remotive, Greenhouse, Lever; JobStreet/Indeed only as outbound links: no API, no scraping).
- Per-user data: `BelongsToUser` trait (Resume, Profile, JobSearch, UserJob) scopes every query to the signed-in user. Job postings are shared; a user's saved/AI state is `UserJob`. Roles: admin | user (Users module is admin-only).

## Claude API (app's AI)
- PHP SDK, model `claude-opus-5-5` (override `ANTHROPIC_MODEL`). Structured outputs via `ClaudeService::ask()`.
- Schema limits: ≤16 union-typed params (nullable strings are sent as strings; `withoutNullableStrings`), and keep schemas small (profile skills are one list of {name, category}).
- Resume scoring uses a fixed rubric (5 × 20 points, overall = sum).

## Rules for the product
- The AI never invents experience, numbers, skills or employers. Missing facts go to "add these if they're true".
- Philippines first (locations, "short bond" Letter paper default), general wording for all professions.
- Job Finder: matching → related to the user → (no filters only) every other job; filters never silently come from profile preferences.

## UI style (the user cares a lot)
- White/minimal, small text (12–14px), sentence case, Geist font, no "AI-looking" gradients.
- `drop-in` animation on new content; editors open in a right-side `SidePanel` (slide-in); modals/dialogs via sweetalert2.
- Clear error states: red borders, plain-language messages, scroll to the problem.

## Gotchas
- Git Bash heredocs strip backslashes: for PHP namespaces or regexes, edit with the Edit/Write tools, not sed/heredoc scripts.
- `<label>`-wrapped fields forward clicks to the first button inside: use `Field group` for chip/picker fields.
- Page content sits in an animated `<main>`; overlays must use a portal (`createPortal`) or they get trapped.
- Pin new npm packages to a version at least two weeks old.
