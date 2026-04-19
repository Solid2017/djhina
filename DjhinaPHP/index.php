<?php
declare(strict_types=1);
error_reporting(APP_ENV === 'development' ? E_ALL : 0);
ini_set('display_errors', APP_ENV === 'development' ? '1' : '0');

// ── Autoload ──────────────────────────────────────────────────────
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/src/Database.php';
require_once __DIR__ . '/src/JWT.php';
require_once __DIR__ . '/src/Router.php';
require_once __DIR__ . '/src/Response.php';
require_once __DIR__ . '/src/Auth.php';
require_once __DIR__ . '/src/Upload.php';
require_once __DIR__ . '/src/QRCode.php';

// ── Controllers ───────────────────────────────────────────────────
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/EventController.php';
require_once __DIR__ . '/controllers/TicketController.php';
require_once __DIR__ . '/controllers/PaymentController.php';
require_once __DIR__ . '/controllers/CommentController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/PrivacyController.php';
require_once __DIR__ . '/controllers/OrganizerController.php';
require_once __DIR__ . '/controllers/AdminController.php';
require_once __DIR__ . '/controllers/SpeakerController.php';
require_once __DIR__ . '/controllers/AgendaController.php';

// ── CORS ──────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true) || APP_ENV === 'development') {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: ' . APP_URL);
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Global error handler ──────────────────────────────────────────
set_exception_handler(function (Throwable $e) {
    $msg = APP_ENV === 'development' ? $e->getMessage() . ' [' . $e->getFile() . ':' . $e->getLine() . ']' : 'Erreur interne du serveur.';
    Response::json(['success' => false, 'message' => $msg], 500);
});

// ── Rate limiting simple (par IP, en session fichier) ─────────────
// NOTE : sur LWS, utiliser APCu ou MySQL pour le rate limiting distribué
// Ici une implémentation légère basée sur fichiers temporaires
function checkRateLimit(string $key, int $max, int $window): bool {
    $file = sys_get_temp_dir() . '/rl_' . md5($key) . '.json';
    $now  = time();
    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : ['count' => 0, 'reset' => $now + $window];
    if ($now > $data['reset']) { $data = ['count' => 0, 'reset' => $now + $window]; }
    $data['count']++;
    file_put_contents($file, json_encode($data));
    return $data['count'] <= $max;
}

$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

// ── Routeur ───────────────────────────────────────────────────────
$router = new Router();
$auth   = new AuthController();
$events = new EventController();
$tickets = new TicketController();
$payments = new PaymentController();
$comments = new CommentController();
$notifs  = new NotificationController();
$privacy = new PrivacyController();
$org     = new OrganizerController();
$admin   = new AdminController();
$speaker = new SpeakerController();
$agenda  = new AgendaController();

// ── Ticket public (HTML) ──────────────────────────────────────────
$router->get('/tickets/:number/view', fn($p) => $tickets->viewTicket($p));

// ── Auth ──────────────────────────────────────────────────────────
$router->post('/api/auth/register', function() use ($auth, $ip) {
    if (!checkRateLimit("auth_$ip", 20, 900)) { Response::error('Trop de tentatives. Réessayez dans 15 minutes.', 429); return; }
    $auth->register();
});
$router->post('/api/auth/login', function() use ($auth, $ip) {
    if (!checkRateLimit("auth_$ip", 20, 900)) { Response::error('Trop de tentatives. Réessayez dans 15 minutes.', 429); return; }
    $auth->login();
});
$router->post('/api/auth/refresh',        fn() => $auth->refresh());
$router->post('/api/auth/logout',         fn() => $auth->logout());
$router->get ('/api/auth/me',             fn($p) => $auth->me($p, Auth::require()));
$router->put ('/api/auth/profile',        fn($p) => $auth->updateProfile($p, Auth::require()));
$router->put ('/api/auth/change-password',fn()   => $privacy->changePassword());

// ── Events (public) ───────────────────────────────────────────────
$router->get ('/api/events',              fn()   => $events->list());
$router->get ('/api/events/:id',          fn($p) => $events->getOne($p));
$router->post('/api/events/:id/like',     fn($p) => $events->like($p));
$router->post('/api/events/:id/save',     fn($p) => $events->save($p));

// ── Ticket types (nested sous events) ────────────────────────────
$router->get ('/api/events/:eventId/ticket-types',      fn($p) => Response::ok(Database::query('SELECT id,name,price,currency,available,sold,color,benefits,is_active FROM ticket_types WHERE event_id=? ORDER BY price', [$p['eventId']])));
$router->post('/api/events/:eventId/ticket-types',      fn($p) => (function($p) { Auth::requireRole('organizer','admin'); $b=Router::body(); if (!($b['name']??'')) {Response::error('Nom requis.');return;} $id=Router::uuid(); Database::execute('INSERT INTO ticket_types (id,event_id,name,price,currency,available) VALUES (?,?,?,?,?,?)',[$id,$p['eventId'],$b['name'],$b['price']??0,$b['currency']??'XAF',$b['available']??0]); Response::created(['id'=>$id],'Type créé.'); })($p));
$router->put ('/api/events/:eventId/ticket-types/:id',  fn($p) => (function($p) { Auth::requireRole('organizer','admin'); $b=Router::body(); $f=[];$v=[]; foreach(['name','price','currency','available','is_active'] as $k) { if(isset($b[$k])){$f[]="$k=?";$v[]=$b[$k];} } if(!$f){Response::error('Aucune modif.');return;} $v[]=$p['id'];$v[]=$p['eventId']; Database::execute('UPDATE ticket_types SET '.implode(',',$f).' WHERE id=? AND event_id=?',$v); Response::ok([],'Type mis à jour.'); })($p));
$router->delete('/api/events/:eventId/ticket-types/:id',fn($p) => (function($p) { Auth::requireRole('organizer','admin'); Database::execute('DELETE FROM ticket_types WHERE id=? AND event_id=?',[$p['id'],$p['eventId']]); Response::ok([],'Type supprimé.'); })($p));

// ── Comments ──────────────────────────────────────────────────────
$router->get   ('/api/events/:id/comments',                     fn($p) => $comments->list($p));
$router->post  ('/api/events/:id/comments',                     fn($p) => $comments->create($p));
$router->put   ('/api/events/:id/comments/:commentId',          fn($p) => $comments->update($p));
$router->delete('/api/events/:id/comments/:commentId',          fn($p) => $comments->remove($p));
$router->get   ('/api/events/:id/comments/:commentId/replies',  fn($p) => $comments->replies($p));
$router->post  ('/api/events/:id/comments/:commentId/like',     fn($p) => $comments->like($p));

// ── Tickets ───────────────────────────────────────────────────────
$router->post('/api/tickets/purchase', fn() => $tickets->purchase());
$router->get ('/api/tickets/my',       fn() => $tickets->myTickets());
$router->get ('/api/tickets/:id',      fn($p) => $tickets->getTicket($p));
$router->post('/api/tickets/verify',   fn() => $tickets->verify());

// ── Payments ──────────────────────────────────────────────────────
$router->get ('/api/payments',           fn()   => $payments->history());
$router->get ('/api/payments/:id',       fn($p) => $payments->getPayment($p));
$router->post('/api/payments/initiate',  fn()   => $payments->initiate());
$router->post('/api/payments/:id/confirm', fn($p) => $payments->confirm($p));
$router->post('/api/payments/:id/cancel',  fn($p) => $payments->cancel($p));

// ── Privacy ───────────────────────────────────────────────────────
$router->get ('/api/privacy/settings',       fn() => $privacy->getSettings());
$router->put ('/api/privacy/settings',       fn() => $privacy->updateSettings());
$router->get ('/api/privacy/export',         fn() => $privacy->exportData());
$router->post('/api/privacy/delete-account', fn() => $privacy->deleteAccount());
$router->put ('/api/privacy/change-password',fn() => $privacy->changePassword());

// ── Notifications ─────────────────────────────────────────────────
$router->get   ('/api/notifications',           fn()   => $notifs->list());
$router->get   ('/api/notifications/:id',        fn($p) => $notifs->getOne($p));
$router->put   ('/api/notifications/read-all',  fn()   => $notifs->markAllRead());
$router->put   ('/api/notifications/:id/read',  fn($p) => $notifs->markRead($p));
$router->delete('/api/notifications',           fn()   => $notifs->removeAll());
$router->delete('/api/notifications/:id',       fn($p) => $notifs->remove($p));

// ── Agenda / Sessions (public + user) ────────────────────────────
$router->get   ('/api/agenda/:eventId',              fn($p) => $agenda->getEventAgenda($p));
$router->post  ('/api/agenda/sessions/:id/book',     fn($p) => $agenda->bookSession($p));
$router->delete('/api/agenda/sessions/:id/book',     fn($p) => $agenda->cancelBooking($p));
$router->get   ('/api/speakers/:id',                 fn($p) => $agenda->getSpeakerProfile($p));
$router->post  ('/api/speakers/:id/messages',        fn($p) => $agenda->sendMessage($p));
$router->get   ('/api/speakers/:id/messages',        fn($p) => $agenda->getMessages($p));

// ── Organizer ────────────────────────────────────────────────────
$router->get   ('/api/organizer/dashboard',                   fn()   => $org->dashboard());
$router->get   ('/api/organizer/categories',                  fn()   => $org->listCategories());
$router->get   ('/api/organizer/events',                      fn()   => $org->myEvents());
$router->post  ('/api/organizer/events',                      fn()   => $org->createEvent());
$router->get   ('/api/organizer/events/:id',                  fn($p) => $org->getEvent($p));
$router->put   ('/api/organizer/events/:id',                  fn($p) => $org->updateEvent($p));
$router->delete('/api/organizer/events/:id',                  fn($p) => $org->deleteEvent($p));
$router->post  ('/api/organizer/events/:id/submit',           fn($p) => $org->submitEvent($p));
$router->put   ('/api/organizer/events/:id/status',           fn($p) => $org->setEventStatus($p));
$router->put   ('/api/organizer/events/:id/ticket-types',     fn($p) => $org->updateTicketTypes($p));
$router->get   ('/api/organizer/events/:id/tickets',          fn($p) => $org->eventTickets($p));
$router->get   ('/api/organizer/events/:id/stats',            fn($p) => $org->eventStats($p));
$router->get   ('/api/organizer/events/:id/scan-logs',        fn($p) => $org->eventScanLogs($p));
$router->post  ('/api/organizer/events/:id/notify',           fn($p) => $org->notifyAttendees($p));
$router->get   ('/api/organizer/events/:id/export',           fn($p) => $org->exportAttendees($p));
$router->get   ('/api/organizer/events/:id/speakers',         fn($p) => $org->listEventSpeakers($p));
$router->get   ('/api/organizer/events/:id/sessions',         fn($p) => $org->listSessions($p));
$router->post  ('/api/organizer/events/:id/sessions',         fn($p) => $org->createSession($p));
$router->get   ('/api/organizer/speakers',                    fn()   => $org->listSpeakers());
$router->post  ('/api/organizer/speakers',                    fn()   => $org->createSpeaker());
$router->put   ('/api/organizer/speakers/:id',                fn($p) => $org->updateSpeaker($p));
$router->delete('/api/organizer/speakers/:id',                fn($p) => $org->deleteSpeaker($p));
$router->put   ('/api/organizer/sessions/:id',                fn($p) => $org->updateSession($p));
$router->delete('/api/organizer/sessions/:id',                fn($p) => $org->deleteSession($p));
$router->get   ('/api/organizer/tickets',                     fn()   => $org->allTickets());
$router->get   ('/api/organizer/tickets/:number',             fn($p) => $org->getTicket($p));
$router->put   ('/api/organizer/tickets/:number/cancel',      fn($p) => $org->cancelTicket($p));
$router->get   ('/api/organizer/notifications',               fn()   => $org->notifications());
$router->put   ('/api/organizer/notifications/:id/read',      fn($p) => $org->markNotifRead($p));

// ── Admin ─────────────────────────────────────────────────────────
$router->get   ('/api/admin/stats',                          fn()   => $admin->stats());
$router->get   ('/api/admin/users',                          fn()   => $admin->listUsers());
$router->post  ('/api/admin/users',                          fn()   => $admin->createUser());
$router->get   ('/api/admin/users/:id',                      fn($p) => $admin->getUser($p));
$router->put   ('/api/admin/users/:id',                      fn($p) => $admin->updateUser($p));
$router->delete('/api/admin/users/:id',                      fn($p) => $admin->deleteUser($p));
$router->get   ('/api/admin/events',                         fn()   => $admin->listEvents());
$router->post  ('/api/admin/events',                         fn()   => $admin->createEvent());
$router->get   ('/api/admin/events/:id',                     fn($p) => $admin->getEvent($p));
$router->put   ('/api/admin/events/:id',                     fn($p) => $admin->updateEvent($p));
$router->put   ('/api/admin/events/:id/status',              fn($p) => $admin->setEventStatus($p));
$router->put   ('/api/admin/events/:id/feature',             fn($p) => $admin->featureEvent($p));
$router->delete('/api/admin/events/:id',                     fn($p) => $admin->deleteEvent($p));
$router->get   ('/api/admin/tickets',                        fn()   => $admin->listTickets());
$router->get   ('/api/admin/tickets/:number',                fn($p) => $admin->getTicketAdmin($p));
$router->put   ('/api/admin/tickets/:number/cancel',         fn($p) => $admin->cancelTicketAdmin($p));
$router->get   ('/api/admin/payments',                       fn()   => $admin->listPayments());
$router->get   ('/api/admin/payments/:id',                   fn($p) => $admin->getPaymentAdmin($p));
$router->put   ('/api/admin/payments/:id/status',            fn($p) => $admin->updatePaymentStatus($p));
$router->get   ('/api/admin/categories',                     fn()   => $admin->listCategories());
$router->post  ('/api/admin/categories',                     fn()   => $admin->createCategory());
$router->put   ('/api/admin/categories/:id',                 fn($p) => $admin->updateCategory($p));
$router->delete('/api/admin/categories/:id',                 fn($p) => $admin->deleteCategory($p));
$router->get   ('/api/admin/speakers',                       fn()   => $speaker->listSpeakers());
$router->post  ('/api/admin/speakers',                       fn()   => $speaker->createSpeaker());
$router->get   ('/api/admin/speakers/:id',                   fn($p) => $speaker->getSpeaker($p));
$router->put   ('/api/admin/speakers/:id',                   fn($p) => $speaker->updateSpeaker($p));
$router->delete('/api/admin/speakers/:id',                   fn($p) => $speaker->deleteSpeaker($p));
$router->get   ('/api/admin/speaker-messages',               fn()   => $speaker->listMessages());
$router->put   ('/api/admin/speaker-messages/:id/reply',     fn($p) => $speaker->replyMessage($p));
$router->get   ('/api/admin/events/:id/sessions',            fn($p) => $agenda->listSessions($p));
$router->post  ('/api/admin/events/:id/sessions',            fn($p) => $agenda->createSession($p));
$router->get   ('/api/admin/sessions/:id',                   fn($p) => $agenda->getSession($p));
$router->put   ('/api/admin/sessions/:id',                   fn($p) => $agenda->updateSession($p));
$router->delete('/api/admin/sessions/:id',                   fn($p) => $agenda->deleteSession($p));
$router->put   ('/api/admin/sessions/:id/speakers',          fn($p) => $agenda->setSpeakers($p));
$router->get   ('/api/admin/sessions/:id/bookings',          fn($p) => $agenda->listBookings($p));
$router->get   ('/api/admin/scan-logs',                      fn()   => $admin->scanLogs());
$router->post  ('/api/admin/notifications/broadcast',        fn()   => $notifs->broadcast());

// ── Dispatch ──────────────────────────────────────────────────────
$router->dispatch();
