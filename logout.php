<?php
declare(strict_types=1);
require_once __DIR__ . '/lib.php';
start_app_session();
$csrf = $_POST['_csrf'] ?? null;
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !is_string($csrf) || !verify_csrf($csrf)) {
    http_response_code(403);
    exit('Invalid session token.');
}
$_SESSION = [];
session_destroy();
header('Location: /');
exit;
