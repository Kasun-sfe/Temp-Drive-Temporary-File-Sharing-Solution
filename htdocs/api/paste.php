<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

cleanup_expired();

$content = isset($_POST['content']) ? trim($_POST['content']) : '';
if ($content === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Paste a link or some text first.']);
    exit;
}
if (strlen($content) > MAX_FILE_BYTES) {
    http_response_code(413);
    echo json_encode(['error' => 'That text is too long.']);
    exit;
}

$ttl = isset($_POST['ttlSeconds']) ? (int)$_POST['ttlSeconds'] : 0;
if (!in_array($ttl, ALLOWED_TTL_SECONDS, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid expiry option.']);
    exit;
}

$password = isset($_POST['password']) ? trim($_POST['password']) : '';
$protected = $password !== '';

$id = random_id();
ensure_storage();

$originalName = strlen($content) > 60 ? substr($content, 0, 60) . '…' : $content;
$storedName = random_id(12) . '.txt';
$destination = UPLOAD_DIR . '/' . $storedName;

$record = [
    'id' => $id,
    'type' => 'text',
    'originalName' => $originalName,
    'storedName' => $storedName,
    'size' => strlen($content),
    'uploadedAt' => time(),
    'expiresAt' => time() + $ttl,
    'protected' => $protected,
    'iv' => null,
    'tag' => null
];

if ($protected) {
    $enc = encrypt_bytes($content, $password);
    if (file_put_contents($destination, $enc['ciphertext']) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not save.']);
        exit;
    }
    $record['iv'] = $enc['iv'];
    $record['tag'] = $enc['tag'];
} else {
    if (file_put_contents($destination, $content) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not save.']);
        exit;
    }
}

$meta = read_meta();
$meta[$id] = $record;
write_meta($meta);

echo json_encode([
    'id' => $id,
    'name' => $record['originalName'],
    'size' => $record['size'],
    'protected' => $protected,
    'type' => 'text',
    'expiresAt' => $record['expiresAt'] * 1000
]);
