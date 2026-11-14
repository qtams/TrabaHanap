<?php

namespace App\Services;

use Anthropic\Client;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Shared Claude plumbing for the AI services (ResumeAi, JobAi): one structured-output call
 * that returns a plain array matching the given JSON schema.
 */
abstract class ClaudeService
{
    protected const STR = ['type' => 'string'];
    protected const NSTR = ['type' => ['string', 'null']];
    protected const STRS = ['type' => 'array', 'items' => self::STR];

    private ?Client $client = null;

    // Built on first use, so a missing key only fails the AI calls themselves.
    private function client(): Client
    {
        $key = config('services.anthropic.key');
        if (! $key) {
            throw new HttpException(503, 'ANTHROPIC_API_KEY is not set in backend/.env.');
        }

        return $this->client ??= new Client(apiKey: $key);
    }

    protected function ask(string $system, array $content, array $schema, string $effort = 'medium'): array
    {
        set_time_limit(300); // Claude can take a while; php artisan serve defaults to 30s

        $message = $this->client()->beta->messages->create(
            model: config('services.anthropic.model'),
            maxTokens: 16000,
            system: $system."\nWhen a text field has no value, use an empty string.",
            messages: [['role' => 'user', 'content' => $content]],
            outputConfig: ['effort' => $effort, 'format' => ['type' => 'json_schema', 'schema' => self::withoutNullableStrings($schema)]],
            // If the model declines for policy reasons, the API retries on its default fallback model.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
        );

        if ($message->stopReason === 'refusal') {
            throw new HttpException(422, 'Claude declined this request.');
        }
        if ($message->stopReason === 'max_tokens') {
            throw new HttpException(422, 'The input is too long to process in one pass.');
        }

        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                return self::emptyToNull(json_decode($block->text, true, flags: JSON_THROW_ON_ERROR), $schema);
            }
        }

        throw new RuntimeException('Claude returned no text.');
    }

    // The API allows at most 16 union-typed fields per schema, so nullable strings (NSTR) are sent
    // as plain strings, and an empty string in the answer becomes null again (emptyToNull).
    private static function withoutNullableStrings(array $schema): array
    {
        if (($schema['type'] ?? null) === self::NSTR['type']) {
            return self::STR;
        }
        foreach (['properties', 'items'] as $key) {
            if (isset($schema[$key])) {
                $schema[$key] = $key === 'items'
                    ? self::withoutNullableStrings($schema[$key])
                    : array_map(self::withoutNullableStrings(...), $schema[$key]);
            }
        }

        return $schema;
    }

    private static function emptyToNull(mixed $value, array $schema): mixed
    {
        if (($schema['type'] ?? null) === self::NSTR['type']) {
            return is_string($value) && trim($value) === '' ? null : $value;
        }
        if (is_array($value) && isset($schema['properties'])) {
            foreach ($schema['properties'] as $key => $sub) {
                if (array_key_exists($key, $value)) {
                    $value[$key] = self::emptyToNull($value[$key], $sub);
                }
            }
        } elseif (is_array($value) && isset($schema['items'])) {
            $value = array_map(fn ($item) => self::emptyToNull($item, $schema['items']), $value);
        }

        return $value;
    }

    // Structured outputs: every property required, nullable where optional.
    protected static function object(array $properties): array
    {
        return ['type' => 'object', 'additionalProperties' => false, 'required' => array_keys($properties), 'properties' => $properties];
    }
}
