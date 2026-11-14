<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\JobFinderController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ResumeController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Lets the frontend check the API is up: GET /api/health
Route::get('/health', fn () => ['status' => 'ok']);

// Sign-in (frontend: src/pages/auth). The SPA first calls GET /sanctum/csrf-cookie.
Route::post('/login', [AuthController::class, 'login']);

// Everything else needs a signed-in user.
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateMe']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Users module (frontend: src/pages/users). Admins only.
    Route::apiResource('users', UserController::class)->except('show')->middleware('admin');

    // Resume module (frontend: src/pages/resume). AI routes call Claude and can take up to a minute.
    Route::apiResource('resumes', ResumeController::class);
    Route::post('/resumes/{resume}/file', [ResumeController::class, 'replaceFile']);
    Route::get('/resumes/{resume}/file', [ResumeController::class, 'file']);
    Route::post('/resumes/{resume}/extract', [ResumeController::class, 'extract']);
    Route::post('/resumes/{resume}/analyze', [ResumeController::class, 'analyze']);
    Route::post('/resumes/{resume}/tailor', [ResumeController::class, 'tailor']);
    Route::post('/resumes/{resume}/improve', [ResumeController::class, 'improve']); // a stronger rewrite, as a new version
    Route::post('/resume-builder', [ResumeController::class, 'build']); // no resume yet: written from the profile

    // Professional profile (frontend: src/pages/profile). Still one shared profile: per-user data is next.
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/import/{resume}', [ProfileController::class, 'importFromResume']);
    Route::post('/profile/summary', [ProfileController::class, 'writeSummary']);

    // AI Job Finder (frontend: src/pages/jobs). Sources: app/Services/JobSources.
    Route::get('/job-sources', [JobFinderController::class, 'sources']);
    Route::post('/job-search', [JobFinderController::class, 'search']);
    Route::get('/job-searches', [JobFinderController::class, 'searches']);
    Route::get('/job-searches/{search}', [JobFinderController::class, 'showSearch']);
    Route::patch('/job-searches/{search}', [JobFinderController::class, 'updateSearch']);
    Route::delete('/job-searches/{search}', [JobFinderController::class, 'destroySearch']);
    Route::get('/jobs', [JobFinderController::class, 'jobs']);
    Route::get('/jobs/{job}', [JobFinderController::class, 'show']);
    Route::post('/jobs/{job}/save', [JobFinderController::class, 'save']);
    Route::delete('/jobs/{job}/save', [JobFinderController::class, 'unsave']);
    Route::post('/jobs/{job}/analyze', [JobFinderController::class, 'analyze']);
    Route::post('/jobs/{job}/compatibility', [JobFinderController::class, 'compatibility']);
    Route::post('/jobs/{job}/compare', [JobFinderController::class, 'compare']);
});
