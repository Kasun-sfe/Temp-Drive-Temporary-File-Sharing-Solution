<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

cleanup_expired();

$ttl = isset($_POST['ttlSeconds']) ? (int)$_POST['ttlSeconds'] : 0;
if (!in_array($ttl, ALLOWED_TTL_SECONDS, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid expiry option.']);
    exit;
}

$password = isset($_POST['password']) ? trim($_POST['password']) : '';
$protected = $password !== '';
$linkText = isset($_POST['linkText']) ? trim($_POST['linkText']) : '';
$hasFile = isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK;

if (!$hasFile && $linkText === '') {
    // Give a clearer error if a file was attempted but failed, vs nothing provided at all.
    if (isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
        $code = $_FILES['file']['error'];
        $msg = ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE)
            ? 'File too large for this server\'s upload limit.'
            : 'Could not read the uploaded file.';
        http_response_code(400);
        echo json_encode(['error' => $msg]);
        exit;
    }
    http_response_code(400);
    echo json_encode(['error' => 'Choose a file or paste a link/text.']);
    exit;
}

$id = random_id();
ensure_storage();

if ($linkText !== '') {
    // Text/link entry — no real file involved, stored as plain (or encrypted) text.
    if (strlen($linkText) > MAX_FILE_BYTES) {
        http_response_code(413);
        echo json_encode(['error' => 'That text is too long.']);
        exit;
    }
    $originalName = strlen($linkText) > 60 ? substr($linkText, 0, 60) . '…' : $linkText;
    $storedName = random_id(12) . '.txt';
    $destination = UPLOAD_DIR . '/' . $storedName;
    $size = strlen($linkText);

    $record = [
        'id' => $id,
        'type' => 'text',
        'originalName' => $originalName,
        'storedName' => $storedName,
        'size' => $size,
        'uploadedAt' => time(),
        'expiresAt' => time() + $ttl,
        'protected' => $protected,
        'iv' => null,
        'tag' => null
    ];

    if ($protected) {
        $enc = encrypt_bytes($linkText, $password);
        if (file_put_contents($destination, $enc['ciphertext']) === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Could not save.']);
            exit;
        }
        $record['iv'] = $enc['iv'];
        $record['tag'] = $enc['tag'];
    } else {
        if (file_put_contents($destination, $linkText) === false) {
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
        'name' => $originalName,
        'size' => $size,
        'protected' => $protected,
        'type' => 'text',
        'expiresAt' => ($meta[$id]['expiresAt']) * 1000
    ]);
    exit;
}

// --- regular file upload ---

$file = $_FILES['file'];

if ($file['size'] > MAX_FILE_BYTES) {
    http_response_code(413);
    echo json_encode(['error' => 'File too large. Limit is ' . round(MAX_FILE_BYTES / 1024 / 1024) . 'MB.']);
    exit;
}

$originalName = sanitize_filename($file['name']);
$ext = pathinfo($originalName, PATHINFO_EXTENSION);
$storedName = random_id(12) . ($ext ? '.' . preg_replace('/[^a-zA-Z0-9]/', '', $ext) : '');
$destination = UPLOAD_DIR . '/' . $storedName;

$record = [
    'id' => $id,
    'type' => 'file',
    'originalName' => $originalName,
    'storedName' => $storedName,
    'size' => $file['size'],
    'uploadedAt' => time(),
    'expiresAt' => time() + $ttl,
    'protected' => $protected,
    'iv' => null,
    'tag' => null
];

if ($protected) {
    $plaintext = file_get_contents($file['tmp_name']);
    if ($plaintext === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not read the uploaded file.']);
        exit;
    }
    $enc = encrypt_bytes($plaintext, $password);
    if (file_put_contents($destination, $enc['ciphertext']) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not save the uploaded file.']);
        exit;
    }
    $record['iv'] = $enc['iv'];
    $record['tag'] = $enc['tag'];
} else {
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not save the uploaded file.']);
        exit;
    }
}

$meta = read_meta();
$meta[$id] = $record;
write_meta($meta);

echo json_encode([
    'id' => $id,
    'name' => $originalName,
    'size' => $file['size'],
    'protected' => $protected,
    'type' => 'file',
    'expiresAt' => ($meta[$id]['expiresAt']) * 1000
]);
