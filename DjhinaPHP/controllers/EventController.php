<?php
class EventController {

    public function list(): void {
        // Cache CDN LWS pour les requêtes publiques (non authentifiées)
        // Edge-Cache-Engine-Mode est ACTIVE sur LWS → sert les réponses cachées en <100ms
        if (empty($_SERVER['HTTP_AUTHORIZATION'])) {
            header('Cache-Control: public, max-age=60, s-maxage=120');
        } else {
            header('Cache-Control: private, no-store');
        }

        [$page, $limit, $offset] = Router::pagination();
        $where  = ["e.status = 'published'"];
        $params = [];

        if (!empty($_GET['category'])) { $where[] = 'c.slug = ?';          $params[] = $_GET['category']; }
        if (!empty($_GET['city']))     { $where[] = 'e.city LIKE ?';        $params[] = '%' . $_GET['city'] . '%'; }
        if (!empty($_GET['featured'])) { $where[] = 'e.is_featured = 1'; }
        if (!empty($_GET['search'])) {
            $where[]  = '(e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)';
            $s = '%' . $_GET['search'] . '%';
            $params = array_merge($params, [$s, $s, $s]);
        }
        if (!empty($_GET['date_from'])) { $where[] = 'e.date >= ?'; $params[] = $_GET['date_from']; }
        if (!empty($_GET['date_to']))   { $where[] = 'e.date <= ?'; $params[] = $_GET['date_to'];   }

        $wClause = implode(' AND ', $where);
        $sort    = in_array($_GET['sort'] ?? '', ['date', 'title', 'created_at']) ? $_GET['sort'] : 'date';
        $order   = ($_GET['order'] ?? 'asc') === 'desc' ? 'DESC' : 'ASC';

        $total = (int) Database::queryOne(
            "SELECT COUNT(*) AS n FROM events e
             LEFT JOIN categories c ON e.category_id = c.id
             WHERE $wClause", $params
        )['n'];

        $countParams = $params;
        $params[]    = $limit;
        $params[]    = $offset;

        $rows = Database::query(
            "SELECT e.id, e.title, e.subtitle, e.date, e.time, e.end_time,
                    e.location, e.city, e.country, e.cover_image, e.video_url,
                    e.capacity, e.registered, e.is_featured, e.is_free, e.tags,
                    e.status, e.created_at,
                    u.id AS organizer_id, u.name AS organizer_name, u.avatar AS organizer_avatar,
                    c.slug AS category, c.label AS category_label, c.color AS category_color,
                    (SELECT COUNT(*) FROM event_likes el WHERE el.event_id = e.id) AS likes_count
             FROM events e
             JOIN users u ON e.organizer_id = u.id
             LEFT JOIN categories c ON e.category_id = c.id
             WHERE $wClause
             ORDER BY e.$sort $order
             LIMIT ? OFFSET ?",
            $params
        );

        $user = Auth::optional();
        foreach ($rows as &$row) {
            $row = $this->normalizeEvent($row, $user);
        }

        Response::paginated($rows, $total, $page, $limit);
    }

    public function getOne(array $params): void {
        $user  = Auth::optional();
        $event = Database::queryOne(
            "SELECT e.*, u.name AS organizer_name, u.avatar AS organizer_avatar,
                    c.slug AS category, c.label AS category_label
             FROM events e
             JOIN users u ON e.organizer_id = u.id
             LEFT JOIN categories c ON e.category_id = c.id
             WHERE e.id = ? AND e.status = 'published'",
            [$params['id']]
        );
        if (!$event) { Response::notFound('Événement introuvable.'); return; }

        $tickets = Database::query(
            'SELECT id, name, price, currency, available, sold, color, benefits, is_active
             FROM ticket_types WHERE event_id = ? AND is_active = 1 ORDER BY price ASC',
            [$params['id']]
        );
        $event['ticket_types'] = $tickets;
        $event['likes_count']  = (int) Database::queryOne(
            'SELECT COUNT(*) AS n FROM event_likes WHERE event_id = ?', [$params['id']]
        )['n'];
        $event['comments_count'] = (int) Database::queryOne(
            'SELECT COUNT(*) AS n FROM comments WHERE event_id = ? AND parent_id IS NULL', [$params['id']]
        )['n'];

        if ($user) {
            $event['is_liked'] = (bool) Database::queryOne(
                'SELECT 1 FROM event_likes WHERE event_id = ? AND user_id = ?', [$params['id'], $user['id']]
            );
            $event['is_saved'] = (bool) Database::queryOne(
                'SELECT 1 FROM event_saves WHERE event_id = ? AND user_id = ?', [$params['id'], $user['id']]
            );
        }

        Response::ok($this->normalizeEvent($event, $user));
    }

    public function like(array $params): void {
        $user = Auth::require();
        $id   = $params['id'];

        $exists = Database::queryOne(
            'SELECT 1 FROM event_likes WHERE event_id = ? AND user_id = ?', [$id, $user['id']]
        );
        if ($exists) {
            Database::execute('DELETE FROM event_likes WHERE event_id = ? AND user_id = ?', [$id, $user['id']]);
            Response::ok(['liked' => false]);
        } else {
            Database::execute('INSERT INTO event_likes (event_id, user_id) VALUES (?,?)', [$id, $user['id']]);
            Response::ok(['liked' => true]);
        }
    }

    public function save(array $params): void {
        $user = Auth::require();
        $id   = $params['id'];

        $exists = Database::queryOne(
            'SELECT 1 FROM event_saves WHERE event_id = ? AND user_id = ?', [$id, $user['id']]
        );
        if ($exists) {
            Database::execute('DELETE FROM event_saves WHERE event_id = ? AND user_id = ?', [$id, $user['id']]);
            Response::ok(['saved' => false]);
        } else {
            Database::execute('INSERT INTO event_saves (event_id, user_id) VALUES (?,?)', [$id, $user['id']]);
            Response::ok(['saved' => true]);
        }
    }

    // Normalise un événement pour l'API mobile
    private function normalizeEvent(array $e, ?array $user): array {
        $tags = $e['tags'] ? (is_string($e['tags']) ? json_decode($e['tags'], true) : $e['tags']) : [];
        return array_merge($e, [
            'cover_image' => $e['cover_image'] ? APP_URL . $e['cover_image'] : null,
            'video_url'   => $e['video_url']   ? APP_URL . $e['video_url']   : null,
            'organizer_avatar' => isset($e['organizer_avatar']) && $e['organizer_avatar']
                ? APP_URL . $e['organizer_avatar'] : null,
            'tags'        => $tags,
            'is_featured' => (bool) ($e['is_featured'] ?? false),
            'is_free'     => (bool) ($e['is_free']     ?? false),
        ]);
    }
}
