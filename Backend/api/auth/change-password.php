
<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth_api.php';

authMethod('POST');
$user = authRequireUser();
authVerifyCsrf();

$data = authInput();

$current = $data['current_password'] ?? '';
$new = $data['new_password'] ?? '';
$confirm = $data['confirm_password'] ?? '';

if (
    !is_string($current) || $current === '' || strlen($current) > 1024 ||
    !is_string($new) || strlen($new) < 15 || strlen($new) > 1024 ||
    !is_string($confirm) || !hash_equals($new, $confirm)
) {
    authJson(422, [
        'success' => false,
        'message' => 'Invalid password details. Use at least 15 characters and ensure both new passwords match.',
    ]);
}

try {
    $pdo = authDb();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'SELECT password_hash FROM users WHERE id = :id FOR UPDATE'
    );
    $stmt->execute([':id' => (int) $user['id']]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record || !password_verify($current, $record['password_hash'])) {
        $pdo->rollBack();

        authJson(422, [
            'success' => false,
            'message' => 'Current password is incorrect.'
        ]);
    }

    if (password_verify($new, $record['password_hash'])) {
        $pdo->rollBack();

        authJson(422, [
            'success' => false,
            'message' => 'Choose a password different from the current password.'
        ]);
    }

    $update = $pdo->prepare(
        'UPDATE users
         SET password_hash = :hash, updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );

    $update->execute([
        ':hash' => password_hash($new, PASSWORD_DEFAULT),
        ':id' => (int) $user['id']
    ]);

    $pdo->commit();

    if (!session_regenerate_id(true)) {
        throw new RuntimeException('Session rotation failed.');
    }

    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

    authJson(200, [
        'success' => true,
        'message' => 'Password changed successfully.',
        'data' => [
            'csrf_token' => $_SESSION['csrf_token']
        ]
    ]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Password change database error: ' . $e->getMessage());

    authJson(500, [
        'success' => false,
        'message' => 'Unable to change password at this time.'
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Password change error: ' . $e->getMessage());

    authJson(500, [
        'success' => false,
        'message' => 'Unable to change password at this time.'
    ]);
}
