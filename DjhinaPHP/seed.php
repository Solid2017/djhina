<?php
/**
 * Djhina — Seed des données de test
 * Accès : https://djhina.igotech.tech/seed.php?key=djhina_seed_2026
 *
 * Insère : organisateurs, événements 2026, types de billets, speakers
 * Idempotent : vérifie les doublons avant chaque insertion.
 *
 * ⚠️  SUPPRIMER CE FICHIER après utilisation !
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/src/Database.php';

$secret = 'djhina_seed_2026';
if (($_GET['key'] ?? '') !== $secret) {
    http_response_code(403);
    die('Accès refusé. Ajoutez ?key=djhina_seed_2026');
}

header('Content-Type: text/plain; charset=utf-8');
$db = Database::get();

function uuid(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function exists(PDO $db, string $table, string $col, string $val): bool {
    $r = $db->prepare("SELECT id FROM `$table` WHERE `$col` = ? LIMIT 1");
    $r->execute([$val]);
    return (bool) $r->fetch();
}

function getCatId(PDO $db, string $slug): ?string {
    $r = $db->prepare("SELECT id FROM categories WHERE slug = ? LIMIT 1");
    $r->execute([$slug]);
    $row = $r->fetch(PDO::FETCH_ASSOC);
    return $row ? $row['id'] : null;
}

function getOrgId(PDO $db, string $keyword): ?string {
    $r = $db->prepare("SELECT id FROM users WHERE role IN ('organizer','admin') AND LOWER(name) LIKE ? LIMIT 1");
    $r->execute(['%' . strtolower($keyword) . '%']);
    $row = $r->fetch(PDO::FETCH_ASSOC);
    if ($row) return $row['id'];
    // fallback: premier organisateur/admin
    $r2 = $db->query("SELECT id FROM users WHERE role IN ('organizer','admin') ORDER BY created_at LIMIT 1");
    $row2 = $r2->fetch(PDO::FETCH_ASSOC);
    return $row2 ? $row2['id'] : null;
}

$ok = 0; $skip = 0;

// ═══════════════════════════════════════════════════════════════
// 1. ORGANISATEURS
// ═══════════════════════════════════════════════════════════════
echo "=== 1. Organisateurs ===\n";

// Mot de passe commun : Orga@Djhina2026
$orgHash = '$2a$12$69lbcpwdirUHrS9ye9xNQ.eDda2rJEzef6tFRfPL4uy.BT6Qve/Vu';

$organizers = [
    ['Djhina Events Tchad',   'organizer@djhina.igotech.tech',  '+235 66 00 00 02', "N'Djaména", 'Organisateur officiel de la plateforme Djhina.'],
    ['Emeraude Events',       'contact@emeraude-events.td',     '+235 66 11 22 33', "N'Djaména", 'Agence événementielle premium spécialisée dans les galas, mariages et lancements de produits au Tchad.'],
    ['Clens Events',          'info@clens-events.td',           '+235 66 44 55 66', "N'Djaména", 'Organisation de concerts, festivals et événements culturels depuis 2018.'],
    ['Job Booster',           'contact@jobbooster.td',          '+235 66 77 88 99', "N'Djaména", 'Spécialiste des forums emploi, salons professionnels et conférences business au Tchad.'],
    ['Sy Elegance',           'info@syelegance.td',             '+235 66 10 20 30', "N'Djaména", 'Défilés de mode, expositions artistiques et événements de luxe pour la femme tchadienne.'],
    ['Taronga Events',        'hello@taronga-events.td',        '+235 66 40 50 60', 'Moundou',   'Événements sportifs, concerts et animations culturelles dans le sud du Tchad.'],
];

foreach ($organizers as [$name, $email, $phone, $city, $bio]) {
    if (exists($db, 'users', 'email', $email)) {
        echo "⏭  $name (déjà présent)\n"; $skip++;
    } else {
        $id = uuid();
        $db->prepare("INSERT INTO users (id, name, email, phone, password, role, country, city, bio, is_active, is_verified)
                       VALUES (?,?,?,?,?,'organizer','Tchad',?,?,1,1)")
           ->execute([$id, $name, $email, $phone, $orgHash, $city, $bio]);
        echo "✅ Organisateur : $name\n"; $ok++;
    }
}

// ═══════════════════════════════════════════════════════════════
// 2. ÉVÉNEMENTS 2026
// ═══════════════════════════════════════════════════════════════
echo "\n=== 2. Événements 2026 ===\n";

$events = [
    [
        'title'       => 'Conférence des Femmes Africaines Ministres et Parlementaires',
        'subtitle'    => 'Sous le Très Haut Patronage du Maréchal Mahamat Idriss Déby Itno',
        'description' => "Grande conférence internationale réunissant les femmes africaines ministres et parlementaires au Tchad.\n\nThème : « Consolidation du Leadership Féminin Africain pour la Refondation du Tchad »\n\nUn événement majeur sous le patronage du Président de la République, Chef de l'État, qui rassemble des décideurs politiques africains au féminin pour débattre des grandes questions de gouvernance et de développement.",
        'category'    => 'conference',
        'organizer'   => 'djhina',
        'date'        => '2026-03-25',
        'time'        => '09:00:00',
        'end_time'    => '2026-03-27 18:00:00',
        'location'    => 'Radisson Blu Hotel',
        'city'        => "N'Djaména",
        'capacity'    => 500,
        'featured'    => 1,
        'tags'        => ['conférence', 'leadership féminin', 'Afrique', 'parlementaires', 'ministres'],
        'tickets'     => [
            ['Délégué officiel', 0,     200, '#16a34a'],
            ['Observateur',      25000, 200, '#0000FF'],
            ['Presse',           0,     100, '#16a34a'],
        ],
    ],
    [
        'title'       => 'Festival des Arts et Cultures Mongoh — 1ère Édition',
        'subtitle'    => 'Appel à Mobilisation',
        'description' => "Premier festival dédié aux arts et cultures de Mongoh, célébrant la richesse culturelle du Tchad.\n\nThème : « Unité Culturelle au Service du Développement »\n\nQuatre jours de festivités mêlant danses traditionnelles, expositions artistiques, concerts, artisanat local et gastronomie tchadienne.\n\nContact : 60138522",
        'category'    => 'culture',
        'organizer'   => 'clens',
        'date'        => '2026-04-29',
        'time'        => '10:00:00',
        'end_time'    => '2026-05-02 22:00:00',
        'location'    => 'Espace Talino Manu',
        'city'        => 'Mongoh',
        'capacity'    => 1000,
        'featured'    => 1,
        'tags'        => ['festival', 'arts', 'culture', 'Mongoh', 'traditionnel'],
        'tickets'     => [
            ['Entrée journalière', 1000,  500, '#0000FF'],
            ['Pass 4 jours',       3000,  300, '#0000FF'],
            ['Espace VIP',         10000, 100, '#a855f7'],
        ],
    ],
    [
        'title'       => 'Grand Défilé de Mode — Djhina Fashion Week',
        'subtitle'    => "La mode africaine à l'honneur",
        'description' => "Soirée exceptionnelle de défilé de mode mettant en valeur les créateurs de mode africains et tchadiens.\n\nUne passerelle spectaculaire dans un cadre luxueux, avec des performances artistiques, des collections exclusives alliant modernité et tradition africaine.",
        'category'    => 'fashion',
        'organizer'   => 'sy',
        'date'        => '2026-05-15',
        'time'        => '19:00:00',
        'end_time'    => null,
        'location'    => 'Palais du 15 Janvier',
        'city'        => "N'Djaména",
        'capacity'    => 400,
        'featured'    => 1,
        'tags'        => ['mode', 'défilé', 'fashion', 'créateurs', 'Afrique'],
        'tickets'     => [
            ['Tribune Standard', 15000, 200, '#0000FF'],
            ['Tribune VIP',      35000, 100, '#a855f7'],
            ['Loge Prestige',    75000, 50,  '#a855f7'],
        ],
    ],
    [
        'title'       => 'Festival des Danses et Traditions du Tchad',
        'subtitle'    => 'Célébration du patrimoine culturel immatériel',
        'description' => "Un grand festival populaire réunissant les troupes culturelles et associations de danses traditionnelles de toutes les régions du Tchad.\n\nSpectacles de danses traditionnelles, percussions, chants folkloriques, expositions d'artisanat.",
        'category'    => 'festival',
        'organizer'   => 'taronga',
        'date'        => '2026-06-20',
        'time'        => '09:00:00',
        'end_time'    => null,
        'location'    => 'Place de la Nation',
        'city'        => "N'Djaména",
        'capacity'    => 2000,
        'featured'    => 1,
        'tags'        => ['danses', 'traditions', 'culture', 'patrimoine', 'Tchad'],
        'tickets'     => [
            ['Entrée libre', 0,    1500, '#16a34a'],
            ['Zone VIP',     5000, 200,  '#a855f7'],
        ],
    ],
    [
        'title'       => 'Festival Dary — Notre Pays, nos Merveilles',
        'subtitle'    => 'Découverte et valorisation du tourisme tchadien',
        'description' => "Le Festival Dary est une célébration des merveilles naturelles, culturelles et humaines du Tchad.\n\nAu programme : expositions photographiques, conférences tourisme, stands artisanaux, gastronomie tchadienne, concerts et animations famille.",
        'category'    => 'festival',
        'organizer'   => 'emeraude',
        'date'        => '2026-07-10',
        'time'        => '08:00:00',
        'end_time'    => '2026-07-13 20:00:00',
        'location'    => "Parc de Loisirs de N'Djaména",
        'city'        => "N'Djaména",
        'capacity'    => 3000,
        'featured'    => 1,
        'tags'        => ['Festival Dary', 'tourisme', 'Tchad', 'culture', 'merveilles'],
        'tickets'     => [
            ['Entrée adulte',  500,  2000, '#0000FF'],
            ['Enfant -12 ans', 0,    500,  '#16a34a'],
            ['Pass famille',   1500, 300,  '#0000FF'],
        ],
    ],
    [
        'title'       => 'TEDxMoursal — Conférence de PreX',
        'subtitle'    => 'Conférence de PreX par TEDxMoursal',
        'description' => "La Conférence de PreX est un événement TEDx organisé par TEDxMoursal à N'Djaména.\n\nCet événement rassemble des speakers inspirants pour partager des idées qui valent la peine d'être diffusées, dans l'esprit des conférences TED internationales.\n\nSuivez @TEDxMoursal pour plus d'informations.",
        'category'    => 'conference',
        'organizer'   => 'djhina',
        'date'        => '2026-11-30',
        'time'        => '15:00:00',
        'end_time'    => null,
        'location'    => 'Restaurant Selesao',
        'city'        => "N'Djaména",
        'capacity'    => 200,
        'featured'    => 0,
        'tags'        => ['TEDx', 'conférence', 'Moursal', 'PreX', 'idées'],
        'tickets'     => [
            ['Entrée PreX', 0,     150, '#16a34a'],
            ['Place VIP',   10000, 50,  '#0000FF'],
        ],
    ],
    [
        'title'       => 'Salon des Entrepreneurs du Tchad',
        'subtitle'    => 'Forum Business & Innovation',
        'description' => "Le Salon des Entrepreneurs du Tchad réunit les acteurs économiques, startups et investisseurs pour deux jours d'échanges, de networking et de découverte des opportunités business au Tchad.",
        'category'    => 'business',
        'organizer'   => 'job booster',
        'date'        => '2026-06-15',
        'time'        => '09:00:00',
        'end_time'    => null,
        'location'    => "Centre de Conférences de N'Djaména",
        'city'        => "N'Djaména",
        'capacity'    => 300,
        'featured'    => 0,
        'tags'        => ['business', 'entrepreneurs', 'innovation', 'Tchad'],
        'tickets'     => [
            ['Visiteur',    0,     200, '#16a34a'],
            ['Exposant',    15000, 80,  '#0000FF'],
            ['VIP Business',35000, 20,  '#a855f7'],
        ],
    ],
];

foreach ($events as $ev) {
    if (exists($db, 'events', 'title', $ev['title'])) {
        echo "⏭  {$ev['title']} (déjà présent)\n"; $skip++;
        continue;
    }

    $eventId  = uuid();
    $catId    = getCatId($db, $ev['category']);
    $orgId    = getOrgId($db, $ev['organizer']);

    if (!$orgId) { echo "❌ Aucun organisateur pour : {$ev['title']}\n"; continue; }

    $db->prepare(
        "INSERT INTO events (id, organizer_id, category_id, title, subtitle, description,
          date, time, end_time, location, city, country, capacity, is_featured,
          is_free, tags, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    )->execute([
        $eventId, $orgId, $catId,
        $ev['title'], $ev['subtitle'], $ev['description'],
        $ev['date'], $ev['time'], $ev['end_time'],
        $ev['location'], $ev['city'], 'Tchad',
        $ev['capacity'], $ev['featured'],
        0, // is_free
        json_encode($ev['tags'], JSON_UNESCAPED_UNICODE),
        'published',
    ]);

    foreach ($ev['tickets'] as [$name, $price, $available, $color]) {
        $db->prepare(
            "INSERT INTO ticket_types (id, event_id, name, price, currency, available, color, is_active)
             VALUES (?,?,?,?,'XAF',?,?,1)"
        )->execute([uuid(), $eventId, $name, $price, $available, $color]);
    }

    echo "✅ Événement : {$ev['title']} ({$ev['date']})\n"; $ok++;
}

// ═══════════════════════════════════════════════════════════════
// 3. SPEAKERS
// ═══════════════════════════════════════════════════════════════
echo "\n=== 3. Speakers ===\n";

$orgId = getOrgId($db, 'djhina');

$speakers = [
    [
        'name'      => 'Djessada Ndolembaye',
        'job_title' => 'Entrepreneur & Conférencier TED',
        'company'   => 'TEDxMoursal',
        'bio'       => "Passionné par l'innovation et le développement durable au Tchad, Djessada est l'un des visages du mouvement TEDx à N'Djaména. Il partage sa vision d'un Tchad entrepreneur et connecté.",
    ],
    [
        'name'      => 'Edgard Djerassem',
        'job_title' => 'Fondateur & CEO',
        'company'   => 'Djerassem Consulting Group',
        'bio'       => "Expert en développement des PME en Afrique centrale, Edgard accompagne les jeunes entrepreneurs tchadiens dans la structuration et la croissance de leurs entreprises.",
    ],
    [
        'name'      => 'Marina Gora Gadji',
        'job_title' => 'Styliste & Directrice Artistique',
        'company'   => 'Djhina Fashion',
        'bio'       => "Créatrice de mode tchadienne reconnue sur la scène africaine, Marina mêle l'authenticité des textiles traditionnels aux tendances contemporaines.",
    ],
    [
        'name'      => 'Yacinthe Ndolenodji',
        'job_title' => 'DRH & Coach Carrière',
        'company'   => 'Talent Hub Tchad',
        'bio'       => "Spécialiste des ressources humaines et du développement professionnel, Yacinthe aide les jeunes diplômés tchadiens à trouver leur voie et à décrocher des opportunités d'emploi de qualité.",
    ],
    [
        'name'      => 'Amina Hassan Mahamat',
        'job_title' => 'Ministre déléguée',
        'company'   => 'République du Tchad',
        'bio'       => "Femme politique engagée pour l'égalité des genres et le leadership féminin en Afrique centrale. Participante à la Conférence des Femmes Africaines Ministres et Parlementaires.",
    ],
];

foreach ($speakers as $sp) {
    if (exists($db, 'speakers', 'name', $sp['name'])) {
        echo "⏭  {$sp['name']} (déjà présent)\n"; $skip++;
        continue;
    }
    $db->prepare(
        "INSERT INTO speakers (id, organizer_id, name, job_title, company, bio)
         VALUES (?,?,?,?,?,?)"
    )->execute([uuid(), $orgId, $sp['name'], $sp['job_title'], $sp['company'], $sp['bio']]);
    echo "✅ Speaker : {$sp['name']}\n"; $ok++;
}

// ═══════════════════════════════════════════════════════════════
// RÉSUMÉ
// ═══════════════════════════════════════════════════════════════
$total_events  = $db->query('SELECT COUNT(*) FROM events')->fetchColumn();
$total_users   = $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
$total_tickets = $db->query('SELECT COUNT(*) FROM ticket_types')->fetchColumn();
$total_spk     = $db->query('SELECT COUNT(*) FROM speakers')->fetchColumn();

echo "\n=== Résumé ===\n";
echo "✅ Insérés   : $ok\n";
echo "⏭  Ignorés   : $skip (doublons)\n";
echo "\n📊 État de la base :\n";
echo "  - Utilisateurs     : $total_users\n";
echo "  - Événements       : $total_events\n";
echo "  - Types de billets : $total_tickets\n";
echo "  - Speakers         : $total_spk\n";
echo "\n⚠️  SUPPRIMEZ CE FICHIER MAINTENANT : seed.php\n";
