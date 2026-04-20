<?php
// FICHIER DE DIAGNOSTIC — SUPPRIMER APRES USAGE
// Test : https://djhina.igotech.tech/debug.php

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

header('Content-Type: text/plain; charset=utf-8');

echo "=== DEBUG DJHINA ===\n\n";
echo "PHP Version   : " . PHP_VERSION . "\n";
echo "OS            : " . PHP_OS . "\n";
echo "SAPI          : " . PHP_SAPI . "\n\n";

// Test 1 : Extensions critiques
$required = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'openssl'];
foreach ($required as $ext) {
    echo "Extension $ext : " . (extension_loaded($ext) ? "OK" : "MANQUANTE !!!") . "\n";
}
echo "\n";

// Test 2 : Chargement config
echo "--- Config ---\n";
try {
    require_once __DIR__ . '/config.php';
    echo "config.php    : OK\n";
    echo "DB_HOST       : " . DB_HOST . "\n";
    echo "DB_NAME       : " . DB_NAME . "\n";
    echo "APP_URL       : " . APP_URL . "\n";
    echo "APP_ENV       : " . APP_ENV . "\n";
} catch (Throwable $e) {
    echo "config.php    : ERREUR — " . $e->getMessage() . "\n";
    exit;
}

// Test 3 : Connexion DB
echo "\n--- Database ---\n";
try {
    require_once __DIR__ . '/src/Database.php';
    $db = Database::get();
    $v  = $db->query("SELECT VERSION() AS v")->fetch();
    echo "MySQL         : " . ($v['v'] ?? 'inconnu') . "\n";
} catch (Throwable $e) {
    echo "MySQL ERREUR  : " . $e->getMessage() . "\n";
}

// Test 4 : Chargement de chaque fichier source
echo "\n--- Source files ---\n";
$files = [
    'src/JWT.php',
    'src/Router.php',
    'src/Response.php',
    'src/Auth.php',
    'src/Upload.php',
    'src/QRCode.php',
    'controllers/AuthController.php',
    'controllers/EventController.php',
    'controllers/TicketController.php',
    'controllers/PaymentController.php',
    'controllers/CommentController.php',
    'controllers/NotificationController.php',
    'controllers/PrivacyController.php',
    'controllers/OrganizerController.php',
    'controllers/AdminController.php',
    'controllers/SpeakerController.php',
    'controllers/AgendaController.php',
];
foreach ($files as $f) {
    try {
        require_once __DIR__ . '/' . $f;
        echo "$f : OK\n";
    } catch (Throwable $e) {
        echo "$f : ERREUR — " . $e->getMessage() . " [line " . $e->getLine() . "]\n";
    }
}

// Test 5 : Route simple
echo "\n--- Routing ---\n";
try {
    $router = new Router();
    echo "Router instanciation : OK\n";
    $router->get('/api/test', fn() => null);
    echo "Router->get()        : OK\n";
} catch (Throwable $e) {
    echo "Router ERREUR : " . $e->getMessage() . "\n";
}

// Test 6 : .htaccess rewrite
echo "\n--- .htaccess ---\n";
echo "mod_rewrite : " . (function_exists('apache_get_modules')
    ? (in_array('mod_rewrite', apache_get_modules()) ? 'OK' : 'ABSENT')
    : 'inconnu (non-Apache ou restriction)') . "\n";

echo "\n=== FIN DEBUG ===\n";
