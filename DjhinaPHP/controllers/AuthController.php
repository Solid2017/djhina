<?php
class AuthController {

    public function register(): void {
        $body = Router::body();
        $name  = trim($body['name']  ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $pass  = $body['password'] ?? '';
        $phone = trim($body['phone'] ?? '');
        $role  = in_array($body['role'] ?? '', ['user', 'organizer']) ? $body['role'] : 'user';

        if (!$name || !$email || !$pass) {
            Response::error('Nom, email et mot de passe sont requis.'); return;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Email invalide.'); return;
        }
        if (strlen($pass) < 6) {
            Response::error('Le mot de passe doit faire au moins 6 caractères.'); return;
        }
        if (Database::queryOne('SELECT id FROM users WHERE email = ?', [$email])) {
            Response::error('Cet email est déjà utilisé.', 409); return;
        }

        $id   = Router::uuid();
        $hash = password_hash($pass, PASSWORD_BCRYPT);
        Database::execute(
            'INSERT INTO users (id, name, email, password, phone, role) VALUES (?,?,?,?,?,?)',
            [$id, $name, $email, $hash, $phone, $role]
        );

        $user = Database::queryOne('SELECT id, name, email, role, avatar FROM users WHERE id = ?', [$id]);
        [$access, $refresh] = $this->issueTokens($user);

        Response::created([
            'token'        => $access,
            'refreshToken' => $refresh,
            'user'         => $this->publicUser($user),
        ], 'Compte créé avec succès.');
    }

    public function login(): void {
        $body  = Router::body();
        $email = strtolower(trim($body['email'] ?? ''));
        $pass  = $body['password'] ?? '';

        if (!$email || !$pass) { Response::error('Email et mot de passe requis.'); return; }

        $user = Database::queryOne('SELECT * FROM users WHERE email = ?', [$email]);
        if (!$user || !password_verify($pass, $user['password'])) {
            Response::error('Identifiants incorrects.', 401); return;
        }
        if (!$user['is_active']) {
            Response::error('Compte désactivé.', 403); return;
        }

        Database::execute('UPDATE users SET last_login = NOW() WHERE id = ?', [$user['id']]);
        [$access, $refresh] = $this->issueTokens($user);

        Response::ok([
            'token'        => $access,
            'refreshToken' => $refresh,
            'user'         => $this->publicUser($user),
        ]);
    }

    public function refresh(): void {
        $body  = Router::body();
        $token = $body['refreshToken'] ?? '';
        if (!$token) { Response::error('Token requis.'); return; }

        $payload = JWT::decode($token);
        if (!$payload || ($payload['type'] ?? '') !== 'refresh') {
            Response::error('Token invalide ou expiré.', 401); return;
        }

        // Vérifier que le token existe en DB
        $stored = Database::queryOne(
            'SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ?',
            [$token, $payload['sub']]
        );
        if (!$stored || strtotime($stored['expires_at']) < time()) {
            Response::error('Session expirée.', 401); return;
        }

        $user = Database::queryOne('SELECT id, name, email, role, avatar FROM users WHERE id = ? AND is_active = 1', [$payload['sub']]);
        if (!$user) { Response::error('Utilisateur introuvable.', 401); return; }

        // Rotation du refresh token
        Database::execute('DELETE FROM refresh_tokens WHERE token = ?', [$token]);
        [$access, $newRefresh] = $this->issueTokens($user);

        Response::ok(['token' => $access, 'refreshToken' => $newRefresh]);
    }

    public function logout(): void {
        $body  = Router::body();
        $token = $body['refreshToken'] ?? '';
        if ($token) {
            Database::execute('DELETE FROM refresh_tokens WHERE token = ?', [$token]);
        }
        Response::ok([], 'Déconnecté.');
    }

    public function me(array $params, array $user): void {
        $full = Database::queryOne(
            'SELECT id, name, email, phone, role, avatar, country, city, bio,
                    privacy_profile_public, privacy_show_activity, privacy_show_tickets,
                    data_share_analytics, biometric_enabled, created_at
             FROM users WHERE id = ?',
            [$user['id']]
        );
        Response::ok($full ?: $user);
    }

    public function updateProfile(array $params, array $user): void {
        $body   = Router::body();
        $avatar = Upload::image('avatar', 'avatars');

        $allowed = ['name', 'phone', 'city', 'country', 'bio'];
        $fields  = [];
        $values  = [];

        foreach ($allowed as $key) {
            if (isset($body[$key]) && $body[$key] !== '') {
                $fields[] = "$key = ?";
                $values[] = $body[$key];
            }
        }
        if ($avatar) { $fields[] = 'avatar = ?'; $values[] = $avatar; }
        if (!$fields) { Response::error('Aucune modification fournie.'); return; }

        $values[] = $user['id'];
        Database::execute('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?', $values);

        $updated = Database::queryOne(
            'SELECT id, name, email, phone, role, avatar, country, city, bio FROM users WHERE id = ?',
            [$user['id']]
        );
        Response::ok($updated, 'Profil mis à jour.');
    }

    private function issueTokens(array $user): array {
        $access = JWT::encode(['sub' => $user['id'], 'role' => $user['role'], 'type' => 'access']);

        $refreshId = Router::uuid();
        $refresh   = JWT::encodeRefresh(['sub' => $user['id'], 'role' => $user['role'], 'type' => 'refresh', 'jti' => $refreshId]);

        Database::execute(
            'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?,?,?,?)',
            [$refreshId, $user['id'], $refresh, date('Y-m-d H:i:s', time() + JWT_REFRESH)]
        );

        return [$access, $refresh];
    }

    private function publicUser(array $u): array {
        return [
            'id'     => $u['id'],
            'name'   => $u['name'],
            'email'  => $u['email'],
            'role'   => $u['role'],
            'avatar' => $u['avatar'] ? APP_URL . $u['avatar'] : null,
        ];
    }
}
