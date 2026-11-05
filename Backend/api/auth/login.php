
<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth_api.php';

authMethod('POST');
$data = authInput();

$email = authEmail((string) ($data['email'] ?? ''));
$password = $data['password'] ?? '';

if (!is_string($password) || $password === '' ||
    strlen($password) > 1024) {
    authJson(422, [
        'success' => false,
        'message' => 'Email or password is invalid.'
    ]);
}

/*
 * Apply IP- and account-based rate limiting here using a shared
 * store such as Redis or a database table. Do not rely on PHP
 * session-only throttling.
 */
try {
    $stmt = authDb()->prepare(
        'SELECT id, full_name, email, password_hash, role, status
         FROM users
         WHERE email = :email
         LIMIT 1'
    );

    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (
        !$user ||
        !password_verify($password, $user['password_hash']) ||
        $user['status'] !== 'active'
    ) {
        authJson(401, [
            'success' => false,
            'message' => 'Invalid email or password.'
        ]);
    }

    authStartSession();

    if (!session_regenerate_id(true)) {
        throw new RuntimeException('Session rotation failed.');
    }

    $_SESSION = [
        'user_id' => (int) $user['id'],
        'authenticated_at' => time()
    ];

    $csrfToken = authNewCsrfToken();

    authJson(200, [
        'success' => true,
        'message' => 'Login successful.',
        'data' => [
            'user' => [
                'id' => (int) $user['id'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role']
            ],
            'csrf_token' => $csrfToken
        ]
    ]);
} catch (PDOException $e) {
    error_log('Auth login database error: ' . $e->getMessage());

    authJson(500, [
        'success' => false,
        'message' => 'Unable to sign in at this time.'
    ]);
} catch (Throwable $e) {
    error_log('Auth login error: ' . $e->getMessage());

    authJson(500, [
        'success' => false,
        'message' => 'Unable to sign in at this time.'
    ]);
}
