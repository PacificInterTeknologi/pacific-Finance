# PACIFIC PRO — Template Sistem Keuangan (PHP + MySQL)

## Cara Pakai (XAMPP/Laragon/WAMP)
1. Copy folder `pacific-pro` ke folder web server Anda (misal `htdocs` untuk XAMPP).
2. Jalankan MySQL dan Apache.
3. Import `database.sql` ke MySQL (via phpMyAdmin/DBeaver).
4. Buka di browser: `http://localhost/pacific-pro/`.
5. Login default:
   - **Username:** `admin`
   - **Password:** `admin123`

## Struktur
- `index.php` : login
- `dashboard.php` : menu utama
- `transaksi.php` : input transaksi (debit/kredit)
- `laporan.php` : tabel laporan transaksi
- `config.php` : koneksi database
- `database.sql` : skema dan user default
- `style.css` : tema dark biru & merah

## Catatan
- Ganti user & password MySQL di `config.php` sesuai lingkungan Anda.
- Ini template awal untuk uji coba. Pengembangan berikutnya:
  - Validasi akun debit/kredit menggunakan Chart of Accounts (tabel `accounts`).
  - Modul Invoice & Neraca/Laba Rugi.
  - Multi-role (admin/staff/owner).
  - Ekspor ke PDF/Excel.
