<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/** First admin (or a rescue one): php artisan app:create-admin. Asks for everything in the terminal. */
class CreateAdmin extends Command
{
    protected $signature = 'app:create-admin';

    protected $description = 'Create an administrator account for TrabaHanap';

    public function handle(): int
    {
        $data = [
            'name' => text('Full name', required: true),
            'username' => text('Username', required: true, hint: '3–30 letters, numbers, - or _'),
            'email' => text('Email', required: true),
            'password' => password('Password', required: true, hint: 'At least 8 characters, with letters and numbers'),
        ];

        $validator = Validator::make($data, [
            'name' => ['required', 'max:120'],
            'username' => ['required', 'min:3', 'max:30', 'alpha_dash', 'unique:users'],
            'email' => ['required', 'email', 'unique:users'],
            'password' => ['required', Password::min(8)->letters()->numbers()],
        ]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        User::create([...$data, 'role' => 'admin', 'status' => 'active']);
        $this->info("Admin {$data['username']} created. Sign in at the TrabaHanap login page.");

        return self::SUCCESS;
    }
}
