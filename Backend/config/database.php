<?php
/* PDO connection to MySQL */
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function getDatabaseConnection(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $name = getenv('DB_NAME') ?: '';
    $user = getenv('DB_USER') ?: '';
    $pass = getenv('DB_PASSWORD');

    if ($name === '' || $user === '' || $pass === false) {
        throw new RuntimeException(
            'Database configuration is incomplete.'
        );
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $name)) {
        throw new RuntimeException('Invalid database name.');
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $host,
        $port,
        $name
    );

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);

    return $pdo;
}