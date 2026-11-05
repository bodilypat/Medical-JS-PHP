
<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth_api.php';

authMethod('GET');

try {
    $user = authRequireUser();

    authJson(200, [
        'success' => true,
        'data' => [
            'user' => [
                'id' => (int) $user['id'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role']
            ],
            'csrf_token' => authNewCsrfToken()
        ]
    ]);
} catch (Throwable $e) {
    error_log('Auth me error: ' . $e->getMessage());

    authJson(500, [
        'success' => false,
        'message' => 'Unable to retrieve account information.'
    ]);
}
