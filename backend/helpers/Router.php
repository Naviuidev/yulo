<?php

declare(strict_types=1);

final class Router
{
    private array $routes = [];
    private array $middleware = [];

    public function get(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, callable|array $handler, array $middleware = []): self
    {
        return $this->add('DELETE', $path, $handler, $middleware);
    }

    public function group(string $prefix, callable $callback, array $middleware = []): void
    {
        $previousPrefix = $this->currentPrefix ?? '';
        $previousMiddleware = $this->middleware;

        $this->currentPrefix = rtrim($previousPrefix . '/' . trim($prefix, '/'), '/');
        $this->middleware = array_merge($previousMiddleware, $middleware);

        $callback($this);

        $this->currentPrefix = $previousPrefix;
        $this->middleware = $previousMiddleware;
    }

    private string $currentPrefix = '';

    private function add(string $method, string $path, callable|array $handler, array $middleware): self
    {
        $fullPath = rtrim(($this->currentPrefix ?? '') . '/' . trim($path, '/'), '/') ?: '/';
        $pattern = $this->pathToRegex($fullPath);

        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $fullPath,
            'pattern' => $pattern,
            'handler' => $handler,
            'middleware' => array_merge($this->middleware, $middleware),
        ];

        return $this;
    }

    private function pathToRegex(string $path): string
    {
        $pattern = preg_replace('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', '(?P<$1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }

    public function dispatch(string $method, string $uri): void
    {
        $method = strtoupper($method);
        $uri = parse_url($uri, PHP_URL_PATH) ?: '/';
        $uri = rtrim($uri, '/') ?: '/';

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (!preg_match($route['pattern'], $uri, $matches)) {
                continue;
            }

            $params = array_filter($matches, fn($key) => !is_int($key), ARRAY_FILTER_USE_KEY);

            foreach ($route['middleware'] as $middlewareClass) {
                $middleware = new $middlewareClass();
                if (!$middleware->handle()) {
                    return;
                }
            }

            $handler = $route['handler'];

            if (is_array($handler)) {
                [$controller, $action] = $handler;
                $instance = new $controller();
                $instance->$action($params);
                return;
            }

            $handler($params);
            return;
        }

        Response::jsonError('Route not found.', 404);
    }
}
