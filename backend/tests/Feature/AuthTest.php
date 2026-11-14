<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected bool $signIn = false;

    protected function setUp(): void
    {
        parent::setUp();
        // Requests from the SPA's origin get a session (Sanctum stateful), like the real frontend.
        $this->withHeader('Referer', 'http://localhost:5173/login');
    }

    public function test_api_needs_sign_in(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
        $this->getJson('/api/health')->assertOk();
    }

    public function test_sign_in_with_username_or_email(): void
    {
        $user = User::factory()->create(['username' => 'juan', 'email' => 'juan@example.com', 'password' => 'secret123']);

        $this->postJson('/api/login', ['login' => 'juan', 'password' => 'secret123'])->assertOk()->assertJsonPath('username', 'juan');
        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh()->last_login_at);

        $this->postJson('/api/logout')->assertNoContent();
        $this->postJson('/api/login', ['login' => 'juan@example.com', 'password' => 'secret123'])->assertOk();
    }

    public function test_wrong_password_and_inactive_accounts_are_refused(): void
    {
        User::factory()->create(['username' => 'juan', 'password' => 'secret123']);
        User::factory()->create(['username' => 'maria', 'password' => 'secret123', 'status' => 'inactive']);

        $this->postJson('/api/login', ['login' => 'juan', 'password' => 'nope'])->assertJsonValidationErrors('login');
        $this->postJson('/api/login', ['login' => 'maria', 'password' => 'secret123'])
            ->assertJsonValidationErrors(['login' => 'inactive']);
        $this->assertGuest();
    }

    public function test_users_module_is_admin_only(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/users')->assertForbidden();

        Sanctum::actingAs(User::factory()->admin()->create());
        $this->getJson('/api/users')->assertOk()->assertJsonCount(2);
    }

    public function test_admin_creates_updates_and_deletes_users(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $id = $this->postJson('/api/users', [
            'name' => 'Ana Cruz', 'username' => 'ana', 'email' => 'ana@example.com', 'password' => 'secret123', 'role' => 'user', 'status' => 'active',
        ])->assertCreated()->assertJsonMissingPath('password')->json('id');

        $hash = User::find($id)->password;
        $this->putJson("/api/users/{$id}", [
            'name' => 'Ana Cruz', 'username' => 'ana', 'email' => 'ana@example.com', 'password' => '', 'role' => 'admin', 'status' => 'inactive',
        ])->assertOk()->assertJsonPath('role', 'admin');
        $this->assertSame($hash, User::find($id)->password); // blank password keeps the old one

        $this->postJson('/api/users', ['name' => 'X', 'username' => 'ana', 'email' => 'x@example.com', 'password' => 'short', 'role' => 'user', 'status' => 'active'])
            ->assertJsonValidationErrors(['username', 'password']);

        $this->deleteJson("/api/users/{$id}")->assertNoContent();
    }

    public function test_users_change_their_own_account(): void
    {
        $user = User::factory()->create(['name' => 'Juan', 'username' => 'juan', 'email' => 'juan@example.com', 'password' => 'secret123']);
        Sanctum::actingAs($user);
        $base = ['name' => 'Juan', 'username' => 'juan', 'email' => 'juan@example.com'];

        // Name only: no password needed. Role can't be changed here.
        $this->putJson('/api/me', [...$base, 'name' => 'Juan dela Cruz', 'role' => 'admin'])->assertOk()->assertJsonPath('name', 'Juan dela Cruz');
        $this->assertSame('user', $user->fresh()->role);

        // Username / password need the current password, and the new password typed twice.
        $this->putJson('/api/me', [...$base, 'username' => 'juandc'])->assertJsonValidationErrors('current_password');
        $this->putJson('/api/me', [...$base, 'password' => 'newpass123', 'password_confirmation' => 'other', 'current_password' => 'secret123'])
            ->assertJsonValidationErrors('password');
        $this->putJson('/api/me', [...$base, 'username' => 'juandc', 'password' => 'newpass123', 'password_confirmation' => 'newpass123', 'current_password' => 'secret123'])
            ->assertOk()->assertJsonPath('username', 'juandc');
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('newpass123', $user->fresh()->password));
    }

    public function test_admin_cannot_lock_themselves_out(): void
    {
        $admin = User::factory()->admin()->create(['username' => 'boss', 'email' => 'boss@example.com']);
        Sanctum::actingAs($admin);
        $self = ['name' => $admin->name, 'username' => 'boss', 'email' => 'boss@example.com', 'role' => 'user', 'status' => 'active'];

        $this->putJson("/api/users/{$admin->id}", $self)->assertUnprocessable();
        $this->putJson("/api/users/{$admin->id}", [...$self, 'role' => 'admin', 'status' => 'inactive'])->assertUnprocessable();
        $this->deleteJson("/api/users/{$admin->id}")->assertUnprocessable();
    }
}
