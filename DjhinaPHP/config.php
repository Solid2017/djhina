<?php
// ─────────────────────────────────────────────────────────────────
// Configuration Djhina — Backend PHP
// config.local.php est chargé EN PREMIER pour que ses valeurs
// prennent la priorité sur les valeurs par défaut ci-dessous.
// ─────────────────────────────────────────────────────────────────

// Charger la config locale (LWSPanel, production) si elle existe
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

// Valeurs par défaut — ignorées si déjà définies dans config.local.php
defined('DB_HOST')    || define('DB_HOST',    getenv('DB_HOST')    ?: 'localhost');
defined('DB_PORT')    || define('DB_PORT',    getenv('DB_PORT')    ?: '3306');
defined('DB_NAME')    || define('DB_NAME',    getenv('DB_NAME')    ?: 'djhina');
defined('DB_USER')    || define('DB_USER',    getenv('DB_USER')    ?: 'root');
defined('DB_PASS')    || define('DB_PASS',    getenv('DB_PASS')    ?: '');

defined('JWT_SECRET') || define('JWT_SECRET', getenv('JWT_SECRET') ?: 'djhina_secret_change_in_production');
defined('JWT_EXPIRES')|| define('JWT_EXPIRES',getenv('JWT_EXPIRES')?: 3600);
defined('JWT_REFRESH')|| define('JWT_REFRESH',getenv('JWT_REFRESH')?: 604800);

defined('APP_URL')    || define('APP_URL',    getenv('APP_URL')    ?: 'http://localhost');
defined('APP_ENV')    || define('APP_ENV',    getenv('APP_ENV')    ?: 'production');

defined('MAX_FILE_SIZE')  || define('MAX_FILE_SIZE',  5  * 1024 * 1024);
defined('MAX_VIDEO_SIZE') || define('MAX_VIDEO_SIZE', 200 * 1024 * 1024);

defined('ALLOWED_ORIGINS') || define('ALLOWED_ORIGINS', [
    'http://localhost:8081',
    'http://localhost:3000',
    APP_URL,
]);

defined('UPLOAD_DIR') || define('UPLOAD_DIR', __DIR__ . '/uploads/');
defined('UPLOAD_URL') || define('UPLOAD_URL', APP_URL . '/uploads/');
