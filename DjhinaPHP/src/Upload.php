<?php
class Upload {
    private static array $IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    private static array $VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    private static array $IMAGE_EXTS  = ['jpg', 'jpeg', 'png', 'webp'];
    private static array $VIDEO_EXTS  = ['mp4', 'mov', 'avi', 'webm', 'mkv'];

    // Traite un upload image — retourne le chemin relatif ou null
    public static function image(string $field, string $subdir = 'events'): ?string {
        if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return null;
        return self::handle($field, $subdir, self::$IMAGE_TYPES, self::$IMAGE_EXTS, MAX_FILE_SIZE);
    }

    // Traite un upload vidéo — retourne le chemin relatif ou null
    public static function video(string $field = 'video'): ?string {
        if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return null;
        return self::handle($field, 'videos', self::$VIDEO_TYPES, self::$VIDEO_EXTS, MAX_VIDEO_SIZE);
    }

    private static function handle(string $field, string $subdir, array $types, array $exts, int $maxSize): string {
        $file = $_FILES[$field];

        if ($file['size'] > $maxSize) {
            Response::error('Fichier trop volumineux. Max : ' . round($maxSize / 1024 / 1024) . ' Mo.', 413);
            exit;
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $exts, true)) {
            Response::error('Format non accepté : ' . implode(', ', $exts) . '.', 422);
            exit;
        }

        // Vérification MIME réelle
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($file['tmp_name']);
        if (!in_array($mime, $types, true)) {
            Response::error('Type de fichier non autorisé.', 422);
            exit;
        }

        $dir = UPLOAD_DIR . $subdir . '/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $filename = time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $dest     = $dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::error('Erreur lors de la sauvegarde du fichier.', 500);
            exit;
        }

        return '/uploads/' . $subdir . '/' . $filename;
    }

    // Supprime un fichier uploadé (chemin relatif)
    public static function delete(?string $path): void {
        if (!$path) return;
        $abs = __DIR__ . '/..' . $path;
        if (file_exists($abs)) unlink($abs);
    }
}
