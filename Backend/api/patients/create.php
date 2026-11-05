<?php
declare(strict_types=1);

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../controllers/PatientController.php';

requireMethod('POST');

try {
    (new PatientController())->store();
} catch (Throwable $e) {
    error_log('[patients.create] ' . $e->getMessage());

    apiError(
        500,
        'INTERNAL_ERROR',
        'Unable to register the patient.'
    );
}