<?php
// ─────────────────────────────────────────────────────────────────
// Configuration Djhina — Backend PHP
// Copiez ce fichier en config.local.php pour surcharger les valeurs
// ─────────────────────────────────────────────────────────────────

define('DB_HOST',     getenv('DB_HOST')     ?: 'localhost');
define('DB_PORT',     getenv('DB_PORT')     ?: '3306');
define('DB_NAME',     getenv('DB_NAME')     ?: 'djhina');
define('DB_USER',     getenv('DB_USER')     ?: 'root');
define('DB_PASS',     getenv('DB_PASS')     ?: '');

define('JWT_SECRET',  getenv('JWT_SECRET')  ?: 'djhina_secret_change_in_production');
define('JWT_EXPIRES', getenv('JWT_EXPIRES') ?: 3600);          // 1 heure
define('JWT_REFRESH', getenv('JWT_REFRESH') ?: 604800);        // 7 jours

define('APP_URL',     getenv('APP_URL')     ?: 'http://localhost');
define('APP_ENV',     getenv('APP_ENV')     ?: 'production');

define('MAX_FILE_SIZE',  5  * 1024 * 1024);   // 5 Mo  (images)
define('MAX_VIDEO_SIZE', 200 * 1024 * 1024);  // 200 Mo (vidéos)

define('ALLOWED_ORIGINS', [
    'http://localhost:8081',
    'http://localhost:3000',
    APP_URL,
]);

define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('UPLOAD_URL', APP_URL . '/uploads/');

// Charger surcharge locale si elle existe
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}
