<?php
class NotificationController {

    public function list(): void {
        $user = Auth::require();
        [$page, $limit, $offset] = Router::pagination();
        $unread = !empty($_GET['unread']);

        $where  = ['user_id = ?'];
        $params = [$user['id']];
        if ($unread) { $where[] = 'is_read = 0'; }
        $wClause = implode(' AND ', $where);

        $total = (int) Database::queryOne("SELECT COUNT(*) AS n FROM notifications WHERE $wClause", $params)['n'];
        $params[] = $limit; $params[] = $offset;
        $rows  = Database::query("SELECT * FROM notifications WHERE $wClause ORDER BY created_at DESC LIMIT ? OFFSET ?", $params);

        foreach ($rows as &$r) {
            $r['data']    = $r['data'] ? json_decode($r['data'], true) : null;
            $r['is_read'] = (bool) $r['is_read'];
        }
        Response::paginated($rows, $total, $page, $limit);
    }

    public function getOne(array $params): void {
        $user = Auth::require();
        $notif = Database::queryOne('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [$params['id'], $user['id']]);
        if (!$notif) { Response::notFound(); return; }
        Database::execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [$params['id']]);
        $notif['data']    = $notif['data'] ? json_decode($notif['data'], true) : null;
        $notif['is_read'] = true;
        Response::ok($notif);
    }

    public function markRead(array $params): void {
        $user = Auth::require();
        Database::execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [$params['id'], $user['id']]);
        Response::ok([], 'Notification marquée comme lue.');
    }

    public function markAllRead(): void {
        $user = Auth::require();
        Database::execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [$user['id']]);
        Response::ok([], 'Toutes les notifications sont lues.');
    }

    public function remove(array $params): void {
        $user = Auth::require();
        Database::execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [$params['id'], $user['id']]);
        Response::ok([], 'Notification supprimée.');
    }

    public function removeAll(): void {
        $user = Auth::require();
        Database::execute('DELETE FROM notifications WHERE user_id = ?', [$user['id']]);
        Response::ok([], 'Notifications supprimées.');
    }

    public function broadcast(): void {
        Auth::requireRole('admin');
        $body = Router::body();
        $title   = $body['title']   ?? '';
        $message = $body['message'] ?? '';
        $userIds = $body['user_ids'] ?? [];

        if (!$title || !$message) { Response::error('Titre et message requis.'); return; }

        $targets = $userIds
            ? Database::query('SELECT id FROM users WHERE id IN (' . implode(',', array_fill(0, count($userIds), '?')) . ')', $userIds)
            : Database::query('SELECT id FROM users WHERE is_active = 1');

        $count = 0;
        foreach ($targets as $t) {
            Database::execute(
                'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?,?,?,?,?)',
                [Router::uuid(), $t['id'], 'broadcast', $title, $message]
            );
            $count++;
        }
        Response::ok(['sent_to' => $count], "Notification envoyée à $count utilisateur(s).");
    }
}
