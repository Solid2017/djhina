<?php
class PrivacyController {

    public function getSettings(): void {
        $user = Auth::require();
        $row  = Database::queryOne(
            'SELECT privacy_profile_public, privacy_show_activity, privacy_show_tickets,
                    data_share_analytics, biometric_enabled
             FROM users WHERE id = ?',
            [$user['id']]
        );
        Response::ok($row ?: []);
    }

    public function updateSettings(): void {
        $user    = Auth::require();
        $body    = Router::body();
        $allowed = ['privacy_profile_public', 'privacy_show_activity', 'privacy_show_tickets', 'data_share_analytics', 'biometric_enabled'];
        $fields  = []; $values = [];

        foreach ($allowed as $key) {
            if (array_key_exists($key, $body)) {
                $fields[] = "$key = ?";
                $values[] = $body[$key] ? 1 : 0;
            }
        }
        if (!$fields) { Response::error('Aucune modification fournie.'); return; }
        $values[] = $user['id'];
        Database::execute('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?', $values);
        Response::ok([], 'Paramètres de confidentialité mis à jour.');
    }

    public function exportData(): void {
        $user = Auth::require();

        $profile  = Database::queryOne(
            'SELECT id, name, email, phone, country, city, bio, created_at FROM users WHERE id = ?',
            [$user['id']]
        );
        $tickets  = Database::query(
            "SELECT t.ticket_number, e.title AS event, e.date, tt.name AS ticket_type, t.price_paid, t.status, t.created_at
             FROM tickets t JOIN events e ON t.event_id = e.id JOIN ticket_types tt ON t.ticket_type_id = tt.id
             WHERE t.user_id = ?",
            [$user['id']]
        );
        $payments = Database::query(
            "SELECT p.total, p.currency, p.provider, p.status, p.paid_at, e.title AS event
             FROM payments p JOIN events e ON p.event_id = e.id
             WHERE p.user_id = ?",
            [$user['id']]
        );

        header('Content-Disposition: attachment; filename="djhina-data-export.json"');
        Response::ok(['profile' => $profile, 'tickets' => $tickets, 'payments' => $payments]);
    }

    public function deleteAccount(): void {
        $user = Auth::require();
        $body = Router::body();
        $pass = $body['password'] ?? '';

        if (!$pass) { Response::error('Mot de passe requis pour supprimer le compte.'); return; }

        $row = Database::queryOne('SELECT password FROM users WHERE id = ?', [$user['id']]);
        if (!$row || !password_verify($pass, $row['password'])) {
            Response::error('Mot de passe incorrect.', 401); return;
        }

        $ghost = 'deleted_' . $user['id'] . '@djhina.deleted';
        Database::execute(
            "UPDATE users SET email = ?, name = 'Compte supprimé', is_active = 0 WHERE id = ?",
            [$ghost, $user['id']]
        );
        Database::execute('DELETE FROM refresh_tokens WHERE user_id = ?', [$user['id']]);

        Response::ok([], 'Votre compte a été supprimé.');
    }

    public function changePassword(): void {
        $user = Auth::require();
        $body = Router::body();
        $current = $body['current_password'] ?? '';
        $new     = $body['new_password']     ?? '';

        if (!$current || !$new) { Response::error('Mot de passe actuel et nouveau requis.'); return; }
        if (strlen($new) < 6)   { Response::error('Le nouveau mot de passe doit faire au moins 6 caractères.'); return; }

        $row = Database::queryOne('SELECT password FROM users WHERE id = ?', [$user['id']]);
        if (!$row || !password_verify($current, $row['password'])) {
            Response::error('Mot de passe actuel incorrect.', 401); return;
        }

        Database::execute('UPDATE users SET password = ? WHERE id = ?', [password_hash($new, PASSWORD_BCRYPT, ['cost' => 9]), $user['id']]);
        Response::ok([], 'Mot de passe mis à jour.');
    }
}
