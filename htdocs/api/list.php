<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');

$meta = cleanup_expired();

$files = array_values(array_map(function ($r) {
    return [
        'id' => $r['id'],
        'name' => $r['originalName'],
        'size' => $r['size'],
        'uploadedAt' => $r['uploadedAt'] * 1000,
        'expiresAt' => $r['expiresAt'] * 1000,
        'protected' => !empty($r['protected']),
        'type' => $r['type'] ?? 'file'
    ];
}, $meta));

usort($files, fn($a, $b) => $b['uploadedAt'] <=> $a['uploadedAt']);

echo json_encode($files);
