<?php
declare(strict_types=1);

define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('APP_DEBUG', APP_ENV !== 'production');

define(
    'SESSION_NAME',
    getenv('SESSION_NAME') ?: 'medical_session'
);

define(
    'APP_TIMEZONE',
    getenv('APP_TIMEZONE') ?: 'UTC'
);

date_default_timezone_set(APP_TIMEZONE);