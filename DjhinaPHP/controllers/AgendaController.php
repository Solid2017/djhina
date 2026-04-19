<?php
class AgendaController {

    public function getEventAgenda(array $params): void {
        $user = Auth::optional();
        $sessions = Database::query(
            "SELECT s.id, s.title, s.description, s.type, s.start_time, s.end_time, s.room,
                    GROUP_CONCAT(JSON_OBJECT('id', sp.id, 'name', sp.name, 'job_title', sp.job_title, 'photo', sp.photo)) AS speakers_json
             FROM sessions s
             LEFT JOIN session_speakers ss ON s.id = ss.session_id
             LEFT JOIN speakers sp ON ss.speaker_id = sp.id
             WHERE s.event_id = ?
             GROUP BY s.id ORDER BY s.start_time",
            [$params['eventId']]
        );

        foreach ($sessions as &$s) {
            $spList = [];
            if ($s['speakers_json']) {
                // Decoder les speakers concaténés
                $raw = '[' . $s['speakers_json'] . ']';
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    foreach ($decoded as $sp) {
                        if ($sp['id'] ?? null) {
                            $sp['photo'] = $sp['photo'] ? APP_URL . $sp['photo'] : null;
                            $spList[] = $sp;
                        }
                    }
                    // Dédoublonner
                    $unique = []; $ids = [];
                    foreach ($spList as $sp) {
                        if (!in_array($sp['id'], $ids, true)) { $unique[] = $sp; $ids[] = $sp['id']; }
                    }
                    $spList = $unique;
                }
            }
            $s['speakers'] = $spList;
            unset($s['speakers_json']);

            if ($user) {
                $s['is_booked'] = (bool) Database::queryOne(
                    'SELECT 1 FROM session_bookings WHERE session_id = ? AND user_id = ?',
                    [$s['id'], $user['id']]
                );
            }
        }
        Response::ok(['sessions' => $sessions]);
    }

    public function bookSession(array $params): void {
        $user = Auth::require();
        $sid  = $params['id'];

        if (Database::queryOne('SELECT 1 FROM session_bookings WHERE session_id = ? AND user_id = ?', [$sid, $user['id']])) {
            Response::error('Vous êtes déjà inscrit à cette session.', 409); return;
        }
        Database::execute(
            'INSERT INTO session_bookings (id, session_id, user_id) VALUES (?,?,?)',
            [Router::uuid(), $sid, $user['id']]
        );
        Response::created([], 'Inscription confirmée.');
    }

    public function cancelBooking(array $params): void {
        $user = Auth::require();
        Database::execute('DELETE FROM session_bookings WHERE session_id = ? AND user_id = ?', [$params['id'], $user['id']]);
        Response::ok([], 'Inscription annulée.');
    }

    public function getSpeakerProfile(array $params): void {
        $sp = Database::queryOne(
            'SELECT id, name, job_title, company, bio, photo, email FROM speakers WHERE id = ?',
            [$params['id']]
        );
        if (!$sp) { Response::notFound(); return; }
        $sp['photo'] = $sp['photo'] ? APP_URL . $sp['photo'] : null;
        Response::ok($sp);
    }

    public function sendMessage(array $params): void {
        $user = Auth::require();
        $body = Router::body();
        $msg  = trim($body['message'] ?? '');
        if (!$msg) { Response::error('Message requis.'); return; }

        Database::execute(
            'INSERT INTO speaker_messages (id, speaker_id, user_id, message) VALUES (?,?,?,?)',
            [Router::uuid(), $params['id'], $user['id'], $msg]
        );
        Response::created([], 'Message envoyé.');
    }

    public function getMessages(array $params): void {
        $user = Auth::require();
        $msgs = Database::query(
            'SELECT id, message, reply, is_read, created_at FROM speaker_messages WHERE speaker_id = ? AND user_id = ? ORDER BY created_at',
            [$params['id'], $user['id']]
        );
        Response::ok($msgs);
    }

    // Admin sessions
    public function listSessions(array $params): void {
        Auth::requireRole('admin');
        $rows = Database::query(
            'SELECT s.*, COUNT(sb.id) AS bookings_count FROM sessions s LEFT JOIN session_bookings sb ON s.id = sb.session_id WHERE s.event_id = ? GROUP BY s.id ORDER BY s.start_time',
            [$params['id']]
        );
        Response::ok($rows);
    }

    public function createSession(array $params): void {
        Auth::requireRole('admin');
        $body  = Router::body();
        $title = trim($body['title'] ?? '');
        if (!$title) { Response::error('Titre requis.'); return; }
        $id = Router::uuid();
        Database::execute(
            'INSERT INTO sessions (id, event_id, title, description, type, start_time, end_time, room) VALUES (?,?,?,?,?,?,?,?)',
            [$id, $params['id'], $title, $body['description'] ?? null, $body['type'] ?? 'conference',
             $body['start_time'] ?? null, $body['end_time'] ?? null, $body['room'] ?? null]
        );
        Response::created(['id' => $id], 'Session créée.');
    }

    public function getSession(array $params): void {
        Auth::requireRole('admin');
        $s = Database::queryOne('SELECT * FROM sessions WHERE id = ?', [$params['id']]);
        if (!$s) { Response::notFound(); return; }
        $s['speakers'] = Database::query(
            "SELECT sp.id, sp.name, sp.job_title, sp.photo FROM speakers sp JOIN session_speakers ss ON sp.id = ss.speaker_id WHERE ss.session_id = ?",
            [$params['id']]
        );
        Response::ok($s);
    }

    public function updateSession(array $params): void {
        Auth::requireRole('admin');
        $body    = Router::body();
        $allowed = ['title','description','type','start_time','end_time','room'];
        $fields  = []; $values = [];
        foreach ($allowed as $k) { if (isset($body[$k])) { $fields[] = "$k = ?"; $values[] = $body[$k]; } }
        if (!$fields) { Response::error('Aucune modification.'); return; }
        $values[] = $params['id'];
        Database::execute('UPDATE sessions SET ' . implode(', ', $fields) . ' WHERE id = ?', $values);
        Response::ok([], 'Session mise à jour.');
    }

    public function deleteSession(array $params): void {
        Auth::requireRole('admin');
        Database::execute('DELETE FROM sessions WHERE id = ?', [$params['id']]);
        Response::ok([], 'Session supprimée.');
    }

    public function setSpeakers(array $params): void {
        Auth::requireRole('admin');
        $ids = Router::body()['speaker_ids'] ?? [];
        Database::execute('DELETE FROM session_speakers WHERE session_id = ?', [$params['id']]);
        foreach ($ids as $sid) {
            Database::execute('INSERT IGNORE INTO session_speakers (session_id, speaker_id) VALUES (?,?)', [$params['id'], $sid]);
        }
        Response::ok([], 'Intervenants assignés.');
    }

    public function listBookings(array $params): void {
        Auth::requireRole('admin');
        $rows = Database::query(
            "SELECT sb.created_at, u.id AS user_id, u.name, u.email FROM session_bookings sb JOIN users u ON sb.user_id = u.id WHERE sb.session_id = ?",
            [$params['id']]
        );
        Response::ok($rows);
    }
}
