<?php
// Konfigurasi Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'pacific_pro');
define('DB_USER', 'root');     // Ganti sesuai user MySQL Anda
define('DB_PASS', '');         // Ganti sesuai password MySQL Anda

// Opsi PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::ATTR_CHARSET            => 'utf8mb4'
];

// Buat koneksi PDO
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} 
catch (PDOException $e) {
    // Hanya tampilkan error di lingkungan development
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
        die("Koneksi database gagal: " . $e->getMessage());
    } else {
        // Log error untuk produksi
        error_log("Database Error: " . $e->getMessage());
        die("Terjadi kesalahan sistem. Silakan coba lagi nanti.");
    }
}
?>