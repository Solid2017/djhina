<?php
class AdminController {

    public function stats(): void {
        Auth::requireRole('admin');
        Response::ok([
            'totalUsers'    => (int) Database::queryOne("SELECT COUNT(*) AS n FROM users WHERE role = 'user'")['n'],
            'totalOrgs'     => (int) Database::queryOne("SELECT COUNT(*) AS n FROM users WHERE role = 'organizer'")['n'],
            'totalEvents'   => (int) Database::queryOne("SELECT COUNT(*) AS n FROM events")['n'],
            'publishedEvents'=> (int) Database::queryOne("SELECT COUNT(*) AS n FROM events WHERE status = 'published'")['n'],
            'totalTickets'  => (int) Database::queryOne("SELECT COUNT(*) AS n FROM tickets")['n'],
            'totalRevenue'  => (float) Database::queryOne("SELECT COALESCE(SUM(total),0) AS n FROM payments WHERE status = 'completed'")['n'],
            'recentEvents'  => Database::query("SELECT e.id, e.title, e.date, e.status, u.name AS organizer FROM events e JOIN users u ON e.organizer_id = u.id ORDER BY e.created_at DESC LIMIT 5"),
            'recentPayments'=> Database::query("SELECT p.id, p.total, p.status, p.created_at, u.name AS user_name, e.title AS event FROM payments p JOIN users u ON p.user_id = u.id JOIN events e ON p.event_id = e.id ORDER BY p.created_at DESC LIMIT 5"),
        ]);
    }

    // ── Users ─────────────────────────────────────────────────────
    public function listUsers(): void {
        Auth::requireRole('admin');
        [$page, $limit, $offset] = Router::pagination();
        $where = ['1=1']; $params = [];
        if (!empty($_GET['role']))   { $where[] = 'role = ?';        $params[] = $_GET['role']; }
        if (!empty($_GET['search'])) { $where[] = '(name LIKE ? OR email LIKE ?)'; $s = '%'.$_GET['search'].'%'; $params = array_merge($params, [$s, $s]); }
        $wCl  = implode(' AND ', $where);
        $total= (int) Database::queryOne("SELECT COUNT(*) AS n FROM users WHERE $wCl", $params)['n'];
        $params[] = $limit; $params[] = $offset;
        $rows = Database::query("SELECT id, name, email, role, avatar, country, city, is_active, created_at FROM users WHERE $wCl ORDER BY created_at DESC LIMIT ? OFFSET ?", $params);
        foreach ($rows as &$r) { $r['avatar'] = $r['avatar'] ? APP_URL . $r['avatar'] : null; }
        Response::paginated($rows, $total, $page, $limit);
    }

    public function createUser(): void {
        Auth::requireRole('admin');
        $body = Router::body();
        $name = trim($body['name'] ?? '');  $email = strtolower(trim($body['email'] ?? '')); $pass = $body['password'] ?? '';
        if (!$name || !$email || !$pass) { Response::error('Nom, email, mot de passe requis.'); return; }
        if (Database::queryOne('SELECT id FROM users WHERE email = ?', [$email])) { Response::error('Email déjà utilisé.', 409); return; }
        $avatar = Upload::image('avatar', 'avatars');
        $id     = Router::uuid();
        $role   = in_array($body['role'] ?? '', ['user','organizer','admin']) ? $body['role'] : 'user';
        Database::execute(
            'INSERT INTO users (id, name, email, password, role, phone, avatar) VALUES (?,?,?,?,?,?,?)',
            [$id, $name, $email, password_hash($pass, PASSWORD_BCRYPT), $role, $body['phone'] ?? null, $avatar]
        );
        Response::created(['id' => $id], 'Utilisateur créé.');
    }

    public function getUser(array $params): void {
        Auth::requireRole('admin');
        $user = Database::queryOne('SELECT id, name, email, role, avatar, phone, country, city, bio, is_active, created_at FROM users WHERE id = ?', [$params['id']]);
        if (!$user) { Response::notFound(); return; }
        $user['avatar'] = $user['avatar'] ? APP_URL . $user['avatar'] : null;
        Response::ok($user);
    }

    public function updateUser(array $params): void {
        Auth::requireRole('admin');
        $body    = Router::body();
        $allowed = ['name', 'email', 'phone', 'role', 'city', 'country', 'is_active'];
        $fields  = []; $values = [];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $body)) { $fields[] = "$key = ?"; $values[] = $body[$key]; }
        }
        $avatar = Upload::image('avatar', 'avatars');
        if ($avatar) { $fields[] = 'avatar = ?'; $values[] = $avatar; }
        if (!empty($body['password'])) { $fields[] = 'password = ?'; $values[] = password_hash($body['password'], PASSWORD_BCRYPT); }
        if (!$fields) { Response::error('Aucune modification.'); return; }
        $values[] = $params['id'];
        Database::execute('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?', $values);
        Response::ok([], 'Utilisateur mis à jour.');
    }

    public function deleteUser(array $params): void {
        Auth::requireRole('admin');
        Database::execute("UPDATE users SET is_active = 0 WHERE id = ?", [$params['id']]);
        Response::ok([], 'Utilisateur désactivé.');
    }

    // ── Events ────────────────────────────────────────────────────
    public function listEvents(): void {
        Auth::requireRole('admin');
        [$page, $limit, $offset] = Router::pagination();
        $where = ['1=1']; $params = [];
        if (!empty($_GET['status']))       { $where[] = 'e.status = ?';        $params[] = $_GET['status']; }
        if (!empty($_GET['organizer_id'])) { $where[] = 'e.organizer_id = ?';  $params[] = $_GET['organizer_id']; }
        if (!empty($_GET['search']))       { $where[] = '(e.title LIKE ? OR e.location LIKE ? OR u.name LIKE ?)'; $s='%'.$_GET['search'].'%'; $params=array_merge($params,[$s,$s,$s]); }
        $wCl   = implode(' AND ', $where);
        $total = (int) Database::queryOne("SELECT COUNT(*) AS n FROM events e JOIN users u ON e.organizer_id = u.id WHERE $wCl", $params)['n'];
        $params[] = $limit; $params[] = $offset;
        $rows  = Database::query(
            "SELECT e.id, e.title, e.date, e.status, e.registered, e.capacity, e.cover_image, e.is_featured,
                    u.name AS organizer_name, c.label AS category_label
             FROM events e JOIN users u ON e.organizer_id = u.id LEFT JOIN categories c ON e.category_id = c.id
             WHERE $wCl ORDER BY e.created_at DESC LIMIT ? OFFSET ?", $params);
        foreach ($rows as &$r) { $r['cover_image'] = $r['cover_image'] ? APP_URL . $r['cover_image'] : null; }
        Response::paginated($rows, $total, $page, $limit);
    }

    public function createEvent(): void {
        $user = Auth::requireRole('admin');
        $body = Router::body();
        $title = trim($body['title'] ?? '');  $date = $body['date'] ?? '';  $location = trim($body['location'] ?? '');
        if (!$title || !$date || !$location) { Response::error('Titre, date, lieu requis.'); return; }

        $cover = Upload::image('cover', 'events');
        $video = Upload::video('video');
        $id    = Router::uuid();
        $orgId = $body['organizer_id'] ?? $user['id'];
        [$d, $t] = $this->splitDt($date);
        [, $et]  = $this->splitDt($body['end_time'] ?? '');

        Database::execute(
            'INSERT INTO events (id, organizer_id, category_id, title, subtitle, description, cover_image, video_url, date, time, end_time, location, city, country, capacity, is_featured, tags, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [$id, $orgId, $body['category_id'] ?? null, $title, $body['subtitle'] ?? null, $body['description'] ?? null,
             $cover, $video, $d, $t, $et, $location, $body['city'] ?? "N'Djaména", $body['country'] ?? 'Tchad',
             (int)($body['capacity'] ?? 0), ($body['is_featured'] ?? 0) ? 1 : 0,
             json_encode((array)($body['tags'] ?? [])), $body['status'] ?? 'draft']
        );
        Response::created(['id' => $id], 'Événement créé.');
    }

    public function getEvent(array $params): void {
        Auth::requireRole('admin');
        $ev = Database::queryOne(
            "SELECT e.*, u.name AS organizer_name, u.email AS organizer_email, c.label AS category_label
             FROM events e JOIN users u ON e.organizer_id = u.id LEFT JOIN categories c ON e.category_id = c.id
             WHERE e.id = ?", [$params['id']]
        );
        if (!$ev) { Response::notFound(); return; }
        $ev['cover_image'] = $ev['cover_image'] ? APP_URL . $ev['cover_image'] : null;
        $ev['video_url']   = $ev['video_url']   ? APP_URL . $ev['video_url']   : null;
        $ev['ticket_types'] = Database::query('SELECT * FROM ticket_types WHERE event_id = ? ORDER BY price', [$params['id']]);
        Response::ok($ev);
    }

    public function updateEvent(array $params): void {
        Auth::requireRole('admin');
        $body    = Router::body();
        $allowed = ['title','subtitle','description','category_id','date','time','end_time','location','city','country','capacity','is_featured','tags','status'];
        $fields  = []; $values = [];
        foreach ($allowed as $key) {
            if (!isset($body[$key]) || $body[$key] === '') continue;
            $fields[] = "$key = ?";
            $values[] = $key === 'tags' ? json_encode((array)$body[$key]) : $body[$key];
        }
        $cover = Upload::image('cover', 'events');
        $video = Upload::video('video');
        if ($cover) { $fields[] = 'cover_image = ?'; $values[] = $cover; }
        if ($video) { $fields[] = 'video_url = ?';   $values[] = $video; }
        if (!$fields) { Response::error('Aucune modification.'); return; }
        $values[] = $params['id'];
        Database::execute('UPDATE events SET ' . implode(', ', $fields) . ' WHERE id = ?', $values);
        Response::ok([], 'Événement mis à jour.');
    }

    public function setEventStatus(array $params): void {
        Auth::requireRole('admin');
        $status = Router::body()['status'] ?? '';
        $valid  = ['draft','pending_review','published','cancelled','completed'];
        if (!in_array($status, $valid, true)) { Response::error('Statut invalide.'); return; }
        Database::execute('UPDATE events SET status = ? WHERE id = ?', [$status, $params['id']]);
        Response::ok([], 'Statut mis à jour.');
    }

    public function featureEvent(array $params): void {
        Auth::requireRole('admin');
        $feat = Router::body()['is_featured'] ?? null;
        if ($feat === null) { Response::error('is_featured requis.'); return; }
        Database::execute('UPDATE events SET is_featured = ? WHERE id = ?', [$feat ? 1 : 0, $params['id']]);
        Response::ok([], 'Événement ' . ($feat ? 'mis en avant' : 'retiré de la sélection') . '.');
    }

    public function deleteEvent(array $params): void {
        Auth::requireRole('admin');
        Database::execute("UPDATE events SET status = 'cancelled' WHERE id = ?", [$params['id']]);
        Response::ok([], 'Événement annulé.');
    }

    // ── Tickets ───────────────────────────────────────────────────
    public function listTickets(): void {
        Auth::requireRole('admin');
        [$page, $limit, $offset] = Router::pagination();
        $where = ['1=1']; $params = [];
        if (!empty($_GET['event_id'])) { $where[] = 't.event_id = ?'; $params[] = $_GET['event_id']; }
        if (!empty($_GET['status']))   { $where[] = 't.status = ?';   $params[] = $_GET['status'];   }
        $wCl   = implode(' AND ', $where);
        $total = (int) Database::queryOne("SELECT COUNT(*) AS n FROM tickets t WHERE $wCl", $params)['n'];
        $params[] = $limit; $params[] = $offset;
        $rows  = Database::query(
            "SELECT t.id, t.ticket_number, t.holder_name, t.holder_email, t.status, t.price_paid, t.created_at,
                    e.title AS event_title, tt.name AS ticket_type
             FROM tickets t JOIN events e ON t.event_id = e.id JOIN ticket_types tt ON t.ticket_type_id = tt.id
             WHERE $wCl ORDER BY t.created_at DESC LIMIT ? OFFSET ?", $params);
        Response::paginated($rows, $total, $page, $limit);
    }

    public function getTicketAdmin(array $params): void {
        Auth::requireRole('admin');
        $t = Database::queryOne(
            "SELECT t.*, e.title AS event_title, tt.name AS ticket_type, u.name AS holder
             FROM tickets t JOIN events e ON t.event_id = e.id JOIN ticket_types tt ON t.ticket_type_id = tt.id JOIN users u ON t.user_id = u.id
             WHERE t.ticket_number = ?", [$params['number']]
        );
        if (!$t) { Response::notFound(); return; }
        Response::ok($t);
    }

    public function cancelTicketAdmin(array $params): void {
        Auth::requireRole('admin');
        Database::execute("UPDATE tickets SET status = 'cancelled' WHERE ticket_number = ?", [$params['number']]);
        Response::ok([], 'Billet annulé.');
    }

    // ── Payments ──────────────────────────────────────────────────
    public function listPayments(): void {
        Auth::requireRole('admin');
        [$page, $limit, $offset] = Router::pagination();
        $total = (int) Database::queryOne('SELECT COUNT(*) AS n FROM payments')['n'];
        $rows  = Database::query(
            "SELECT p.id, p.total, p.currency, p.provider, p.status, p.paid_at, p.created_at,
                    u.name AS user_name, e.title AS event_title
             FROM payments p JOIN users u ON p.user_id = u.id JOIN events e ON p.event_id = e.id
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
            [$limit, $offset]
        );
        Response::paginated($rows, $total, $page, $limit);
    }

    public function getPaymentAdmin(array $params): void {
        Auth::requireRole('admin');
        $p = Database::queryOne(
            "SELECT p.*, u.name AS user_name, e.title AS event_title
             FROM payments p JOIN users u ON p.user_id = u.id JOIN events e ON p.event_id = e.id
             WHERE p.id = ?", [$params['id']]
        );
        if (!$p) { Response::notFound(); return; }
        Response::ok($p);
    }

    public function updatePaymentStatus(array $params): void {
        Auth::requireRole('admin');
        $status = Router::body()['status'] ?? '';
        $valid  = ['pending','completed','failed','refunded'];
        if (!in_array($status, $valid, true)) { Response::error('Statut invalide.'); return; }
        Database::execute('UPDATE payments SET status = ? WHERE id = ?', [$status, $params['id']]);
        Response::ok([], 'Statut mis à jour.');
    }

    // ── Categories ────────────────────────────────────────────────
    public function listCategories(): void {
        Auth::requireRole('admin');
        Response::ok(Database::query('SELECT * FROM categories ORDER BY sort_order'));
    }

    public function createCategory(): void {
        Auth::requireRole('admin');
        $body  = Router::body();
        $label = trim($body['label'] ?? '');  $slug = trim($body['slug'] ?? '');
        if (!$label || !$slug) { Response::error('Label et slug requis.'); return; }
        $id = Router::uuid();
        Database::execute(
            'INSERT INTO categories (id, slug, label, icon, color, sort_order) VALUES (?,?,?,?,?,?)',
            [$id, $slug, $label, $body['icon'] ?? null, $body['color'] ?? '#6366f1', (int)($body['sort_order'] ?? 0)]
        );
        Response::created(['id' => $id], 'Catégorie créée.');
    }

    public function updateCategory(array $params): void {
        Auth::requireRole('admin');
        $body    = Router::body();
        $allowed = ['label','slug','icon','color','sort_order'];
        $fields  = []; $values = [];
        foreach ($allowed as $key) {
            if (isset($body[$key])) { $fields[] = "$key = ?"; $values[] = $body[$key]; }
        }
        if (!$fields) { Response::error('Aucune modification.'); return; }
        $values[] = $params['id'];
        Database::execute('UPDATE categories SET ' . implode(', ', $fields) . ' WHERE id = ?', $values);
        Response::ok([], 'Catégorie mise à jour.');
    }

    public function deleteCategory(array $params): void {
        Auth::requireRole('admin');
        Database::execute('DELETE FROM categories WHERE id = ?', [$params['id']]);
        Response::ok([], 'Catégorie supprimée.');
    }

    public function scanLogs(): void {
        Auth::requireRole('admin');
        [$page, $limit, $offset] = Router::pagination();
        $total = (int) Database::queryOne('SELECT COUNT(*) AS n FROM scan_logs')['n'];
        $rows  = Database::query(
            "SELECT sl.*, t.ticket_number, e.title AS event_title, u.name AS scanner
             FROM scan_logs sl
             LEFT JOIN tickets t ON sl.ticket_id = t.id
             LEFT JOIN events e ON sl.event_id = e.id
             LEFT JOIN users u ON sl.scanned_by = u.id
             ORDER BY sl.scanned_at DESC LIMIT ? OFFSET ?",
            [$limit, $offset]
        );
        Response::paginated($rows, $total, $page, $limit);
    }

    private function splitDt(string $dt): array {
        if (!$dt) return [null, null];
        if (strpos($dt, 'T') !== false) return explode('T', $dt, 2);
        return [$dt, null];
    }
}
