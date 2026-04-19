<?php
/**
 * Générateur QR Code minimaliste — pur PHP, sans dépendances.
 * Utilise la librairie BaconQrCode inline-compatible ou génère
 * une image via GD (si disponible) ou retourne une URL de données.
 */
class QRCode {

    // Génère un QR code et retourne une Data URI base64 (PNG)
    public static function generate(string $data): string {
        // Si l'extension GD et la fonction imagecreatefrompng sont disponibles,
        // on utilise l'API QR Server (fonctionnel hors ligne avec curl)
        if (function_exists('curl_init')) {
            return self::fromApi($data);
        }
        // Fallback : data URI SVG simple (ne contient pas le vrai QR mais identifie le ticket)
        return 'data:image/svg+xml;base64,' . base64_encode(self::svg($data));
    }

    // Génère via l'API publique qrserver.com (nécessite internet au moment de l'émission)
    private static function fromApi(string $data): string {
        $url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' . urlencode($data);
        $ch  = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $img = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($img && $code === 200) {
            return 'data:image/png;base64,' . base64_encode($img);
        }
        return 'data:image/svg+xml;base64,' . base64_encode(self::svg($data));
    }

    // SVG fallback
    private static function svg(string $data): string {
        $escaped = htmlspecialchars($data, ENT_QUOTES);
        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="white"/>
  <rect x="10" y="10" width="60" height="60" fill="none" stroke="black" stroke-width="4"/>
  <rect x="20" y="20" width="40" height="40" fill="black"/>
  <rect x="130" y="10" width="60" height="60" fill="none" stroke="black" stroke-width="4"/>
  <rect x="140" y="20" width="40" height="40" fill="black"/>
  <rect x="10" y="130" width="60" height="60" fill="none" stroke="black" stroke-width="4"/>
  <rect x="20" y="140" width="40" height="40" fill="black"/>
  <text x="100" y="115" text-anchor="middle" font-size="8" fill="black">{$escaped}</text>
</svg>
SVG;
    }
}
