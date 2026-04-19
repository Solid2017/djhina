<?php
class SpeakerController {

    public function listSpeakers(): void {
        Auth::requireRole('admin');
        [$page, $limit, $offset] = Router::pagination();
        $where = ['1=1']; $params = [];
        if (!empty($_GET['search'])) { $where[] = '(name LIKE ? OR job_title LIKE ? OR company LIKE ?)'; $s='%'.$_GET['search'].'%'; $params=array_merge($params,[$s,$s,$s]); }
        $wCl   = implode(' AND ', $where);
        $total = (int) Database::queryOne("SELECT COUNT(*) AS n FROM speakers WHERE $wCl", $params)['n'];
        $params[] = $limit; $params[] = $offset;
        $rows  = Database::query("SELECT id, name, job_title, company, email, phone, photo, created_at FROM speakers WHERE $wCl ORDER BY name LIMIT ? OFFSET ?", $params);
        foreach ($rows as &$r) { $r['photo'] = $r['photo'] ? APP_URL . $r['photo'] : null; }
        Response::paginated($rows, $total, $page, $limit);
    }

    public function createSpeaker(): void {
        Auth::requireRole('admin');
        $body = Router::body();
        $name = trim($body['name'] ?? '');
        if (!$name) { Response::error('Nom requis.'); return; }

        $photo  = Upload::image('photo', 'speakers');
        $orgId  = $body['organizer_id'] ?? null;
        $id     = Router::uuid();
        Database::execute(
            'INSERT INTO speakers (id, organizer_id, name, job_title, company, email, phone, bio, photo) VALUES (?,?,?,?,?,?,?,?,?)',
            [$id, $orgId, $name, $body['job_title'] ?? null, $body['company'] ?? null,
             $body['email'] ?? null, $body['phone'] ?? null, $body['bio'] ?? null, $photo]
        );
        Response::created(['id' => $id], 'Intervenant créé.');
    }

    public function getSpeaker(array $params): void {
        Auth::requireRole('admin');
        $sp = Database::queryOne('SELECT id, name, job_title, company, email, phone, bio, photo FROM speakers WHERE id = ?', [$params['id']]);
        if (!$sp) { Response::notFound(); return; }
        $sp['photo'] = $sp['photo'] ? APP_URL . $sp['photo'] : null;
        Response::ok($sp);
    }

    public function updateSpeaker(array $params): void {
        Auth::requireRole('admin');
        $body    = Router::body();
        $allowed = ['name','job_title','company','email','phone','bio'];
        $fields  = []; $values = [];
        foreach ($allowed as $k) { if (isset($body[$k])) { $fields[] = "$k = ?"; $values[] = $body[$k]; } }
        $photo = Upload::image('photo', 'speakers');
        if ($photo) { $fields[] = 'photo = ?'; $values[] = $photo; }
        if (!$fields) { Response::error('Aucune modification.'); return; }
        $values[] = $params['id'];
        Database::execute('UPDATE speakers SET ' . implode(', ', $fields) . ' WHERE id = ?', $values);
        Response::ok([], 'Intervenant mis à jour.');
    }

    public function deleteSpeaker(array $params): void {
        Auth::requireRole('admin');
        Database::execute('DELETE FROM speakers WHERE id = ?', [$params['id']]);
        Response::ok([], 'Intervenant supprimé.');
    }

    public function listMessages(): void {
        Auth::requireRole('admin');
        [$page, $limit, $offset] = Router::pagination();
        $total = (int) Database::queryOne('SELECT COUNT(*) AS n FROM speaker_messages')['n'];
        $rows  = Database::query(
            "SELECT sm.id, sm.message, sm.reply, sm.is_read, sm.created_at,
                    u.name AS user_name, u.email AS user_email,
                    s.name AS speaker_name
             FROM speaker_messages sm
             JOIN users u ON sm.user_id = u.id
             JOIN speakers s ON sm.speaker_id = s.id
             ORDER BY sm.created_at DESC LIMIT ? OFFSET ?",
            [$limit, $offset]
        );
        Response::paginated($rows, $total, $page, $limit);
    }

    public function replyMessage(array $params): void {
        Auth::requireRole('admin');
        $reply = trim(Router::body()['reply'] ?? '');
        if (!$reply) { Response::error('Réponse requise.'); return; }
        Database::execute('UPDATE speaker_messages SET reply = ?, is_read = 1 WHERE id = ?', [$reply, $params['id']]);
        Response::ok([], 'Réponse envoyée.');
    }
}
