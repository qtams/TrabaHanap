<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * The first admin, from backend/.env (ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD), so no
 * password lives in the code. Safe to run again: updates that username instead of duplicating it.
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $username = env('ADMIN_USERNAME');
        $password = env('ADMIN_PASSWORD');
        if (! $username || ! $password) {
            $this->command?->warn('AdminSeeder skipped: set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env.');

            return;
        }

        User::updateOrCreate(['username' => $username], [
            'name' => env('ADMIN_NAME', $username),
            'email' => env('ADMIN_EMAIL'),
            'password' => $password,
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->command?->info("Admin {$username} is ready.");
    }
}
