<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$id = $_POST['id'] ?? '';
$meta = read_meta();

if (!$id || !isset($meta[$id])) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found.']);
    exit;
}

$path = UPLOAD_DIR . '/' . $meta[$id]['storedName'];
if (file_exists($path)) {
    unlink($path);
}
unset($meta[$id]);
write_meta($meta);

echo json_encode(['ok' => true]);
