
<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth_api.php';

authMethod('POST');
$data = authInput();

$email = authEmail((string) ($data['email'] ?? ''));

$genericResponse = [
    'success' => true,
    'message' => 'If an eligible account exists, password reset instructions will be sent.'
];

try {
    $pdo = authDb();

    $stmt = $pdo->prepare(
        'SELECT id, email, full_name
         FROM users
         WHERE email = :email AND status = :status
         LIMIT 1'
    );

    $stmt->execute([
        ':email' => $email,
        ':status' => 'active'
    ]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expires = (new DateTimeImmutable('+30 minutes'))
            ->format('Y-m-d H:i:s');

        $pdo->beginTransaction();

        $invalidate = $pdo->prepare(
            'UPDATE password_resets
             SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = :user_id AND used_at IS NULL'
        );
        $invalidate->execute([':user_id' => (int) $user['id']]);

        $insert = $pdo->prepare(
            'INSERT INTO password_resets
                (user_id, token_hash, expires_at, created_at)
             VALUES
                (:user_id, :token_hash, :expires_at, CURRENT_TIMESTAMP)'
        );

        $insert->execute([
            ':user_id' => (int) $user['id'],
            ':token_hash' => $tokenHash,
            ':expires_at' => $expires
        ]);

        $pdo->commit();

        /*
         * REQUIRED INTEGRATION:
         * Implement sendPasswordResetEmail() in your mail service.
         * It must send a reset URL over HTTPS containing $token.
         * Never log or persist the raw token.
         *
         * Do not enable this endpoint in production until the mail
         * service is configured and tested.
         */
        if (!function_exists('sendPasswordResetEmail')) {
            error_log('Password reset mail service is not configured.');
        } else {
            $resetUrl = rtrim(
                (string) (defined('APP_URL') ? APP_URL : ''),
                '/'
            ) . '/reset-password.html?token=' . rawurlencode($token);

            try {
                sendPasswordResetEmail(
                    (string) $user['email'],
                    (string) $user['full_name'],
                    $resetUrl
                );
            } catch (Throwable $mailError) {
                error_log(
                    'Password reset email delivery failed: ' .
                    $mailError->getMessage()
                );
            }
        }
    }

    authJson(200, $genericResponse);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Forgot-password database error: ' . $e->getMessage());

    authJson(500, [
        'success' => false,
        'message' => 'Unable to process the request at this time.'
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Forgot-password error: ' . $e->getMessage());

    authJson(500, [
        'success' => false,
        'message' => 'Unable to process the request at this time.'
    ]);
}
