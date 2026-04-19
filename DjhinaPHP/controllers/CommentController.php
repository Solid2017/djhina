<?php
class CommentController {

    public function list(array $params): void {
        [$page, $limit, $offset] = Router::pagination();
        $eventId = $params['id'];

        $total = (int) Database::queryOne(
            'SELECT COUNT(*) AS n FROM comments WHERE event_id = ? AND parent_id IS NULL AND is_hidden = 0',
            [$eventId]
        )['n'];

        $rows = Database::query(
            "SELECT c.id, c.content, c.likes_count, c.created_at,
                    u.id AS user_id, u.name AS user_name, u.avatar AS user_avatar,
                    (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) AS replies_count
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.event_id = ? AND c.parent_id IS NULL AND c.is_hidden = 0
             ORDER BY c.created_at DESC
             LIMIT ? OFFSET ?",
            [$eventId, $limit, $offset]
        );

        foreach ($rows as &$r) {
            $r['user_avatar'] = $r['user_avatar'] ? APP_URL . $r['user_avatar'] : null;
        }

        Response::paginated($rows, $total, $page, $limit);
    }

    public function replies(array $params): void {
        $rows = Database::query(
            "SELECT c.id, c.content, c.likes_count, c.created_at,
                    u.id AS user_id, u.name AS user_name, u.avatar AS user_avatar
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.parent_id = ? AND c.is_hidden = 0
             ORDER BY c.created_at ASC",
            [$params['commentId']]
        );
        foreach ($rows as &$r) {
            $r['user_avatar'] = $r['user_avatar'] ? APP_URL . $r['user_avatar'] : null;
        }
        Response::ok($rows);
    }

    public function create(array $params): void {
        $user    = Auth::require();
        $body    = Router::body();
        $content = trim($body['content'] ?? '');
        $parent  = $body['parent_id'] ?? null;

        if (!$content) { Response::error('Le contenu est requis.'); return; }
        if (strlen($content) > 1000) { Response::error('Commentaire trop long (max 1000 caractères).'); return; }

        $id = Router::uuid();
        Database::execute(
            'INSERT INTO comments (id, event_id, user_id, parent_id, content) VALUES (?,?,?,?,?)',
            [$id, $params['id'], $user['id'], $parent, $content]
        );

        $comment = Database::queryOne(
            "SELECT c.id, c.content, c.likes_count, c.created_at,
                    u.id AS user_id, u.name AS user_name, u.avatar AS user_avatar
             FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?",
            [$id]
        );
        $comment['user_avatar'] = $comment['user_avatar'] ? APP_URL . $comment['user_avatar'] : null;
        Response::created($comment, 'Commentaire ajouté.');
    }

    public function update(array $params): void {
        $user    = Auth::require();
        $body    = Router::body();
        $content = trim($body['content'] ?? '');
        if (!$content) { Response::error('Contenu requis.'); return; }

        $comment = Database::queryOne('SELECT id, user_id FROM comments WHERE id = ?', [$params['commentId']]);
        if (!$comment) { Response::notFound(); return; }
        if ($comment['user_id'] !== $user['id'] && $user['role'] !== 'admin') {
            Response::error('Action non autorisée.', 403); return;
        }
        Database::execute('UPDATE comments SET content = ? WHERE id = ?', [$content, $params['commentId']]);
        Response::ok([], 'Commentaire modifié.');
    }

    public function remove(array $params): void {
        $user    = Auth::require();
        $comment = Database::queryOne('SELECT id, user_id FROM comments WHERE id = ?', [$params['commentId']]);
        if (!$comment) { Response::notFound(); return; }
        if ($comment['user_id'] !== $user['id'] && $user['role'] !== 'admin') {
            Response::error('Action non autorisée.', 403); return;
        }
        Database::execute('DELETE FROM comments WHERE id = ? OR parent_id = ?', [$params['commentId'], $params['commentId']]);
        Response::ok([], 'Commentaire supprimé.');
    }

    public function like(array $params): void {
        Database::execute('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?', [$params['commentId']]);
        Response::ok();
    }
}
