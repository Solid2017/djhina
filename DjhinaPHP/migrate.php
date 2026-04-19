<?php
/**
 * Script de migration — à exécuter UNE SEULE FOIS après l'upload sur LWS
 * Accès : https://votre-domaine.com/migrate.php?key=VOTRE_CLE_SECRETE
 *
 * ⚠️  SUPPRIMER CE FICHIER après la migration !
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/src/Database.php';

$secret = getenv('MIGRATE_KEY') ?: 'djhina_migrate_2024';
if (($_GET['key'] ?? '') !== $secret) {
    http_response_code(403);
    die('Accès refusé. Ajoutez ?key=VOTRE_CLE_SECRETE');
}

header('Content-Type: text/plain; charset=utf-8');
$db  = Database::get();
$ok  = 0; $err = 0;

$migrations = [

'users' => "CREATE TABLE IF NOT EXISTS users (
  id                   VARCHAR(36)  PRIMARY KEY,
  name                 VARCHAR(200) NOT NULL,
  email                VARCHAR(200) NOT NULL UNIQUE,
  password             VARCHAR(255) NOT NULL,
  phone                VARCHAR(30),
  role                 ENUM('user','organizer','admin') DEFAULT 'user',
  avatar               VARCHAR(500),
  country              VARCHAR(80),
  city                 VARCHAR(80),
  bio                  TEXT,
  is_active            TINYINT(1)   DEFAULT 1,
  is_verified          TINYINT(1)   DEFAULT 0,
  verify_token         VARCHAR(100),
  reset_token          VARCHAR(100),
  last_login           DATETIME,
  privacy_profile_public TINYINT(1) DEFAULT 1,
  privacy_show_activity  TINYINT(1) DEFAULT 1,
  privacy_show_tickets   TINYINT(1) DEFAULT 0,
  data_share_analytics   TINYINT(1) DEFAULT 1,
  biometric_enabled      TINYINT(1) DEFAULT 0,
  created_at           DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

'refresh_tokens' => "CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         VARCHAR(36)  PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  token      TEXT         NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'categories' => "CREATE TABLE IF NOT EXISTS categories (
  id         VARCHAR(36)  PRIMARY KEY,
  slug       VARCHAR(80)  NOT NULL UNIQUE,
  label      VARCHAR(100) NOT NULL,
  icon       VARCHAR(50),
  color      VARCHAR(20)  DEFAULT '#6366f1',
  sort_order INT          DEFAULT 0,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'events' => "CREATE TABLE IF NOT EXISTS events (
  id           VARCHAR(36)  PRIMARY KEY,
  organizer_id VARCHAR(36)  NOT NULL,
  category_id  VARCHAR(36),
  title        VARCHAR(200) NOT NULL,
  subtitle     VARCHAR(300),
  description  TEXT,
  cover_image  VARCHAR(500),
  video_url    VARCHAR(500),
  date         DATE         NOT NULL,
  time         TIME         NOT NULL,
  end_time     TIME,
  location     VARCHAR(300) NOT NULL,
  city         VARCHAR(80)  DEFAULT 'N\\'Djaména',
  country      VARCHAR(80)  DEFAULT 'Tchad',
  latitude     DECIMAL(10,8),
  longitude    DECIMAL(11,8),
  capacity     INT          DEFAULT 0,
  registered   INT          DEFAULT 0,
  status       ENUM('draft','pending_review','published','cancelled','completed') DEFAULT 'draft',
  is_featured  TINYINT(1)   DEFAULT 0,
  is_free      TINYINT(1)   DEFAULT 0,
  tags         JSON,
  images       JSON,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id)  REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_status (status), INDEX idx_date (date), INDEX idx_organizer (organizer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'ticket_types' => "CREATE TABLE IF NOT EXISTS ticket_types (
  id         VARCHAR(36)   PRIMARY KEY,
  event_id   VARCHAR(36)   NOT NULL,
  name       VARCHAR(100)  NOT NULL,
  price      DECIMAL(10,2) DEFAULT 0,
  currency   VARCHAR(5)    DEFAULT 'XAF',
  benefits   JSON,
  available  INT           DEFAULT 0,
  sold       INT           DEFAULT 0,
  color      VARCHAR(20),
  sale_start DATETIME,
  sale_end   DATETIME,
  is_active  TINYINT(1)    DEFAULT 1,
  created_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'payments' => "CREATE TABLE IF NOT EXISTS payments (
  id             VARCHAR(36)   PRIMARY KEY,
  user_id        VARCHAR(36)   NOT NULL,
  event_id       VARCHAR(36)   NOT NULL,
  ticket_type_id VARCHAR(36)   NOT NULL,
  quantity       INT           DEFAULT 1,
  unit_price     DECIMAL(10,2) NOT NULL,
  fees           DECIMAL(10,2) DEFAULT 0,
  total          DECIMAL(10,2) NOT NULL,
  currency       VARCHAR(5)    DEFAULT 'XAF',
  provider       ENUM('airtel_money','moov_tchad','cash','free') NOT NULL,
  phone          VARCHAR(30),
  transaction_id VARCHAR(100),
  provider_ref   VARCHAR(100),
  status         ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  paid_at        DATETIME,
  notes          TEXT,
  created_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)        REFERENCES users(id),
  FOREIGN KEY (event_id)       REFERENCES events(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'tickets' => "CREATE TABLE IF NOT EXISTS tickets (
  id             VARCHAR(36)   PRIMARY KEY,
  ticket_number  VARCHAR(20)   NOT NULL UNIQUE,
  payment_id     VARCHAR(36),
  event_id       VARCHAR(36)   NOT NULL,
  ticket_type_id VARCHAR(36)   NOT NULL,
  user_id        VARCHAR(36)   NOT NULL,
  holder_name    VARCHAR(200),
  holder_email   VARCHAR(200),
  holder_phone   VARCHAR(30),
  seat_number    VARCHAR(20),
  qr_data        TEXT,
  qr_image       MEDIUMTEXT,
  status         ENUM('valid','used','cancelled') DEFAULT 'valid',
  used_at        DATETIME,
  used_by        VARCHAR(36),
  price_paid     DECIMAL(10,2) DEFAULT 0,
  currency       VARCHAR(5)    DEFAULT 'XAF',
  created_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id)       REFERENCES events(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id),
  FOREIGN KEY (user_id)        REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'scan_logs' => "CREATE TABLE IF NOT EXISTS scan_logs (
  id          VARCHAR(36) PRIMARY KEY,
  ticket_id   VARCHAR(36),
  scanned_by  VARCHAR(36),
  event_id    VARCHAR(36),
  result      ENUM('success','invalid','already_used','cancelled') NOT NULL,
  raw_qr      TEXT,
  ip_address  VARCHAR(45),
  device_info VARCHAR(500),
  scanned_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event (event_id), INDEX idx_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'event_likes' => "CREATE TABLE IF NOT EXISTS event_likes (
  user_id    VARCHAR(36) NOT NULL,
  event_id   VARCHAR(36) NOT NULL,
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, event_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'event_saves' => "CREATE TABLE IF NOT EXISTS event_saves (
  user_id    VARCHAR(36) NOT NULL,
  event_id   VARCHAR(36) NOT NULL,
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, event_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'comments' => "CREATE TABLE IF NOT EXISTS comments (
  id          VARCHAR(36)  PRIMARY KEY,
  event_id    VARCHAR(36)  NOT NULL,
  user_id     VARCHAR(36)  NOT NULL,
  parent_id   VARCHAR(36),
  content     TEXT         NOT NULL,
  likes_count INT          DEFAULT 0,
  is_hidden   TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'notifications' => "CREATE TABLE IF NOT EXISTS notifications (
  id         VARCHAR(36)  PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  type       VARCHAR(80)  NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT,
  data       JSON,
  is_read    TINYINT(1)   DEFAULT 0,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'speakers' => "CREATE TABLE IF NOT EXISTS speakers (
  id           VARCHAR(36)  PRIMARY KEY,
  organizer_id VARCHAR(36),
  name         VARCHAR(200) NOT NULL,
  job_title    VARCHAR(200),
  company      VARCHAR(200),
  email        VARCHAR(200),
  phone        VARCHAR(30),
  bio          TEXT,
  photo        VARCHAR(500),
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'sessions' => "CREATE TABLE IF NOT EXISTS sessions (
  id          VARCHAR(36)  PRIMARY KEY,
  event_id    VARCHAR(36)  NOT NULL,
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  type        ENUM('conference','workshop','panel','keynote','networking','break') DEFAULT 'conference',
  start_time  DATETIME,
  end_time    DATETIME,
  room        VARCHAR(100),
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'session_speakers' => "CREATE TABLE IF NOT EXISTS session_speakers (
  session_id VARCHAR(36) NOT NULL,
  speaker_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (session_id, speaker_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'session_bookings' => "CREATE TABLE IF NOT EXISTS session_bookings (
  id         VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_booking (session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'speaker_messages' => "CREATE TABLE IF NOT EXISTS speaker_messages (
  id         VARCHAR(36) PRIMARY KEY,
  speaker_id VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  message    TEXT        NOT NULL,
  reply      TEXT,
  is_read    TINYINT(1)  DEFAULT 0,
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

];

foreach ($migrations as $table => $sql) {
    try {
        $db->exec($sql);
        echo "✅ Table '$table' OK\n";
        $ok++;
    } catch (PDOException $e) {
        echo "❌ Table '$table' : " . $e->getMessage() . "\n";
        $err++;
    }
}

// Insérer un admin par défaut si la table users est vide
$count = $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
if ($count == 0) {
    $id   = bin2hex(random_bytes(16));
    $hash = password_hash('Admin1234!', PASSWORD_BCRYPT);
    $db->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?,?,?,?,'admin')")
       ->execute([$id, 'Administrateur', 'admin@djhina.td', $hash]);
    echo "\n👤 Admin créé : admin@djhina.td / Admin1234!\n";
    echo "   ⚠️  CHANGEZ CE MOT DE PASSE IMMÉDIATEMENT !\n";
}

// Insérer catégories de base
$catCount = $db->query('SELECT COUNT(*) FROM categories')->fetchColumn();
if ($catCount == 0) {
    $cats = [
        ['festival','Festival','🎪','#F59E0B',1],
        ['music','Musique','🎵','#EC4899',2],
        ['culture','Culture','🎭','#3B82F6',3],
        ['conference','Conférence','🎤','#06B6D4',4],
        ['fashion','Mode','👗','#A855F7',5],
        ['sport','Sport','⚽','#14B8A6',6],
        ['business','Business','💼','#3B82F6',7],
        ['food','Gastronomie','🍽️','#F97316',8],
    ];
    $stmt = $db->prepare("INSERT INTO categories (id,slug,label,icon,color,sort_order) VALUES (?,?,?,?,?,?)");
    foreach ($cats as [$slug,$label,$icon,$color,$order]) {
        $stmt->execute([bin2hex(random_bytes(16)),$slug,$label,$icon,$color,$order]);
    }
    echo "📂 Catégories de base insérées.\n";
}

echo "\n--- Migration terminée : $ok OK, $err erreurs ---\n";
echo "\n⚠️  SUPPRIMEZ CE FICHIER MAINTENANT : rm migrate.php\n";
