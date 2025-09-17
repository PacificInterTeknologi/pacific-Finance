<?php
session_start();
include "config.php";
if (!isset($_SESSION["user_id"])) { 
    header("Location: index.php"); 
    exit; 
}

// Fungsi format rupiah
function rupiah($angka) {
    return "Rp " . number_format((float)$angka, 0, ",", ".");
}

// Inisialisasi variabel filter
$tanggal_awal = $_GET['tanggal_awal'] ?? date('Y-m-01');
$tanggal_akhir = $_GET['tanggal_akhir'] ?? date('Y-m-t');
$cari = $_GET['cari'] ?? '';

// Query dasar
$query = "SELECT * FROM transaksi WHERE 1=1";
$params = [];

// Filter tanggal
if (!empty($tanggal_awal) && !empty($tanggal_akhir)) {
    $query .= " AND tanggal BETWEEN ? AND ?";
    $params[] = $tanggal_awal;
    $params[] = $tanggal_akhir;
}

// Filter pencarian
if (!empty($cari)) {
    $query .= " AND (deskripsi LIKE ? OR debit LIKE ? OR kredit LIKE ?)";
    $search_term = "%$cari%";
    $params[] = $search_term;
    $params[] = $search_term;
    $params[] = $search_term;
}

$query .= " ORDER BY tanggal DESC, id DESC";

// Eksekusi query
$stmt = $pdo->prepare($query);
$stmt->execute($params);
$transaksi = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Hitung total
$total_debit = 0;
$total_kredit = 0;
foreach ($transaksi as $t) {
    $total_debit += $t['nominal'];
    $total_kredit += $t['nominal'];
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Transaksi - PACIFIC PRO</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg">
  <header class="topbar">
    <div class="brand">PACIFIC PRO</div>
    <nav class="nav">
      <a href="dashboard.php">Dashboard</a>
      <a href="transaksi.php">Input Transaksi</a>
      <a href="laporan.php" class="active">Laporan</a>
      <a href="logout.php" class="danger">Logout</a>
    </nav>
  </header>
  
  <main class="container">
    <div class="card">
      <div class="card-header">
        <h2>Laporan Transaksi</h2>
        <div class="actions">
          <a href="transaksi.php" class="btn btn-sm btn-primary">
            <i class="fas fa-plus"></i> Tambah Transaksi
          </a>
        </div>
      </div>
      
      <!-- Filter Section -->
      <div class="filter-section">
        <form method="get" class="filter-form">
          <div class="filter-group">
            <label for="tanggal_awal">Tanggal Awal</label>
            <input type="date" id="tanggal_awal" name="tanggal_awal" 
                   value="<?php echo htmlspecialchars($tanggal_awal); ?>" class="form-control">
          </div>
          
          <div class="filter-group">
            <label for="tanggal_akhir">Tanggal Akhir</label>
            <input type="date" id="tanggal_akhir" name="tanggal_akhir" 
                   value="<?php echo htmlspecialchars($tanggal_akhir); ?>" class="form-control">
          </div>
          
          <div class="filter-group">
            <label for="cari">Cari</label>
            <div class="search-box">
              <input type="text" id="cari" name="cari" 
                     placeholder="Deskripsi, Debit, Kredit..." 
                     value="<?php echo htmlspecialchars($cari); ?>" class="form-control">
              <button type="submit" class="btn btn-sm btn-primary">
                <i class="fas fa-search"></i>
              </button>
            </div>
          </div>
          
          <div class="filter-group filter-actions">
            <button type="submit" class="btn btn-sm btn-primary">Filter</button>
            <a href="laporan.php" class="btn btn-sm btn-secondary">Reset</a>
          </div>
        </form>
      </div>
      
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="icon">
            <i class="fas fa-list"></i>
          </div>
          <div class="value"><?php echo count($transaksi); ?></div>
          <div class="label">Total Transaksi</div>
        </div>
        
        <div class="summary-card">
          <div class="icon">
            <i class="fas fa-arrow-up"></i>
          </div>
          <div class="value"><?php echo rupiah($total_debit); ?></div>
          <div class="label">Total Debit</div>
        </div>
        
        <div class="summary-card">
          <div class="icon">
            <i class="fas fa-arrow-down"></i>
          </div>
          <div class="value"><?php echo rupiah($total_kredit); ?></div>
          <div class="label">Total Kredit</div>
        </div>
      </div>
      
      <!-- Table Section -->
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Deskripsi</th>
              <th>Debit</th>
              <th>Kredit</th>
              <th class="right">Nominal</th>
              <th class="center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <?php if (count($transaksi) > 0): ?>
              <?php $no = 1; foreach ($transaksi as $t): ?>
              <tr>
                <td><?php echo $no++; ?></td>
                <td><?php echo htmlspecialchars(date('d/m/Y', strtotime($t["tanggal"]))); ?></td>
                <td><?php echo htmlspecialchars($t["deskripsi"]); ?></td>
                <td><?php echo htmlspecialchars($t["debit"]); ?></td>
                <td><?php echo htmlspecialchars($t["kredit"]); ?></td>
                <td class="right"><?php echo rupiah($t["nominal"]); ?></td>
                <td class="center">
                  <div class="action-buttons">
                    <button class="btn-icon btn-edit" title="Edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" title="Hapus">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <?php endforeach; ?>
            <?php else: ?>
              <tr>
                <td colspan="7" class="empty">
                  <i class="fas fa-inbox"></i>
                  <p>Tidak ada data transaksi</p>
                  <p>Silakan tambahkan transaksi terlebih dahulu</p>
                </td>
              </tr>
            <?php endif; ?>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="right"><strong>TOTAL</strong></td>
              <td class="right"><strong><?php echo rupiah($total_debit); ?></strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <!-- Export Buttons -->
      <div class="export-section">
        <button class="btn btn-success btn-sm">
          <i class="fas fa-file-excel"></i> Export Excel
        </button>
        <button class="btn btn-danger btn-sm">
          <i class="fas fa-file-pdf"></i> Export PDF
        </button>
        <button class="btn btn-secondary btn-sm">
          <i class="fas fa-print"></i> Cetak
        </button>
      </div>
    </div>
  </main>
  
  <!-- Delete Confirmation Modal -->
  <div id="deleteModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Konfirmasi Hapus</h3>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <p>Apakah Anda yakin ingin menghapus transaksi ini?</p>
        <p class="warning">Tindakan ini tidak dapat dibatalkan!</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-danger" id="confirmDelete">Hapus</button>
        <button class="btn btn-secondary" id="cancelDelete">Batal</button>
      </div>
    </div>
  </div>
  
  <script>
    // Delete confirmation modal
    const deleteModal = document.getElementById('deleteModal');
    const deleteButtons = document.querySelectorAll('.btn-delete');
    const closeModal = document.querySelector('.close');
    const cancelDelete = document.getElementById('cancelDelete');
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', () => {
        deleteModal.style.display = 'block';
      });
    });
    
    closeModal.addEventListener('click', () => {
      deleteModal.style.display = 'none';
    });
    
    cancelDelete.addEventListener('click', () => {
      deleteModal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
      if (event.target === deleteModal) {
        deleteModal.style.display = 'none';
      }
    });
    
    // Print functionality
    document.querySelector('.fa-print').parentElement.addEventListener('click', () => {
      window.print();
    });
  </script>
</body>
</html> 