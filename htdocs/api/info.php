<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');

$id = $_GET['id'] ?? '';
$meta = cleanup_expired();

if (!$id || !isset($meta[$id])) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found or expired.']);
    exit;
}

$r = $meta[$id];
echo json_encode([
    'id' => $r['id'],
    'name' => $r['originalName'],
    'size' => $r['size'],
    'expiresAt' => $r['expiresAt'] * 1000,
    'protected' => !empty($r['protected']),
    'type' => $r['type'] ?? 'file'
]);
