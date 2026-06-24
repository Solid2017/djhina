<?php
class Auth {

    // Middleware : vérifie le token JWT et charge l'utilisateur
    public static function require(): array {
        $user = self::getUser();
        if (!$user) {
            Response::json(['success' => false, 'message' => 'Authentification requise.'], 401);
            exit;
        }
        return $user;
    }

    // Middleware : vérifie le rôle requis
    public static function requireRole(string ...$roles): array {
        $user = self::require();
        if (!in_array($user['role'], $roles, true)) {
            Response::json(['success' => false, 'message' => 'Accès refusé. Rôle requis : ' . implode(' ou ', $roles) . '.'], 403);
            exit;
        }
        return $user;
    }

    // Optionnel : retourne l'utilisateur si connecté, null sinon
    public static function optional(): ?array {
        return self::getUser();
    }

    private static function getUser(): ?array {
        $token = self::extractToken();
        if (!$token) return null;

        $payload = JWT::decode($token);
        if (!$payload || empty($payload['sub'])) return null;

        $user = Database::queryOne(
            'SELECT id, name, email, role, avatar, is_active FROM users WHERE id = ?',
            [$payload['sub']]
        );
        if (!$user || !$user['is_active']) return null;

        return $user;
    }

    private static function extractToken(): ?string {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (strpos($header, 'Bearer ') === 0) {
            return substr($header, 7);
        }
        return null;
    }
}
