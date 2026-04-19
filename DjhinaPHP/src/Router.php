<?php
class Router {
    private array $routes = [];
    private string $method;
    private string $path;

    public function __construct() {
        $this->method = $_SERVER['REQUEST_METHOD'];
        // Nettoyer le chemin (enlever query string et préfixe /api si présent)
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $uri = rawurldecode($uri);
        $uri = rtrim($uri, '/') ?: '/';
        $this->path = $uri;
    }

    public function get(string $pattern, callable $handler): void    { $this->add('GET',    $pattern, $handler); }
    public function post(string $pattern, callable $handler): void   { $this->add('POST',   $pattern, $handler); }
    public function put(string $pattern, callable $handler): void    { $this->add('PUT',    $pattern, $handler); }
    public function delete(string $pattern, callable $handler): void { $this->add('DELETE', $pattern, $handler); }

    private function add(string $method, string $pattern, callable $handler): void {
        $this->routes[] = compact('method', 'pattern', 'handler');
    }

    public function dispatch(): void {
        // OPTIONS preflight
        if ($this->method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $this->method) continue;

            $params = [];
            $regex  = preg_replace('/\/:([^\/]+)/', '/(?P<$1>[^/]+)', $route['pattern']);
            $regex  = '@^' . $regex . '$@';

            if (preg_match($regex, $this->path, $matches)) {
                // Extraire les paramètres nommés
                foreach ($matches as $key => $val) {
                    if (is_string($key)) $params[$key] = $val;
                }
                call_user_func($route['handler'], $params);
                return;
            }
        }

        Response::json(['success' => false, 'message' => 'Route ' . $this->method . ' ' . $this->path . ' introuvable.'], 404);
    }

    // Retourne le body JSON parsé
    public static function body(): array {
        static $body = null;
        if ($body === null) {
            $raw  = file_get_contents('php://input');
            $body = $raw ? (json_decode($raw, true) ?? []) : [];
            // Fusionner avec $_POST pour les form-data
            $body = array_merge($body, $_POST);
        }
        return $body;
    }

    // Génère un UUID v4
    public static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    // Pagination helper
    public static function pagination(): array {
        $page  = max(1, (int)($_GET['page']  ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        return [$page, $limit, ($page - 1) * $limit];
    }
}
