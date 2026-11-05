<?php
declare(strict_types=1);

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validation.php';
require_once __DIR__ . '/../../controllers/PatientController.php';

requireMethod('DELETE');

try {
    $id = requirePositiveId($_GET['id'] ?? null);
    (new PatientController())->destroy($id);
} catch (Throwable $e) {
    error_log('[patients.delete] ' . $e->getMessage());

    apiError(500, 'INTERNAL_ERROR', 'Unable to deactivate the patient.');
}