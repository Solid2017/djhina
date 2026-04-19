<?php
class OrganizerController {

    public function dashboard(): void {
        $user = Auth::requireRole('organizer', 'admin');
        $uid  = $user['id'];

        $stats = [
            'totalEvents'  => (int) Database::queryOne('SELECT COUNT(*) AS n FROM events WHERE organizer_id = ?', [$uid])['n'],
            'totalTickets' => (int) Database::queryOne(
                "SELECT COALESCE(SUM(t.quantity),0) AS n FROM payments t
                 JOIN events e ON t.event_id = e.id WHERE e.organizer_id = ? AND t.status = 'completed'", [$uid])['n'],
            'totalRevenue' => (float) Database::queryOne(
                "SELECT COALESCE(SUM(t.total),0) AS n FROM payments t
                 JOIN events e ON t.event_id = e.id WHERE e.organizer_id = ? AND t.status = 'completed'", [$uid])['n'],
            'totalScans'   => (int) Database::queryOne(
                "SELECT COUNT(*) AS n FROM scan_logs sl
                 JOIN events e ON sl.event_id = e.id WHERE e.organizer_id = ? AND sl.result = 'success'", [$uid])['n'],
        ];
        Response::ok($stats);
    }

    public function myEvents(): void {
        $user = Auth::requireRole('organizer', 'admin');
        [$page, $limit, $offset] = Router::pagination();

        $total = (int) Database::queryOne('SELECT COUNT(*) AS n FROM events WHERE organizer_id = ?', [$user['id']])['n'];
        $rows  = Database::query(
            "SELECT e.id, e.title, e.date, e.time, e.location, e.city, e.cover_image,
                    e.status, e.registered, e.capacity, e.created_at,
                    c.label AS category_label
             FROM events e
             LEFT JOIN categories c ON e.category_id = c.id
             WHERE e.organizer_id = ?
             ORDER BY e.created_at DESC LIMIT ? OFFSET ?",
            [$user['id'], $limit, $offset]
        );
        foreach ($rows as &$r) {
            $r['cover_image'] = $r['cover_image'] ? APP_URL . $r['cover_image'] : null;
        }
        Response::paginated($rows, $total, $page, $limit);
    }

    public function getEvent(array $params): void {
        $user  = Auth::requireRole('organizer', 'admin');
        $event = Database::queryOne(
            "SELECT e.*, c.label AS category_label FROM events e
             LEFT JOIN categories c ON e.category_id = c.id
             WHERE e.id = ? AND e.organizer_id = ?",
            [$params['id'], $user['id']]
        );
        if (!$event) { Response::notFound('Événement introuvable.'); return; }
        $event['cover_image'] = $event['cover_image'] ? APP_URL . $event['cover_image'] : null;
        $event['video_url']   = $event['video_url']   ? APP_URL . $event['video_url']   : null;
        Response::ok($event);
    }

    public function createEvent(): void {
        $user = Auth::requireRole('organizer', 'admin');
        $body = Router::body();

        $title    = trim($body['title']    ?? '');
        $date     = $body['date']          ?? '';
        $location = trim($body['location'] ?? '');
        if (!$title || !$date || !$location) {
            Response::error('Titre, date et lieu sont requis.'); return;
        }

        $cover = Upload::image('cover', 'events');
        $video = Upload::video('video');
        $id    = Router::uuid();

        [$eventDate, $eventTime] = $this->splitDatetime($date);
        [, $endTime] = $this->splitDatetime($body['end_time'] ?? '');

        Database::execute(
            'INSERT INTO events (id, organizer_id, category_id, title, subtitle, description,
             cover_image, video_url, date, time, end_time, location, city, country, capacity, tags, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [$id, $user['id'], $body['category_id'] ?? null,
             $title, $body['subtitle'] ?? null, $body['description'] ?? null,
             $cover, $video, $eventDate, $eventTime, $endTime, $location,
             $body['city'] ?? "N'Djaména", $body['country'] ?? 'Tchad',
             (int)($body['capacity'] ?? 0),
             json_encode(is_array($body['tags'] ?? null) ? $body['tags'] : []), 'draft']
        );
        Response::created(['id' => $id], 'Événement créé en brouillon.');
    }

    public function updateEvent(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne('SELECT id FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound('Événement introuvable.'); return; }

        $body    = Router::body();
        $allowed = ['title','subtitle','description','category_id','date','time','end_time','location','city','country','capacity','tags'];
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

        if (!$fields) { Response::error('Aucune modification fournie.'); return; }
        $values[] = $params['id']; $values[] = $user['id'];
        Database::execute('UPDATE events SET ' . implode(', ', $fields) . ' WHERE id = ? AND organizer_id = ?', $values);
        Response::ok([], 'Événement mis à jour.');
    }

    public function deleteEvent(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne('SELECT id, status FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }
        if ($ev['status'] === 'published') {
            Response::error('Annulez l\'événement avant de le supprimer.'); return;
        }
        Database::execute('DELETE FROM events WHERE id = ?', [$params['id']]);
        Response::ok([], 'Événement supprimé.');
    }

    public function submitEvent(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne("SELECT id, status FROM events WHERE id = ? AND organizer_id = ?", [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }
        if ($ev['status'] !== 'draft') { Response::error('Seuls les brouillons peuvent être soumis.'); return; }
        Database::execute("UPDATE events SET status = 'pending_review' WHERE id = ?", [$params['id']]);
        Response::ok([], 'Événement soumis pour validation.');
    }

    public function setEventStatus(array $params): void {
        $user   = Auth::requireRole('organizer', 'admin');
        $status = Router::body()['status'] ?? '';
        $valid  = ['draft', 'pending_review', 'published', 'cancelled', 'completed'];
        if (!in_array($status, $valid, true)) { Response::error('Statut invalide.'); return; }
        Database::execute('UPDATE events SET status = ? WHERE id = ? AND organizer_id = ?', [$status, $params['id'], $user['id']]);
        Response::ok([], 'Statut mis à jour.');
    }

    public function updateTicketTypes(array $params): void {
        $user   = Auth::requireRole('organizer', 'admin');
        $ev     = Database::queryOne('SELECT id FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }

        $types  = Router::body()['ticket_types'] ?? [];
        foreach ($types as $tt) {
            if (!empty($tt['id'])) {
                Database::execute(
                    'UPDATE ticket_types SET name=?, price=?, available=?, is_active=? WHERE id=? AND event_id=?',
                    [$tt['name'], $tt['price'] ?? 0, $tt['available'] ?? 0, ($tt['is_active'] ?? 1) ? 1 : 0, $tt['id'], $params['id']]
                );
            } else {
                Database::execute(
                    'INSERT INTO ticket_types (id, event_id, name, price, currency, available) VALUES (?,?,?,?,?,?)',
                    [Router::uuid(), $params['id'], $tt['name'], $tt['price'] ?? 0, $tt['currency'] ?? 'XAF', $tt['available'] ?? 0]
                );
            }
        }
        Response::ok([], 'Types de billets mis à jour.');
    }

    public function eventTickets(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne('SELECT id FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }

        [$page, $limit, $offset] = Router::pagination();
        $total = (int) Database::queryOne('SELECT COUNT(*) AS n FROM tickets WHERE event_id = ?', [$params['id']])['n'];
        $rows  = Database::query(
            "SELECT t.id, t.ticket_number, t.holder_name, t.holder_email, t.status, t.price_paid, t.created_at,
                    tt.name AS ticket_type_name
             FROM tickets t JOIN ticket_types tt ON t.ticket_type_id = tt.id
             WHERE t.event_id = ? ORDER BY t.created_at DESC LIMIT ? OFFSET ?",
            [$params['id'], $limit, $offset]
        );
        Response::paginated($rows, $total, $page, $limit);
    }

    public function eventStats(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne('SELECT id, title, capacity, registered FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }

        $revenue = (float) Database::queryOne(
            "SELECT COALESCE(SUM(total),0) AS n FROM payments WHERE event_id = ? AND status = 'completed'", [$params['id']]
        )['n'];
        $scans = (int) Database::queryOne(
            "SELECT COUNT(*) AS n FROM scan_logs WHERE event_id = ? AND result = 'success'", [$params['id']]
        )['n'];
        $byType = Database::query(
            "SELECT tt.name, tt.price, tt.sold, tt.available FROM ticket_types tt WHERE tt.event_id = ?", [$params['id']]
        );

        Response::ok([
            'event'   => $ev,
            'revenue' => $revenue,
            'scans'   => $scans,
            'byType'  => $byType,
        ]);
    }

    public function eventScanLogs(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne('SELECT id FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }
        $logs = Database::query(
            "SELECT sl.result, sl.scanned_at, sl.ip_address,
                    t.ticket_number, u.name AS scanner_name
             FROM scan_logs sl
             LEFT JOIN tickets t ON sl.ticket_id = t.id
             LEFT JOIN users u ON sl.scanned_by = u.id
             WHERE sl.event_id = ? ORDER BY sl.scanned_at DESC LIMIT 200",
            [$params['id']]
        );
        Response::ok($logs);
    }

    public function notifyAttendees(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne('SELECT id, title FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }

        $body    = Router::body();
        $title   = $body['title']   ?? "Mise à jour : {$ev['title']}";
        $message = $body['message'] ?? '';
        if (!$message) { Response::error('Message requis.'); return; }

        $attendees = Database::query(
            "SELECT DISTINCT t.user_id FROM tickets t WHERE t.event_id = ? AND t.status = 'valid'", [$params['id']]
        );
        $count = 0;
        foreach ($attendees as $a) {
            Database::execute(
                'INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?,?,?,?,?,?)',
                [Router::uuid(), $a['user_id'], 'event_update', $title, $message, json_encode(['event_id' => $params['id']])]
            );
            $count++;
        }
        Response::ok(['notified' => $count], "Notification envoyée à $count participant(s).");
    }

    public function exportAttendees(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne('SELECT id, title FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }

        $rows = Database::query(
            "SELECT t.ticket_number, t.holder_name, t.holder_email, t.holder_phone,
                    tt.name AS ticket_type, t.price_paid, t.status, t.created_at
             FROM tickets t JOIN ticket_types tt ON t.ticket_type_id = tt.id
             WHERE t.event_id = ? ORDER BY t.created_at ASC",
            [$params['id']]
        );

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="attendees-' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM UTF-8
        fputcsv($out, ['N° Billet', 'Nom', 'Email', 'Téléphone', 'Type', 'Prix (XAF)', 'Statut', 'Date']);
        foreach ($rows as $r) {
            fputcsv($out, [$r['ticket_number'], $r['holder_name'], $r['holder_email'],
                $r['holder_phone'], $r['ticket_type'], $r['price_paid'], $r['status'], $r['created_at']]);
        }
        fclose($out);
        exit;
    }

    // ── Speakers ──────────────────────────────────────────────────
    public function listSpeakers(): void {
        $user = Auth::requireRole('organizer', 'admin');
        [$page, $limit, $offset] = Router::pagination();
        $total = (int) Database::queryOne('SELECT COUNT(*) AS n FROM speakers WHERE organizer_id = ?', [$user['id']])['n'];
        $rows  = Database::query(
            'SELECT id, name, job_title, company, email, phone, bio, photo FROM speakers WHERE organizer_id = ? ORDER BY name LIMIT ? OFFSET ?',
            [$user['id'], $limit, $offset]
        );
        foreach ($rows as &$r) { $r['photo'] = $r['photo'] ? APP_URL . $r['photo'] : null; }
        Response::paginated($rows, $total, $page, $limit);
    }

    public function createSpeaker(): void {
        $user = Auth::requireRole('organizer', 'admin');
        $body = Router::body();
        $name = trim($body['name'] ?? '');
        if (!$name) { Response::error('Le nom est requis.'); return; }

        $photo = Upload::image('photo', 'speakers');
        $id    = Router::uuid();
        Database::execute(
            'INSERT INTO speakers (id, organizer_id, name, job_title, company, email, phone, bio, photo) VALUES (?,?,?,?,?,?,?,?,?)',
            [$id, $user['id'], $name, $body['job_title'] ?? null, $body['company'] ?? null,
             $body['email'] ?? null, $body['phone'] ?? null, $body['bio'] ?? null, $photo]
        );
        Response::created(['id' => $id], 'Intervenant créé.');
    }

    public function updateSpeaker(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $sp   = Database::queryOne('SELECT id FROM speakers WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$sp) { Response::notFound(); return; }

        $body    = Router::body();
        $allowed = ['name', 'job_title', 'company', 'email', 'phone', 'bio'];
        $fields  = []; $values = [];
        foreach ($allowed as $key) {
            if (isset($body[$key])) { $fields[] = "$key = ?"; $values[] = $body[$key]; }
        }
        $photo = Upload::image('photo', 'speakers');
        if ($photo) { $fields[] = 'photo = ?'; $values[] = $photo; }
        if (!$fields) { Response::error('Aucune modification.'); return; }
        $values[] = $params['id']; $values[] = $user['id'];
        Database::execute('UPDATE speakers SET ' . implode(', ', $fields) . ' WHERE id = ? AND organizer_id = ?', $values);
        Response::ok([], 'Intervenant mis à jour.');
    }

    public function deleteSpeaker(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        Database::execute('DELETE FROM speakers WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        Response::ok([], 'Intervenant supprimé.');
    }

    public function listEventSpeakers(array $params): void {
        Auth::requireRole('organizer', 'admin');
        $rows = Database::query(
            "SELECT s.id, s.name, s.job_title, s.company, s.photo
             FROM speakers s
             JOIN session_speakers ss ON s.id = ss.speaker_id
             JOIN sessions se ON ss.session_id = se.id
             WHERE se.event_id = ?
             GROUP BY s.id",
            [$params['id']]
        );
        foreach ($rows as &$r) { $r['photo'] = $r['photo'] ? APP_URL . $r['photo'] : null; }
        Response::ok($rows);
    }

    // ── Sessions ──────────────────────────────────────────────────
    public function listSessions(array $params): void {
        Auth::requireRole('organizer', 'admin');
        $rows = Database::query(
            "SELECT s.*, GROUP_CONCAT(sp.name SEPARATOR ', ') AS speakers_names
             FROM sessions s
             LEFT JOIN session_speakers ss ON s.id = ss.session_id
             LEFT JOIN speakers sp ON ss.speaker_id = sp.id
             WHERE s.event_id = ?
             GROUP BY s.id ORDER BY s.start_time",
            [$params['id']]
        );
        Response::ok($rows);
    }

    public function createSession(array $params): void {
        $user = Auth::requireRole('organizer', 'admin');
        $ev   = Database::queryOne('SELECT id FROM events WHERE id = ? AND organizer_id = ?', [$params['id'], $user['id']]);
        if (!$ev) { Response::notFound(); return; }

        $body  = Router::body();
        $title = trim($body['title'] ?? '');
        if (!$title) { Response::error('Titre requis.'); return; }

        $id = Router::uuid();
        Database::execute(
            'INSERT INTO sessions (id, event_id, title, description, type, start_time, end_time, room) VALUES (?,?,?,?,?,?,?,?)',
            [$id, $params['id'], $title, $body['description'] ?? null, $body['type'] ?? 'conference',
             $body['start_time'] ?? null, $body['end_time'] ?? null, $body['room'] ?? null]
        );

        if (!empty($body['speaker_ids']) && is_array($body['speaker_ids'])) {
            foreach ($body['speaker_ids'] as $spId) {
                Database::execute('INSERT IGNORE INTO session_speakers (session_id, speaker_id) VALUES (?,?)', [$id, $spId]);
            }
        }
        Response::created(['id' => $id], 'Session créée.');
    }

    public function updateSession(array $params): void {
        Auth::requireRole('organizer', 'admin');
        $body    = Router::body();
        $allowed = ['title', 'description', 'type', 'start_time', 'end_time', 'room'];
        $fields  = []; $values = [];
        foreach ($allowed as $key) {
            if (isset($body[$key])) { $fields[] = "$key = ?"; $values[] = $body[$key]; }
        }
        if (!$fields) { Response::error('Aucune modification.'); return; }
        $values[] = $params['id'];
        Database::execute('UPDATE sessions SET ' . implode(', ', $fields) . ' WHERE id = ?', $values);
        Response::ok([], 'Session mise à jour.');
    }

    public function deleteSession(array $params): void {
        Auth::requireRole('organizer', 'admin');
        Database::execute('DELETE FROM sessions WHERE id = ?', [$params['id']]);
        Response::ok([], 'Session supprimée.');
    }

    // ── Tickets (all org events) ──────────────────────────────────
    public function allTickets(): void {
        $user = Auth::requireRole('organizer', 'admin');
        [$page, $limit, $offset] = Router::pagination();

        $total = (int) Database::queryOne(
            "SELECT COUNT(*) AS n FROM tickets t JOIN events e ON t.event_id = e.id WHERE e.organizer_id = ?", [$user['id']]
        )['n'];
        $rows  = Database::query(
            "SELECT t.id, t.ticket_number, t.holder_name, t.holder_email, t.status, t.price_paid, t.created_at,
                    e.title AS event_title, tt.name AS ticket_type_name
             FROM tickets t
             JOIN events e ON t.event_id = e.id
             JOIN ticket_types tt ON t.ticket_type_id = tt.id
             WHERE e.organizer_id = ?
             ORDER BY t.created_at DESC LIMIT ? OFFSET ?",
            [$user['id'], $limit, $offset]
        );
        Response::paginated($rows, $total, $page, $limit);
    }

    public function getTicket(array $params): void {
        $user   = Auth::requireRole('organizer', 'admin');
        $ticket = Database::queryOne(
            "SELECT t.*, e.title AS event_title, tt.name AS ticket_type_name
             FROM tickets t JOIN events e ON t.event_id = e.id JOIN ticket_types tt ON t.ticket_type_id = tt.id
             WHERE t.ticket_number = ? AND e.organizer_id = ?",
            [$params['number'], $user['id']]
        );
        if (!$ticket) { Response::notFound(); return; }
        Response::ok($ticket);
    }

    public function cancelTicket(array $params): void {
        $user   = Auth::requireRole('organizer', 'admin');
        $ticket = Database::queryOne(
            "SELECT t.id FROM tickets t JOIN events e ON t.event_id = e.id
             WHERE t.ticket_number = ? AND e.organizer_id = ?",
            [$params['number'], $user['id']]
        );
        if (!$ticket) { Response::notFound(); return; }
        Database::execute("UPDATE tickets SET status = 'cancelled' WHERE id = ?", [$ticket['id']]);
        Response::ok([], 'Billet annulé.');
    }

    public function notifications(): void {
        $user  = Auth::require();
        $rows  = Database::query(
            'SELECT id, type, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [$user['id']]
        );
        foreach ($rows as &$r) { $r['is_read'] = (bool)$r['is_read']; }
        Response::ok($rows);
    }

    public function markNotifRead(array $params): void {
        $user = Auth::require();
        Database::execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [$params['id'], $user['id']]);
        Response::ok();
    }

    public function listCategories(): void {
        Auth::require();
        $cats = Database::query('SELECT id, slug, label, icon, color FROM categories ORDER BY sort_order');
        Response::ok($cats);
    }

    private function splitDatetime(string $dt): array {
        if (!$dt) return [null, null];
        if (strpos($dt, 'T') !== false) return explode('T', $dt, 2);
        return [$dt, null];
    }
}
