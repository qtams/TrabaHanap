<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /** Feature tests run signed in as a regular user unless a test class turns this off. */
    protected bool $signIn = true;

    protected function setUp(): void
    {
        parent::setUp();

        if ($this->signIn && in_array(RefreshDatabase::class, class_uses_recursive($this), true)) {
            Sanctum::actingAs(User::factory()->create());
        }
    }
}
