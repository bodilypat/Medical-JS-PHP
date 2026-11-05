
<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth_api.php';

authMethod('POST');
$admin = authRequireRole(['admin']);
authVerifyCsrf();

$data = authInput();

$name = trim((string) ($data['full_name'] ?? ''));
$email = authEmail((string) ($data['email'] ?? ''));
$password = $data['password'] ?? '';
$role = strtolower(trim((string) ($data['role'] ?? '')));

$allowedRoles = [
    'admin',
    'doctor',
    'nurse',
    'receptionist',
    'pharmacist',
    'lab_technician',
    'billing_staff'
];

$errors = [];

if ($name === '' || mb_strlen($name) > 150) {
    $errors['full_name'] = 'Name is required (maximum 150 characters).';
}

if (!is_string($password) ||
    strlen($password) < 15 ||
    strlen($password) > 1024) {
    $errors['password'] =
        'Password must be at least 15 characters and no more than 1024 bytes.';
}

if (!in_array($role, $allowedRoles, true)) {
    $errors['role'] = 'Select an allowed staff role.';
}

if ($errors) {
    authJson(422, [
        'success' => false,
        'message' => 'Validation failed.',
        'errors' => $errors
    ]);
}

try {
    $pdo = authDb();

    $stmt = $pdo->prepare(
        'INSERT INTO users
            (full_name, email, password_hash, role, status, created_at)
         VALUES
            (:name, :email, :password_hash, :role, :status, CURRENT_TIMESTAMP)'
    );

    $stmt->execute([
        ':name' => $name,
        ':email' => $email,
        ':password_hash' => password_hash(
            $password,
            PASSWORD_DEFAULT
        ),
        ':role' => $role,
        ':status' => 'active'
    ]);

    $id = (int) $pdo->lastInsertId();

    authJson(201, [
        'success' => true,
        'message' => 'Staff account created successfully.',
        'data' => [
            'id' => $id,
            'full_name' => $name,
            'email' => $email,
            'role' => $role
        ]
    ]);
} catch (PDOException $e) {
    error_log('Auth registration database error: ' . $e->getMessage());

    if ($e->getCode() === '23000') {
        authJson(409, [
            'success' => false,
            'message' => 'An account with this email may already exist.'
        ]);
    }

    authJson(500, [
        'success' => false,
        'message' => 'Unable to create account at this time.'
    ]);
} catch (Throwable $e) {
    error_log('Auth registration error: ' . $e->getMessage());

    authJson(500, [
        'success' => false,
        'message' => 'Unable to create account at this time.'
    ]);
}
