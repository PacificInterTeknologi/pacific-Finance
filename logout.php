// Di halaman yang berisi link logout
$token = bin2hex(random_bytes(32));
$_SESSION['logout_token'] = $token;

// Di link logout
echo '<a href="logout.php?token=' . $token . '">Logout</a>';

// Di logout.php
if (!isset($_GET['token']) || $_GET['token'] !== $_SESSION['logout_token']) {
    die('Invalid request');
}