<?php
declare(strict_types=1);

date_default_timezone_set('UTC');

const APP_NAME = 'Orbital Relics';
const CURRENCY = 'USD';
const STARTING_CREDITS = 30;
const CREDITS_PER_SALE = 12;

$dataDirectory = getenv('ORBITAL_DATA_DIR') ?: __DIR__ . '/data';
if (!is_dir($dataDirectory) && !mkdir($dataDirectory, 0750, true) && !is_dir($dataDirectory)) {
    throw new RuntimeException('The application data directory could not be created.');
}

define('DATABASE_FILE', $dataDirectory . '/orbital-relics.sqlite');
define('PAYPAL_CLIENT_ID', getenv('PAYPAL_CLIENT_ID') ?: '');
define('PAYPAL_CLIENT_SECRET', getenv('PAYPAL_CLIENT_SECRET') ?: '');
define('PAYPAL_MODE', getenv('PAYPAL_MODE') ?: 'sandbox');
