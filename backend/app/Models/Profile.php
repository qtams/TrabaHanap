<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * The user's structured professional background (My Professional Profile).
 * Claude's main reference for evaluating jobs and preparing applications.
 */
class Profile extends Model
{
    // Every section with its empty value. List items have no blank: the frontend adds them.
    public const BLANK = [
        'personal' => ['full_name' => '', 'email' => '', 'phone' => '', 'location' => '', 'linkedin' => '', 'github' => '', 'portfolio' => ''],
        'summary' => ['career_objective' => '', 'introduction' => '', 'years_experience' => null, 'employment_status' => '', 'career_goals' => ''],
        'experience' => [],   // company, title, employment_type, start_date, end_date, responsibilities[], achievements[], technologies[]
        'education' => [],    // school, degree, field_of_study, graduation_date
        'skills' => [
            'programming_languages' => [], 'frontend' => [], 'backend' => [], 'databases' => [],
            'frameworks' => [], 'tools' => [], 'soft_skills' => [],
            'other' => [], // any other professional skill: customer service, accounting, nursing…
        ],
        'certifications' => [], // name, issuer, date, link, description
        'projects' => [],       // name, description, date, link, technologies[]
        'preferences' => [
            'job_titles' => [], 'industries' => [], 'locations' => [], 'work_setups' => [],
            'salary_min' => null, 'salary_max' => null, 'salary_currency' => 'PHP',
            'employment_types' => [], 'experience_level' => '',
        ],
    ];

    protected $fillable = ['user_id', 'data', 'synced_resume_id', 'synced_at'];

    protected function casts(): array
    {
        return ['data' => 'array', 'synced_at' => 'datetime'];
    }

    // TODO when auth lands: take the user and scope by user_id.
    public static function current(): self
    {
        return self::firstOrCreate(['user_id' => null], ['data' => self::BLANK]);
    }

    // Stored data on top of BLANK, so every key always exists (older rows, partial imports).
    public function getDataAttribute($value): array
    {
        $data = is_array($value) ? $value : (json_decode($value ?? '[]', true) ?: []);

        return array_replace_recursive(self::BLANK, $data);
    }
}
