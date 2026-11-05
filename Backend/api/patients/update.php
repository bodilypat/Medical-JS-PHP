<?php
declare(strict_types=1);

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validation.php';
require_once __DIR__ . '/../../controllers/PatientController.php';

requireMethod('PUT');

try {
    $id = requirePositiveId($_GET['id'] ?? null);
    (new PatientController())->update($id);
} catch (Throwable $e) {
    error_log('[patients.update] ' . $e->getMessage());

    apiError(500, 'INTERNAL_ERROR', 'Unable to update the patient.');
}