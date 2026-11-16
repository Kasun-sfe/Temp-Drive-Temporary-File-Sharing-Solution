<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');

$id = $_REQUEST['id'] ?? '';
$password = $_REQUEST['password'] ?? '';
$meta = cleanup_expired();

function text_error($code, $msg, $extra = []) {
    http_response_code($code);
    echo json_encode(array_merge(['error' => $msg], $extra));
    exit;
}

if (!$id || !isset($meta[$id]) || ($meta[$id]['type'] ?? 'file') !== 'text') {
    text_error(404, 'Not found or expired.');
}

$record = $meta[$id];

if (!empty($record['protected'])) {
    if ($password === '') {
        text_error(401, 'Password required.', ['requiresPassword' => true]);
    }
    $ciphertext = base64_decode($record['content']);
    $plaintext = decrypt_bytes($ciphertext, $record['iv'], $record['tag'], $password);
    if ($plaintext === false) {
        text_error(401, 'Incorrect password.', ['requiresPassword' => true]);
    }
    echo json_encode(['content' => $plaintext]);
    exit;
}

echo json_encode(['content' => base64_decode($record['content'])]);
