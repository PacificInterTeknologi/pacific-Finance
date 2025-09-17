<?php
// =============================
// Koneksi ke Database MySQL
// =============================

$host = "localhost";       // server database (biasanya localhost)
$user = "root";            // username MySQL
$pass = "";                // password MySQL
$db   = "pacific_pro";     // nama database sesuai database.sql yang sudah diimport

// Membuat koneksi
$conn = new mysqli($host, $user, $pass, $db);

// Cek koneksi
if ($conn->connect_error) {
    die(json_encode([
        "success" => false,
        "message" => "Koneksi gagal: " . $conn->connect_error
    ]));
}

// Jika berhasil
// echo json_encode(["success" => true, "message" => "Koneksi berhasil"]); 
// (opsional, bisa diaktifkan untuk testing)
?>
