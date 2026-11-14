<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Users module, admins only (routes use the `admin` middleware).
 * Guards: you can't demote, deactivate or delete yourself, so there is always an admin who can get in.
 */
class UserController extends Controller
{
    public function index()
    {
        return User::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        return response()->json(User::create($this->validated($request)), 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $this->validated($request, $user);
        if ($user->is($request->user()) && (($data['role'] ?? 'admin') !== 'admin' || ($data['status'] ?? 'active') !== 'active')) {
            abort(422, 'You can’t remove your own admin role or deactivate yourself.');
        }
        if (empty($data['password'])) {
            unset($data['password']); // blank = keep the current one
        }
        $user->update($data);

        return $user;
    }

    public function destroy(Request $request, User $user)
    {
        abort_if($user->is($request->user()), 422, 'You can’t delete your own account.');
        $user->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'alpha_dash', Rule::unique('users')->ignore($user)],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user)],
            'password' => [$user ? 'nullable' : 'required', 'string', Password::min(8)->letters()->numbers()],
            'role' => ['required', Rule::in(User::ROLES)],
            'status' => ['required', Rule::in(User::STATUSES)],
        ]);
    }
}
