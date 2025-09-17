<?php
// Inisialisasi session dengan pengaturan keamanan
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'cookie_samesite' => 'Strict'
]);

// Include konfigurasi database
require_once "config.php";

// Proteksi brute force - batasi percobaan login
$max_attempts = 5;
$lockout_time = 300; // 5 menit dalam detik

if (!isset($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = 0;
    $_SESSION['last_attempt_time'] = time();
}

// Cek apakah user terkunci karena terlalu banyak percobaan
if ($_SESSION['login_attempts'] >= $max_attempts) {
    $time_since_last_attempt = time() - $_SESSION['last_attempt_time'];
    if ($time_since_last_attempt < $lockout_time) {
        $remaining_time = $lockout_time - $time_since_last_attempt;
        die("Terlalu banyak percobaan login. Silakan coba lagi dalam " . ceil($remaining_time / 60) . " menit.");
    } else {
        // Reset percobaan jika waktu lockout sudah habis
        $_SESSION['login_attempts'] = 0;
    }
}

// Proses login jika form disubmit
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Validasi CSRF token
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        die("CSRF token validation failed");
    }
    
    // Ambil dan sanitasi input
    $username = trim($_POST["username"] ?? '');
    $password = $_POST["password"] ?? '';
    
    // Validasi input
    if (empty($username) || empty($password)) {
        $error = "Username dan password harus diisi!";
    } else {
        try {
            // Query database dengan prepared statement
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Verifikasi password
            if ($user && password_verify($password, $user["password"])) {
                // Reset percobaan login
                $_SESSION['login_attempts'] = 0;
                
                // Regenerasi session ID untuk mencegah session fixation
                session_regenerate_id(true);
                
                // Set session data
                $_SESSION["user_id"] = $user["id"];
                $_SESSION["username"] = $user["username"];
                $_SESSION["last_activity"] = time();
                
                // Redirect ke dashboard
                header("Location: dashboard.php");
                exit;
            } else {
                // Increment percobaan login
                $_SESSION['login_attempts']++;
                $_SESSION['last_attempt_time'] = time();
                
                $error = "Login gagal! Periksa username/password.";
                
                // Log percobaan login gagal untuk monitoring
                error_log("Failed login attempt for username: " . $username);
            }
        } catch (PDOException $e) {
            $error = "Terjadi kesalahan sistem. Silakan coba lagi nanti.";
            error_log("Database error during login: " . $e->getMessage());
        }
    }
}

// Generate CSRF token untuk form
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Login - PACIFIC PRO</title>
    <link rel="stylesheet" href="style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg">
    <div class="login-container">
        <div class="login-box card">
            <div class="login-header">
                <div class="brand">PACIFIC PRO</div>
                <div class="subtitle">Sistem Keuangan</div>
            </div>
            
            <?php if (!empty($error)): ?>
                <div class="alert alert-danger">
                    <?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?>
                </div>
            <?php endif; ?>
            
            <form method="post" class="login-form">
                <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
                
                <div class="form-group">
                    <label for="username" class="form-label">Username</label>
                    <div class="input-group">
                        <span class="input-icon">👤</span>
                        <input type="text" id="username" name="username" 
                               placeholder="Masukkan username" required 
                               class="form-control" autocomplete="username">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="password" class="form-label">Password</label>
                    <div class="input-group">
                        <span class="input-icon">🔒</span>
                        <input type="password" id="password" name="password" 
                               placeholder="Masukkan password" required 
                               class="form-control" autocomplete="current-password">
                    </div>
                </div>
                
                <div class="form-options">
                    <div class="remember-me">
                        <input type="checkbox" id="remember" name="remember" class="form-check">
                        <label for="remember" class="form-check-label">Ingat saya</label>
                    </div>
                    <a href="#" class="forgot-password">Lupa password?</a>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    Masuk
                </button>
            </form>
            
            <div class="login-footer">
                <p>&copy; <?php echo date('Y'); ?> PACIFIC PRO. All rights reserved.</p>
            </div>
        </div>
    </div>
    
    <script>
        // Fokus ke username field saat halaman dimuat
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('username').focus();
        });
        
        // Toggle password visibility (opsional)
        document.addEventListener('DOMContentLoaded', function() {
            const passwordField = document.getElementById('password');
            const togglePassword = document.createElement('span');
            togglePassword.className = 'password-toggle';
            togglePassword.innerHTML = '👁️';
            togglePassword.style.cursor = 'pointer';
            togglePassword.style.position = 'absolute';
            togglePassword.style.right = '10px';
            togglePassword.style.top = '50%';
            togglePassword.style.transform = 'translateY(-50%)';
            
            const passwordGroup = passwordField.parentElement;
            passwordGroup.style.position = 'relative';
            passwordGroup.appendChild(togglePassword);
            
            togglePassword.addEventListener('click', function() {
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);
                this.innerHTML = type === 'password' ? '👁️' : '🙈';
            });
        });
    </script>
</body>
</html>