<?php

namespace App\Services\JobSources;

/**
 * A permitted job feed: an official API or public job-board API. Add a source by writing a class
 * like Remotive/Greenhouse/Lever and listing it in JobFinder::SOURCES.
 *
 * fetch() returns jobs normalised by Normalize::job(), unfiltered; JobFinder does the filtering.
 */
interface JobSource
{
    public function key(): string;

    public function name(): string;

    /** Short line shown in the UI under the source's name. */
    public function note(): string;

    /** @return array{jobs: list<array>, notes: list<string>} */
    public function fetch(array $params): array;
}
