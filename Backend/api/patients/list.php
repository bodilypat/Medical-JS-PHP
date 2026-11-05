<?php
declare(strict_types=1);

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validation.php';
require_once __DIR__ . '/../../controllers/PatientController.php';

requireMethod('GET');

try {
    (new PatientController())->index();
} catch (Throwable $e) {
    error_log('[patients.list] ' . $e->getMessage());

    apiError(500, 'INTERNAL_ERROR', 'Unable to load patients.');
}