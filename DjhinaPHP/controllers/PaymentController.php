<?php
class PaymentController {

    public function history(): void {
        $user = Auth::require();
        [$page, $limit, $offset] = Router::pagination();

        $total = (int) Database::queryOne(
            'SELECT COUNT(*) AS n FROM payments WHERE user_id = ?', [$user['id']]
        )['n'];

        $rows = Database::query(
            "SELECT p.*, e.title AS event_title, e.cover_image AS event_cover,
                    tt.name AS ticket_type_name
             FROM payments p
             JOIN events e ON p.event_id = e.id
             JOIN ticket_types tt ON p.ticket_type_id = tt.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?",
            [$user['id'], $limit, $offset]
        );

        foreach ($rows as &$r) {
            $r['event_cover']       = $r['event_cover'] ? APP_URL . $r['event_cover'] : null;
            $r['provider_label']    = $this->providerLabel($r['provider']);
            $r['status_label']      = $this->statusLabel($r['status']);
        }

        Response::paginated($rows, $total, $page, $limit);
    }

    public function getPayment(array $params): void {
        $user    = Auth::require();
        $payment = Database::queryOne(
            "SELECT p.*, e.title AS event_title, tt.name AS ticket_type_name
             FROM payments p
             JOIN events e ON p.event_id = e.id
             JOIN ticket_types tt ON p.ticket_type_id = tt.id
             WHERE p.id = ? AND p.user_id = ?",
            [$params['id'], $user['id']]
        );
        if (!$payment) { Response::notFound('Paiement introuvable.'); return; }
        $payment['provider_label'] = $this->providerLabel($payment['provider']);
        $payment['status_label']   = $this->statusLabel($payment['status']);
        $payment['instructions']   = $this->getInstructions($payment['provider'], $payment['total'], $payment['phone'] ?? '');
        Response::ok($payment);
    }

    public function initiate(): void {
        $user = Auth::require();
        $body = Router::body();

        $eventId      = $body['event_id']      ?? '';
        $ticketTypeId = $body['ticket_type_id'] ?? '';
        $quantity     = max(1, (int)($body['quantity'] ?? 1));
        $provider     = $body['provider']      ?? 'cash';
        $phone        = $body['phone']         ?? '';

        if (!$eventId || !$ticketTypeId) {
            Response::error('event_id et ticket_type_id sont requis.'); return;
        }

        $tt = Database::queryOne(
            'SELECT id, price, currency FROM ticket_types WHERE id = ? AND event_id = ? AND is_active = 1',
            [$ticketTypeId, $eventId]
        );
        if (!$tt) { Response::notFound('Type de billet introuvable.'); return; }

        $payId = Router::uuid();
        $total = $tt['price'] * $quantity;
        Database::execute(
            'INSERT INTO payments (id, user_id, event_id, ticket_type_id, quantity, unit_price, total, currency, provider, phone, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [$payId, $user['id'], $eventId, $ticketTypeId, $quantity, $tt['price'], $total, $tt['currency'] ?? 'XAF', $provider, $phone, 'pending']
        );

        Response::created([
            'payment_id'   => $payId,
            'total'        => $total,
            'currency'     => $tt['currency'] ?? 'XAF',
            'provider'     => $provider,
            'instructions' => $this->getInstructions($provider, $total, $phone),
        ], 'Paiement initié. Suivez les instructions.');
    }

    public function confirm(array $params): void {
        $user    = Auth::require();
        $payment = Database::queryOne(
            "SELECT * FROM payments WHERE id = ? AND user_id = ? AND status = 'pending'",
            [$params['id'], $user['id']]
        );
        if (!$payment) { Response::notFound('Paiement introuvable ou déjà traité.'); return; }

        Database::execute(
            "UPDATE payments SET status = 'completed', paid_at = NOW() WHERE id = ?",
            [$params['id']]
        );
        Response::ok([], 'Paiement confirmé.');
    }

    public function cancel(array $params): void {
        $user    = Auth::require();
        $payment = Database::queryOne(
            "SELECT * FROM payments WHERE id = ? AND user_id = ? AND status = 'pending'",
            [$params['id'], $user['id']]
        );
        if (!$payment) { Response::notFound('Paiement introuvable.'); return; }

        Database::execute(
            "UPDATE payments SET status = 'failed' WHERE id = ?", [$params['id']]
        );
        Response::ok([], 'Paiement annulé.');
    }

    private function providerLabel(string $p): string {
        return ['airtel_money' => 'Airtel Money', 'moov_tchad' => 'Moov Tchad', 'cash' => 'Espèces', 'free' => 'Gratuit'][$p] ?? $p;
    }
    private function statusLabel(string $s): string {
        return ['pending' => 'En attente', 'completed' => 'Confirmé', 'failed' => 'Échoué', 'refunded' => 'Remboursé'][$s] ?? $s;
    }
    private function getInstructions(string $provider, float $total, string $phone): array {
        $fmt = number_format($total, 0, ',', ' ');
        $map = [
            'airtel_money' => ['steps' => ["Composez *111#", "Selectionnez Paiement", "Entrez le numero marchand : 77000001", "Montant : {$fmt} XAF", "Confirmez avec votre PIN Airtel Money"]],
            'moov_tchad'   => ['steps' => ["Composez *155#", "Selectionnez Paiement Marchand", "Numero marchand : 66000001", "Montant : {$fmt} XAF", "Validez avec votre code secret Flooz"]],
            'cash'         => ['steps' => ["Rendez-vous au guichet Djhina", "Reference de paiement : a communiquer au caissier", "Montant a regler : {$fmt} XAF"]],
        ];
        return isset($map[$provider]) ? $map[$provider] : ['steps' => ["Billet gratuit - aucun paiement requis."]];
    }
}
