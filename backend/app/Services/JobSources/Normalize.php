<?php

namespace App\Services\JobSources;

use Illuminate\Support\Carbon;

/**
 * Turns each source's fields into the job_postings shape. Dates are ISO strings (not Carbon objects)
 * so normalised jobs can sit in the cache.
 */
class Normalize
{
    public static function job(array $job): array
    {
        [$min, $max, $currency, $period] = isset($job['salary'])
            ? self::monthly(...$job['salary'])
            : self::salary($job['salary_text'] ?? null);

        return [
            'source' => $job['source'],
            'external_id' => (string) $job['external_id'],
            'title' => trim($job['title']),
            'company' => trim($job['company'] ?? '') ?: 'Unknown company',
            'company_logo' => ($job['company_logo'] ?? null) ?: null,
            'location' => trim($job['location'] ?? '') ?: null,
            'work_setup' => $job['work_setup'] ?? self::workSetup($job['location'] ?? ''),
            'employment_type' => $job['employment_type'] ?? null,
            'experience_level' => $job['experience_level'] ?? self::level($job['title']),
            'salary_text' => trim($job['salary_text'] ?? '') ?: null,
            'salary_min' => $min,
            'salary_max' => $max,
            'salary_currency' => $currency,
            'salary_period' => $period,
            'description' => self::text($job['description'] ?? ''),
            'tags' => $job['tags'] ?? null,
            'url' => $job['url'],
            'source_url' => $job['source_url'] ?? $job['url'],
            'posted_at' => self::date($job['posted_at'] ?? null),
            'deadline' => isset($job['deadline']) ? Carbon::parse($job['deadline'])->toDateString() : null,
            'expires_at' => self::date($job['expires_at'] ?? null),
        ];
    }

    private static function date(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (is_int($value) ? Carbon::createFromTimestamp($value) : Carbon::parse($value))->toIso8601String();
    }

    /** HTML description → readable plain text (bullets kept as "• ", paragraphs as blank lines). */
    public static function text(string $html): string
    {
        $html = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8'); // Greenhouse escapes its HTML
        $html = preg_replace(['#<li[^>]*>#i', '#<br\s*/?>#i', '#</(p|div|h[1-6]|ul|ol|tr)>#i'], ["\n• ", "\n", "\n"], $html);
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        // Tidy spaces, cap blank lines at one, and keep bullets in a list on consecutive lines.
        $text = preg_replace(["/[ \t\x{00A0}]+/u", "/ *\n */", "/\n{3,}/", "/\n+• /"], [' ', "\n", "\n\n", "\n• "], $text);

        return trim($text);
    }

    /** Guess from the title; null when it doesn't say. */
    public static function level(string $title): ?string
    {
        return match (true) {
            (bool) preg_match('/\b(intern|internship|trainee|graduate|entry[- ]level)\b/i', $title) => 'entry',
            (bool) preg_match('/\b(junior|jr\.?)\b/i', $title) => 'junior',
            (bool) preg_match('/\b(lead|principal|staff|head of|director|architect)\b/i', $title) => 'lead',
            (bool) preg_match('/\b(senior|sr\.?)\b/i', $title) => 'senior',
            (bool) preg_match('/\b(mid[- ]level|intermediate)\b/i', $title) => 'mid',
            default => null,
        };
    }

    public static function workSetup(string $location): ?string
    {
        return match (true) {
            (bool) preg_match('/\bhybrid\b/i', $location) => 'hybrid',
            (bool) preg_match('/\b(remote|anywhere|worldwide)\b/i', $location) => 'remote',
            default => null,
        };
    }

    /**
     * Free-text salary ("$40k - $60k", "PHP 30,000–45,000 / month", "€55,5k") →
     * [monthly min, monthly max, currency, period stated]; nulls when there are no numbers.
     */
    public static function salary(?string $text): array
    {
        if (! $text || ! preg_match_all('/(\d[\d,.]*)\s*(k)?/i', $text, $m, PREG_SET_ORDER | PREG_UNMATCHED_AS_NULL)) {
            return [null, null, null, null];
        }

        $numbers = [];
        foreach ($m as [, $number, $k]) {
            // "35,3k" uses a decimal comma; otherwise commas and dots group thousands.
            $number = $k && preg_match('/^\d+[,.]\d{1,2}$/', $number) ? str_replace(',', '.', $number) : str_replace([',', '.'], '', $number);
            $numbers[] = (float) $number * ($k ? 1000 : 1);
        }
        $numbers = array_filter($numbers, fn ($n) => $n >= 5); // drop stray digits like "2 weeks"
        if (! $numbers) {
            return [null, null, null, null];
        }

        $currency = match (true) {
            (bool) preg_match('/₱|\bphp\b/i', $text) => 'PHP',
            str_contains($text, '€') || (bool) preg_match('/\beur\b/i', $text) => 'EUR',
            str_contains($text, '£') || (bool) preg_match('/\bgbp\b/i', $text) => 'GBP',
            str_contains($text, '$') || (bool) preg_match('/\busd\b/i', $text) => 'USD',
            default => null,
        };
        $period = match (true) {
            (bool) preg_match('/\b(hour|hourly|hr)\b|\/h\b/i', $text) => 'hour',
            (bool) preg_match('/\b(month|monthly|mo)\b/i', $text) => 'month',
            (bool) preg_match('/\b(year|yearly|annual|annually|yr|pa)\b/i', $text) => 'year',
            default => null,
        };

        return self::monthly(min($numbers), max($numbers), $currency, $period);
    }

    /**
     * Amounts in a stated period → monthly estimate (160 working hours a month).
     * No period stated: PHP salaries are quoted monthly in the Philippines; other currencies
     * are taken as yearly when large (≥ 15,000), else monthly.
     */
    public static function monthly(?float $min, ?float $max, ?string $currency, ?string $period): array
    {
        if (! $min && ! $max) {
            return [null, null, null, null];
        }
        $min ??= $max;
        $max ??= $min;
        $period = match (strtolower((string) $period)) {
            'hour', 'hourly' => 'hour',
            'month', 'monthly' => 'month',
            'year', 'yearly', 'annual', 'annually' => 'year',
            default => $currency === 'PHP' || $max < 15000 ? 'month' : 'year',
        };
        $factor = ['hour' => 160, 'month' => 1, 'year' => 1 / 12][$period];

        return [(int) round($min * $factor), (int) round($max * $factor), $currency ? strtoupper($currency) : null, $period];
    }
}
