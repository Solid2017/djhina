<?php
// Fichier de diagnostic — SUPPRIMER apres verification !
// Acces : https://djhina.igotech.tech/phpinfo-check.php

echo '<pre>';
echo 'PHP Version : ' . PHP_VERSION . "\n";
echo 'Extensions  : ' . implode(', ', get_loaded_extensions()) . "\n";

// Test config
require_once __DIR__ . '/config.php';
echo 'DB_HOST     : ' . DB_HOST . "\n";
echo 'APP_URL     : ' . APP_URL . "\n";
echo 'APP_ENV     : ' . APP_ENV . "\n";

// Test connexion DB
require_once __DIR__ . '/src/Database.php';
try {
    $db = Database::get();
    $v  = $db->query('SELECT VERSION() AS v')->fetch();
    echo 'MySQL       : ' . $v['v'] . "\n";
} catch (Exception $e) {
    echo 'MySQL ERR   : ' . $e->getMessage() . "\n";
}

// Test .htaccess rewrite
echo 'mod_rewrite : ' . (function_exists('apache_get_modules') ? (in_array('mod_rewrite', apache_get_modules()) ? 'OK' : 'ABSENT') : 'inconnu') . "\n";
echo '</pre>';
