<?php
class TicketController {

    public function purchase(): void {
        $user = Auth::require();
        $body = Router::body();

        $eventId      = $body['event_id']       ?? '';
        $ticketTypeId = $body['ticket_type_id']  ?? '';
        $quantity     = max(1, (int)($body['quantity'] ?? 1));
        $holderName   = $body['holder_name']  ?? $user['name'];
        $holderEmail  = $body['holder_email'] ?? '';
        $holderPhone  = $body['holder_phone'] ?? '';
        $provider     = $body['provider']     ?? 'free';

        if (!$eventId || !$ticketTypeId) {
            Response::error('event_id et ticket_type_id sont requis.'); return;
        }

        $event = Database::queryOne(
            "SELECT id, title, date, time, location, capacity, registered FROM events WHERE id = ? AND status = 'published'",
            [$eventId]
        );
        if (!$event) { Response::notFound('Événement introuvable.'); return; }

        $tt = Database::queryOne(
            'SELECT id, name, price, currency, available, sold FROM ticket_types WHERE id = ? AND event_id = ? AND is_active = 1',
            [$ticketTypeId, $eventId]
        );
        if (!$tt) { Response::notFound('Type de billet introuvable.'); return; }

        if ($tt['available'] > 0 && ($tt['sold'] + $quantity) > $tt['available']) {
            Response::error('Places insuffisantes disponibles.', 409); return;
        }
        if ($event['capacity'] > 0 && ($event['registered'] + $quantity) > $event['capacity']) {
            Response::error('Capacité maximale de l\'événement atteinte.', 409); return;
        }

        Database::beginTransaction();
        try {
            // Créer le paiement
            $payId  = Router::uuid();
            $total  = $tt['price'] * $quantity;
            Database::execute(
                'INSERT INTO payments (id, user_id, event_id, ticket_type_id, quantity, unit_price, total, currency, provider, status)
                 VALUES (?,?,?,?,?,?,?,?,?,?)',
                [$payId, $user['id'], $eventId, $ticketTypeId, $quantity, $tt['price'], $total, $tt['currency'] ?? 'XAF', $provider, 'completed']
            );

            $tickets = [];
            for ($i = 0; $i < $quantity; $i++) {
                $ticketId  = Router::uuid();
                $number    = strtoupper(substr(md5($ticketId), 0, 8));
                $qrData    = json_encode(['ticket' => $number, 'event' => $eventId, 'ts' => time()]);
                $qrImage   = QRCode::generate($qrData);

                Database::execute(
                    'INSERT INTO tickets (id, ticket_number, payment_id, event_id, ticket_type_id, user_id,
                     holder_name, holder_email, holder_phone, qr_data, qr_image, price_paid, currency, status)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [$ticketId, $number, $payId, $eventId, $ticketTypeId, $user['id'],
                     $holderName, $holderEmail, $holderPhone, $qrData, $qrImage,
                     $tt['price'], $tt['currency'] ?? 'XAF', 'valid']
                );
                $tickets[] = ['id' => $ticketId, 'ticket_number' => $number, 'qr_image' => $qrImage];
            }

            // Mettre à jour les compteurs
            Database::execute(
                'UPDATE ticket_types SET sold = sold + ? WHERE id = ?', [$quantity, $ticketTypeId]
            );
            Database::execute(
                'UPDATE events SET registered = registered + ? WHERE id = ?', [$quantity, $eventId]
            );

            Database::commit();

            // Notification
            $this->notify($user['id'], 'ticket_purchased', 'Billet confirmé !',
                "Votre billet pour \"{$event['title']}\" est prêt.",
                ['event_id' => $eventId, 'payment_id' => $payId]
            );

            Response::created([
                'payment_id' => $payId,
                'tickets'    => $tickets,
                'event'      => ['id' => $eventId, 'title' => $event['title']],
            ], 'Billet(s) émis avec succès.');

        } catch (Exception $e) {
            Database::rollback();
            Response::error('Erreur lors de l\'émission du billet.', 500);
        }
    }

    public function myTickets(): void {
        $user = Auth::require();
        $rows = Database::query(
            "SELECT t.*, e.title AS event_title, e.date AS event_date, e.time AS event_time,
                    e.location AS event_location, e.city AS event_city, e.cover_image AS event_cover,
                    tt.name AS ticket_type_name, tt.color AS ticket_type_color
             FROM tickets t
             JOIN events e ON t.event_id = e.id
             JOIN ticket_types tt ON t.ticket_type_id = tt.id
             WHERE t.user_id = ?
             ORDER BY t.created_at DESC",
            [$user['id']]
        );
        foreach ($rows as &$r) {
            $r['event_cover'] = $r['event_cover'] ? APP_URL . $r['event_cover'] : null;
        }
        Response::ok($rows);
    }

    public function getTicket(array $params): void {
        $user   = Auth::require();
        $ticket = Database::queryOne(
            "SELECT t.*, e.title AS event_title, e.date AS event_date, e.time AS event_time,
                    e.location AS event_location, e.city AS event_city, e.cover_image AS event_cover,
                    tt.name AS ticket_type_name
             FROM tickets t
             JOIN events e ON t.event_id = e.id
             JOIN ticket_types tt ON t.ticket_type_id = tt.id
             WHERE t.id = ? AND t.user_id = ?",
            [$params['id'], $user['id']]
        );
        if (!$ticket) { Response::notFound('Billet introuvable.'); return; }
        $ticket['event_cover'] = $ticket['event_cover'] ? APP_URL . $ticket['event_cover'] : null;
        Response::ok($ticket);
    }

    public function viewTicket(array $params): void {
        $ticket = Database::queryOne(
            "SELECT t.*, e.title AS event_title, e.date AS event_date, e.time AS event_time,
                    e.location AS event_location, e.city AS event_city, e.cover_image AS event_cover,
                    tt.name AS ticket_type_name, tt.color AS ticket_type_color,
                    u.name AS holder_display
             FROM tickets t
             JOIN events e ON t.event_id = e.id
             JOIN ticket_types tt ON t.ticket_type_id = tt.id
             JOIN users u ON t.user_id = u.id
             WHERE t.ticket_number = ?",
            [$params['number']]
        );
        if (!$ticket) { http_response_code(404); echo 'Billet introuvable.'; return; }

        $color    = $ticket['ticket_type_color'] ?: '#6366f1';
        $cover    = $ticket['event_cover'] ? APP_URL . $ticket['event_cover'] : '';
        $status   = $ticket['status'] === 'used' ? 'UTILISÉ' : ($ticket['status'] === 'cancelled' ? 'ANNULÉ' : 'VALIDE');
        $statusCl = $ticket['status'] === 'valid' ? '#10b981' : '#ef4444';

        header('Content-Type: text/html; charset=utf-8');
        echo "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width,initial-scale=1'>
        <title>Billet — {$ticket['event_title']}</title>
        <style>
          body{margin:0;font-family:system-ui,sans-serif;background:#0a0a12;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:1rem}
          .card{background:#1a1a2e;border-radius:20px;overflow:hidden;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)}
          .cover{height:180px;background:linear-gradient(135deg,{$color},#1a1a2e);position:relative}
          .cover img{width:100%;height:100%;object-fit:cover;opacity:.7}
          .badge{position:absolute;top:12px;right:12px;background:{$statusCl};color:#fff;padding:.3rem .8rem;border-radius:99px;font-size:.75rem;font-weight:700}
          .body{padding:1.5rem}
          h2{margin:0 0 .3rem;font-size:1.2rem}
          .meta{font-size:.82rem;color:#aaa;margin-bottom:1.2rem}
          .meta div{margin:.2rem 0}
          .qr{text-align:center;margin:1rem 0}
          .qr img{width:180px;height:180px;border-radius:12px;background:#fff;padding:8px}
          .number{text-align:center;font-size:.85rem;letter-spacing:3px;color:#888;margin-top:.5rem}
          .divider{border:none;border-top:1px dashed #333;margin:1.2rem 0}
          .footer{display:flex;justify-content:space-between;font-size:.75rem;color:#666}
        </style></head><body>
        <div class='card'>
          <div class='cover'>
            " . ($cover ? "<img src='{$cover}' alt=''>" : '') . "
            <span class='badge'>{$status}</span>
          </div>
          <div class='body'>
            <h2>{$ticket['event_title']}</h2>
            <div class='meta'>
              <div>📅 {$ticket['event_date']} à {$ticket['event_time']}</div>
              <div>📍 {$ticket['event_location']}, {$ticket['event_city']}</div>
              <div>🎫 {$ticket['ticket_type_name']}</div>
              <div>👤 {$ticket['holder_name']}</div>
            </div>
            <div class='qr'><img src='{$ticket['qr_image']}' alt='QR Code'></div>
            <div class='number'>{$ticket['ticket_number']}</div>
            <hr class='divider'>
            <div class='footer'><span>Djhina</span><span>© " . date('Y') . "</span></div>
          </div>
        </div></body></html>";
    }

    public function verify(): void {
        $user = Auth::requireRole('organizer', 'admin');
        $body = Router::body();
        $qr   = $body['qr_data'] ?? $body['ticket_number'] ?? '';
        if (!$qr) { Response::error('QR data requis.'); return; }

        // Essayer de parser le JSON du QR
        $number = $qr;
        $decoded = json_decode($qr, true);
        if ($decoded && isset($decoded['ticket'])) $number = $decoded['ticket'];

        $ticket = Database::queryOne(
            "SELECT t.*, e.title AS event_title, e.id AS eid,
                    tt.name AS ticket_type_name, u.name AS holder
             FROM tickets t
             JOIN events e ON t.event_id = e.id
             JOIN ticket_types tt ON t.ticket_type_id = tt.id
             JOIN users u ON t.user_id = u.id
             WHERE t.ticket_number = ?",
            [$number]
        );
        if (!$ticket) {
            $this->logScan(null, $user['id'], null, 'invalid', $qr);
            Response::error('Billet introuvable.', 404); return;
        }

        if ($ticket['status'] === 'used') {
            $this->logScan($ticket['id'], $user['id'], $ticket['eid'], 'already_used', $qr);
            Response::error('Ce billet a déjà été utilisé.', 409); return;
        }
        if ($ticket['status'] === 'cancelled') {
            $this->logScan($ticket['id'], $user['id'], $ticket['eid'], 'cancelled', $qr);
            Response::error('Ce billet est annulé.', 409); return;
        }

        Database::execute(
            "UPDATE tickets SET status = 'used', used_at = NOW(), used_by = ? WHERE id = ?",
            [$user['id'], $ticket['id']]
        );
        $this->logScan($ticket['id'], $user['id'], $ticket['eid'], 'success', $qr);

        Response::ok([
            'ticket_number'    => $ticket['ticket_number'],
            'event'            => $ticket['event_title'],
            'holder'           => $ticket['holder'],
            'ticket_type'      => $ticket['ticket_type_name'],
        ], 'Billet validé ✓');
    }

    private function logScan(?string $ticketId, string $scannedBy, ?string $eventId, string $result, string $raw): void {
        Database::execute(
            'INSERT INTO scan_logs (id, ticket_id, scanned_by, event_id, result, raw_qr, ip_address) VALUES (?,?,?,?,?,?,?)',
            [Router::uuid(), $ticketId, $scannedBy, $eventId, $result, $raw, $_SERVER['REMOTE_ADDR'] ?? '']
        );
    }

    private function notify(string $userId, string $type, string $title, string $message, array $data = []): void {
        Database::execute(
            'INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?,?,?,?,?,?)',
            [Router::uuid(), $userId, $type, $title, $message, json_encode($data)]
        );
    }
}
