<?php
class Response {

    public static function json(array $data, int $status = 200): void {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function ok(array $data = [], string $message = ''): void {
        $body = ['success' => true];
        if ($message) $body['message'] = $message;
        if ($data)    $body['data']    = $data;
        self::json($body, 200);
    }

    public static function created(array $data = [], string $message = ''): void {
        $body = ['success' => true];
        if ($message) $body['message'] = $message;
        if ($data)    $body['data']    = $data;
        self::json($body, 201);
    }

    public static function error(string $message, int $status = 400): void {
        self::json(['success' => false, 'message' => $message], $status);
    }

    public static function notFound(string $message = 'Introuvable.'): void {
        self::json(['success' => false, 'message' => $message], 404);
    }

    public static function paginated(array $rows, int $total, int $page, int $limit): void {
        self::json([
            'success' => true,
            'data'    => $rows,
            'meta'    => [
                'total'       => $total,
                'page'        => $page,
                'limit'       => $limit,
                'total_pages' => (int) ceil($total / $limit),
            ],
        ]);
    }
}
