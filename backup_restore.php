<?php
// Error reporting untuk debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Header untuk response
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

// Tingkatkan limit untuk backup besar
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);

require_once "koneksi.php";

// Cek koneksi database
if (!$pdo) {
    die(json_encode([
        "success" => false,
        "message" => "Koneksi database gagal"
    ]));
}

// =========================
// PARSE REQUEST
// =========================
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// =========================
// BACKUP
// =========================
if ($action === "backup") {
    try {
        $backup = [];
        
        // Daftar tabel yang mau di-backup
        $tables = ["users", "customers", "accounts", "transactions", "invoices", "invoice_items", "journal", "salary"];
        
        // Cek keberadaan tabel
        foreach ($tables as $tbl) {
            $stmt = $pdo->query("SHOW TABLES LIKE '$tbl'");
            if ($stmt->rowCount() == 0) {
                throw new Exception("Tabel '$tbl' tidak ditemukan");
            }
        }
        
        // Backup data setiap tabel
        foreach ($tables as $tbl) {
            $stmt = $pdo->query("SELECT * FROM $tbl");
            $backup[$tbl] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        echo json_encode([
            "success" => true,
            "message" => "Backup berhasil",
            "data" => $backup,
            "timestamp" => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Backup gagal: " . $e->getMessage(),
            "timestamp" => date('Y-m-d H:i:s')
        ]);
    }
    exit;
}

// =========================
// RESTORE
// =========================
if ($action === "restore") {
    try {
        if (empty($_FILES['file']['tmp_name'])) {
            throw new Exception("File JSON tidak ditemukan");
        }
        
        // Validasi file
        $fileError = $_FILES['file']['error'];
        if ($fileError !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE => "Ukuran file melebihi batas maksimum",
                UPLOAD_ERR_FORM_SIZE => "Ukuran file melebihi batas form",
                UPLOAD_ERR_PARTIAL => "File hanya terupload sebagian",
                UPLOAD_ERR_NO_FILE => "Tidak ada file yang diupload",
                UPLOAD_ERR_NO_TMP_DIR => "Folder temporary tidak ditemukan",
                UPLOAD_ERR_CANT_WRITE => "Gagal menulis file ke disk",
                UPLOAD_ERR_EXTENSION => "Upload dihentikan oleh extension"
            ];
            throw new Exception($errors[$fileError] ?? "Error upload file");
        }
        
        // Baca file
        $json = file_get_contents($_FILES['file']['tmp_name']);
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Format JSON tidak valid: " . json_last_error_msg());
        }
        
        if (!is_array($data)) {
            throw new Exception("Struktur data harus berupa array");
        }
        
        // Validasi tabel
        $validTables = ["users", "customers", "accounts", "transactions", "invoices", "invoice_items", "journal", "salary"];
        foreach (array_keys($data) as $tbl) {
            if (!in_array($tbl, $validTables)) {
                throw new Exception("Tabel '$tbl' tidak valid");
            }
        }
        
        // Mulai transaksi
        $pdo->beginTransaction();
        
        try {
            // Hapus data lama
            foreach (array_keys($data) as $tbl) {
                $pdo->exec("DELETE FROM $tbl");
            }
            
            // Insert data baru
            foreach ($data as $tbl => $rows) {
                if (empty($rows)) continue;
                
                $columns = array_keys($rows[0]);
                $colList = implode(",", $columns);
                $placeholders = implode(",", array_fill(0, count($columns), "?"));
                
                $stmt = $pdo->prepare("INSERT INTO $tbl ($colList) VALUES ($placeholders)");
                
                foreach ($rows as $row) {
                    $stmt->execute(array_values($row));
                }
            }
            
            $pdo->commit();
            
            echo json_encode([
                "success" => true,
                "message" => "Restore berhasil",
                "timestamp" => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Restore gagal: " . $e->getMessage(),
            "timestamp" => date('Y-m-d H:i:s')
        ]);
    }
    exit;
}

// =========================
// ACTION TIDAK DIKENAL
// =========================
http_response_code(400);
echo json_encode([
    "success" => false,
    "message" => "Action tidak dikenal: " . htmlspecialchars($action),
    "timestamp" => date('Y-m-d H:i:s')
]);
?>