<?php
require_once __DIR__ . '/config.php';

$id = $_REQUEST['id'] ?? '';
$password = $_REQUEST['password'] ?? '';
$meta = cleanup_expired();

function json_error($code, $msg, $extra = []) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(array_merge(['error' => $msg], $extra));
    exit;
}

if (!$id || !isset($meta[$id])) {
    json_error(404, 'File not found or expired.');
}

$record = $meta[$id];
$path = UPLOAD_DIR . '/' . $record['storedName'];
$type = $record['type'] ?? 'file';

if (!file_exists($path)) {
    json_error(404, 'File not found on disk.');
}

if (!empty($record['protected']) && $password === '') {
    json_error(401, 'Password required.', ['requiresPassword' => true]);
}

if ($type === 'text') {
    // Text/link entries are always returned as JSON, never as a file download.
    if (!empty($record['protected'])) {
        $ciphertext = file_get_contents($path);
        $plaintext = decrypt_bytes($ciphertext, $record['iv'], $record['tag'], $password);
        if ($plaintext === false) {
            json_error(401, 'Incorrect password.', ['requiresPassword' => true]);
        }
    } else {
        $plaintext = file_get_contents($path);
    }
    header('Content-Type: application/json');
    echo json_encode(['content' => $plaintext]);
    exit;
}

if (!empty($record['protected'])) {
    $ciphertext = file_get_contents($path);
    $plaintext = decrypt_bytes($ciphertext, $record['iv'], $record['tag'], $password);
    if ($plaintext === false) {
        json_error(401, 'Incorrect password.', ['requiresPassword' => true]);
    }
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . addslashes($record['originalName']) . '"');
    header('Content-Length: ' . strlen($plaintext));
    header('X-Content-Type-Options: nosniff');
    echo $plaintext;
    exit;
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . addslashes($record['originalName']) . '"');
header('Content-Length: ' . filesize($path));
header('X-Content-Type-Options: nosniff');
readfile($path);
