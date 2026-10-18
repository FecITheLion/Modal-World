<?php
declare(strict_types=1);
require_once __DIR__ . '/lib.php';
start_app_session();

$csrf = $_POST['_csrf'] ?? null;
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !is_string($csrf) || !verify_csrf($csrf)) {
    http_response_code(403);
    exit('Invalid session token. Return to the app and try again.');
}

$action = $_POST['action'] ?? '';
$challenge = is_string($_POST['challenge'] ?? null) ? $_POST['challenge'] : '';
$username = is_string($_POST['username'] ?? null) ? $_POST['username'] : '';
$password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';

if ($action === 'register') {
    $result = register_user($username, $password);
    if (!is_array($result)) {
        header('Location: /?notice=' . rawurlencode($result) . ($challenge !== '' ? '&challenge=' . rawurlencode($challenge) : ''));
        exit;
    }
    $user = $result;
} elseif ($action === 'login') {
    $user = sign_in($username, $password);
    if (!$user) {
        header('Location: /?notice=' . rawurlencode('Username or password did not match.') . ($challenge !== '' ? '&challenge=' . rawurlencode($challenge) : ''));
        exit;
    }
} else {
    header('Location: /' . ($challenge !== '' ? '?challenge=' . rawurlencode($challenge) : ''));
    exit;
}

session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];
csrf_token();
header('Location: /');
exit;
