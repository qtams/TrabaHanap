<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/** Session sign-in for the SPA (Sanctum stateful): username or email + password. */
class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['boolean'],
        ]);

        // 5 tries a minute per login name + IP.
        $key = 'login:'.mb_strtolower($data['login']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['login' => 'Too many attempts. Try again in '.RateLimiter::availableIn($key).' seconds.']);
        }

        $field = str_contains($data['login'], '@') ? 'email' : 'username';
        // Case doesn't matter: "Tamahome" and "tamahome" are the same username.
        $user = User::whereRaw("lower({$field}) = ?", [mb_strtolower(trim($data['login']))])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($key);
            throw ValidationException::withMessages(['login' => 'Wrong username, email or password.']);
        }
        if (! $user->isActive()) {
            throw ValidationException::withMessages(['login' => 'This account is inactive. Ask an administrator to turn it back on.']);
        }

        RateLimiter::clear($key);
        Auth::guard('web')->login($user, $data['remember'] ?? false);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        return $user;
    }

    public function me(Request $request)
    {
        return $request->user();
    }

    /**
     * "My account": the signed-in user changes their own name, username, email and password.
     * Username, email or password changes need the current password. Role and status stay admin-only.
     */
    public function updateMe(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'alpha_dash', Rule::unique('users')->ignore($user)],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user)],
            'password' => ['nullable', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
            'current_password' => ['nullable', 'string'],
        ]);

        $sensitive = ! empty($data['password'])
            || mb_strtolower($data['username']) !== mb_strtolower((string) $user->username)
            || mb_strtolower($data['email']) !== mb_strtolower($user->email);
        if ($sensitive && ! Hash::check((string) ($data['current_password'] ?? ''), $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Enter your current password to change your username, email or password.']);
        }

        unset($data['current_password']);
        if (empty($data['password'])) {
            unset($data['password']);
        }
        $user->update($data);

        return $user;
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
