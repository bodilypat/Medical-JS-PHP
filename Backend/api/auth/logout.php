
<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../helpers/auth_api.php';

authMethod('POST');
authRequireUser();
authVerifyCsrf();

$_SESSION = [];

$params = session_get_cookie_params();

if (ini_get('session.use_cookies')) {
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'],
        'domain' => $params['domain'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?? 'Lax'
    ]);
}

if (!session_destroy()) {
    authJson(500, [
        'success' => false,
        'message' => 'Unable to terminate the session.'
    ]);
}

authJson(200, [
    'success' => true,
    'message' => 'Logged out successfully.'
]);
