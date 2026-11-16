<?php
// No database — metadata is a single JSON file, files sit in uploads/.
// This keeps the whole thing deployable on plain PHP shared hosting (InfinityFree / page.gd)
// with nothing to configure beyond uploading the files.

define('BASE_DIR', __DIR__ . '/..');
define('UPLOAD_DIR', BASE_DIR . '/uploads');
define('META_FILE', BASE_DIR . '/data/meta.json');

// Free shared hosting (InfinityFree etc.) commonly caps upload_max_filesize around 10MB.
// Keep our own limit at or below whatever the host allows.
define('MAX_FILE_BYTES', 8 * 1024 * 1024); // 8MB — adjust down if your host's PHP limit is lower

define('ALLOWED_TTL_SECONDS', [600, 3600, 86400, 259200, 604800]); // 10m,1h,24h,3d,7d

function ensure_storage() {
    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }
    $dataDir = dirname(META_FILE);
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    if (!file_exists(META_FILE)) {
        file_put_contents(META_FILE, '{}');
    }
}

// All reads/writes go through a flock'd handle so concurrent requests
// on shared hosting don't corrupt the metadata file.
function read_meta() {
    ensure_storage();
    $fh = fopen(META_FILE, 'c+');
    flock($fh, LOCK_SH);
    $raw = stream_get_contents($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function write_meta($data) {
    ensure_storage();
    $fh = fopen(META_FILE, 'c+');
    flock($fh, LOCK_EX);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
}

// Lazy cleanup: run on every list/upload/download call instead of a cron job,
// since free hosting tiers often don't offer reliable cron.
function cleanup_expired() {
    $meta = read_meta();
    $now = time();
    $changed = false;
    foreach ($meta as $id => $record) {
        if ($record['expiresAt'] <= $now) {
            if (!empty($record['storedName'])) {
                $path = UPLOAD_DIR . '/' . $record['storedName'];
                if (file_exists($path)) {
                    unlink($path);
                }
            }
            unset($meta[$id]);
            $changed = true;
        }
    }
    if ($changed) {
        write_meta($meta);
    }
    return $meta;
}

function random_id($len = 10) {
    $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    $id = '';
    for ($i = 0; $i < $len; $i++) {
        $id .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $id;
}

function sanitize_filename($name) {
    $name = preg_replace('/[\/\\\\?%*:|"<>]/', '_', $name);
    return substr($name, 0, 200);
}

// AES-256-GCM: authenticated encryption, so a wrong passphrase fails
// decryption cleanly (auth tag mismatch) instead of returning garbage.
// The passphrase itself is never stored — only used to derive the key at
// encrypt/decrypt time — so losing it means the file is unrecoverable, by design.
function derive_key($passphrase) {
    return hash('sha256', $passphrase, true);
}

function encrypt_bytes($plaintext, $passphrase) {
    $key = derive_key($passphrase);
    $iv = random_bytes(12);
    $tag = '';
    $ciphertext = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    return [
        'ciphertext' => $ciphertext,
        'iv' => base64_encode($iv),
        'tag' => base64_encode($tag)
    ];
}

function decrypt_bytes($ciphertext, $ivB64, $tagB64, $passphrase) {
    $key = derive_key($passphrase);
    $iv = base64_decode($ivB64);
    $tag = base64_decode($tagB64);
    return openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
}
