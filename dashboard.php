<?php
// Inisialisasi session dan verifikasi autentikasi
session_start();
if (!isset($_SESSION["user_id"])) {
    header("Location: index.php");
    exit;
}

// Set header untuk keamanan
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Dashboard - PACIFIC PRO</title>
    <link rel="stylesheet" href="style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg">
    <!-- Header Navigasi -->
    <header class="topbar">
        <div class="brand">PACIFIC PRO</div>
        <nav class="nav">
            <a href="dashboard.php" class="active">Dashboard</a>
            <a href="transaksi.php">Input Transaksi</a>
            <a href="laporan.php">Laporan</a>
            <a href="logout.php" class="danger">Logout</a>
        </nav>
    </header>

    <!-- Konten Utama -->
    <main class="container">
        <div class="card">
            <h1>Selamat datang, <span class="username"><?php echo htmlspecialchars($_SESSION["username"], ENT_QUOTES, 'UTF-8'); ?></span> 👋</h1>
            <p>Gunakan menu di atas untuk mulai input transaksi atau melihat laporan.</p>
            
            <!-- Kartu Informasi Tambahan -->
            <div class="info-cards">
                <div class="info-card">
                    <h3>Transaksi Hari Ini</h3>
                    <p class="number">0</p>
                </div>
                <div class="info-card">
                    <h3>Total Transaksi</h3>
                    <p class="number">0</p>
                </div>
                <div class="info-card">
                    <h3>Pendapatan Bulan Ini</h3>
                    <p class="number">Rp 0</p>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <p>&copy; <?php echo date('Y'); ?> PACIFIC PRO. All rights reserved.</p>
    </footer>
</body>
</html>