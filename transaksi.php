<?php
header('Content-Type: application/json');
require_once "koneksi.php";

// =========================
// PARSE JSON REQUEST
// =========================
$rawInput = file_get_contents("php://input");
if (!empty($rawInput)) {
    $jsonData = json_decode($rawInput, true);
    if (is_array($jsonData)) {
        $_POST = array_merge($_POST, $jsonData);
    }
}

// =========================
// HELPER FUNCTIONS
// =========================
function validateInput($data, $required) {
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            throw new Exception("$field wajib diisi");
        }
    }
    return true;
}

function sanitizeNumber($value) {
    return floatval(str_replace(',', '', $value));
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$response = ["success" => false, "message" => "Invalid action"];

try {
    switch ($action) {
        // =========================
        // SIMPAN INVOICE
        // =========================
        case "simpan_invoice":
            validateInput($_POST, ['no_invoice', 'tanggal', 'total']);

            $no_invoice  = $_POST['no_invoice'];
            $tanggal     = $_POST['tanggal'];
            $customer_id = !empty($_POST['customer_id']) ? intval($_POST['customer_id']) : null;
            // ENUM di DB: reguler, dp, pelunasan
            $jenis       = ($_POST['jenis'] ?? 'reguler');
            if ($jenis === 'regular') $jenis = 'reguler'; // koreksi agar sesuai DB
            $total       = sanitizeNumber($_POST['total']);
            $dp          = sanitizeNumber($_POST['dp'] ?? 0);
            $status      = $_POST['status'] ?? 'Belum Lunas';
            $items       = isset($_POST['items']) ? (is_array($_POST['items']) ? $_POST['items'] : json_decode($_POST['items'], true)) : [];

            if ($total <= 0) throw new Exception("Total invoice harus lebih dari 0");
            if ($dp > $total) throw new Exception("DP tidak boleh lebih besar dari total");

            $pdo->beginTransaction();

            // Simpan ke invoices
            $stmt = $pdo->prepare("INSERT INTO invoices 
                (no_invoice, tanggal, customer_id, jenis, total, dp, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$no_invoice, $tanggal, $customer_id, $jenis, $total, $dp, $status]);
            $invoice_id = $pdo->lastInsertId();

            // Simpan ke invoice_items
            if (!empty($items)) {
                $stmtItem = $pdo->prepare("INSERT INTO invoice_items 
                    (invoice_id, description, qty, price) 
                    VALUES (?, ?, ?, ?)");
                
                foreach ($items as $it) {
                    $desc  = $it['description'] ?? '';
                    $qty   = max(1, intval($it['qty'] ?? 1));
                    $price = sanitizeNumber($it['price'] ?? 0);

                    if ($price < 0) throw new Exception("Harga tidak boleh negatif");

                    $stmtItem->execute([$invoice_id, $desc, $qty, $price]);
                }
            }

            $pdo->commit();
            $response = [
                "success"    => true,
                "message"    => "Invoice berhasil disimpan",
                "invoice_id" => $invoice_id
            ];
            break;

        // =========================
        // AMBIL SEMUA INVOICE
        // =========================
        case "get_invoices":
            $page   = isset($_GET['page']) ? intval($_GET['page']) : 1;
            $limit  = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
            $offset = ($page - 1) * $limit;

            $stmt = $pdo->prepare("
                SELECT i.*, c.nama as customer_name 
                FROM invoices i 
                LEFT JOIN customers c ON i.customer_id = c.id 
                ORDER BY i.created_at DESC 
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $countStmt = $pdo->query("SELECT COUNT(*) FROM invoices");
            $total = $countStmt->fetchColumn();

            $response = [
                "success" => true,
                "data"    => $data,
                "pagination" => [
                    "page"        => $page,
                    "limit"       => $limit,
                    "total"       => $total,
                    "total_pages" => ceil($total / $limit)
                ]
            ];
            break;

        // =========================
        // AMBIL DETAIL INVOICE
        // =========================
        case "get_invoice":
            $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
            if ($id <= 0) throw new Exception("ID invoice tidak valid");

            $stmt = $pdo->prepare("
                SELECT i.*, c.nama as customer_name 
                FROM invoices i 
                LEFT JOIN customers c ON i.customer_id = c.id 
                WHERE i.id = ?
            ");
            $stmt->execute([$id]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($invoice) {
                $stmtItems = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC");
                $stmtItems->execute([$id]);
                $invoice['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

                $response = ["success" => true, "data" => $invoice];
            } else {
                throw new Exception("Invoice tidak ditemukan");
            }
            break;

        // =========================
        // SIMPAN TRANSAKSI UMUM
        // =========================
        case "simpan_transaksi":
            validateInput($_POST, ['tanggal', 'description']);

            $user_id = !empty($_POST['user_id']) ? intval($_POST['user_id']) : null;
            $tanggal = $_POST['tanggal'];
            $desc    = $_POST['description'];
            $debit   = sanitizeNumber($_POST['debit'] ?? 0);
            $credit  = sanitizeNumber($_POST['credit'] ?? 0);

            if ($debit <= 0 && $credit <= 0) {
                throw new Exception("Salah satu debit atau credit harus lebih dari 0");
            }

            $stmt = $pdo->prepare("
                INSERT INTO transactions (user_id, transaction_date, description, debit, credit) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$user_id, $tanggal, $desc, $debit, $credit]);

            $response = [
                "success"        => true,
                "message"        => "Transaksi berhasil disimpan",
                "transaction_id" => $pdo->lastInsertId()
            ];
            break;

        // =========================
        // AMBIL SEMUA TRANSAKSI
        // =========================
        case "get_transaksi":
            $page   = isset($_GET['page']) ? intval($_GET['page']) : 1;
            $limit  = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
            $offset = ($page - 1) * $limit;

            $stmt = $pdo->prepare("
                SELECT t.*, u.username 
                FROM transactions t 
                LEFT JOIN users u ON t.user_id = u.id 
                ORDER BY t.created_at DESC 
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $countStmt = $pdo->query("SELECT COUNT(*) FROM transactions");
            $total = $countStmt->fetchColumn();

            $response = [
                "success" => true,
                "data"    => $data,
                "pagination" => [
                    "page"        => $page,
                    "limit"       => $limit,
                    "total"       => $total,
                    "total_pages" => ceil($total / $limit)
                ]
            ];
            break;

        default:
            throw new Exception("Action tidak dikenal");
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $response = ["success" => false, "message" => "Database error: " . $e->getMessage()];
} catch (Exception $e) {
    $response = ["success" => false, "message" => $e->getMessage()];
}

echo json_encode($response, JSON_PRETTY_PRINT);
