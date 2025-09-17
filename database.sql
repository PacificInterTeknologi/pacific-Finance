-- =========================
-- Users (login)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','staff','owner') DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Customers
-- =========================
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  alamat TEXT,
  telp VARCHAR(50),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
);

-- =========================
-- Accounts (Akuntansi)
-- =========================
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('asset','liability','equity','revenue','expense') NOT NULL
);

-- =========================
-- Transactions (kas/jurnal umum)
-- =========================
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  transaction_date DATE,
  description TEXT,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =========================
-- Invoices
-- =========================
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  no_invoice VARCHAR(100) UNIQUE,
  tanggal DATE,
  customer_id INT NULL,
  jenis ENUM('reguler','dp','pelunasan') DEFAULT 'reguler',
  total DECIMAL(15,2) DEFAULT 0,
  dp DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Belum Lunas',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT chk_dp CHECK (dp <= total AND dp >= 0)
);

-- =========================
-- Invoice Items
-- =========================
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  description TEXT,
  qty INT DEFAULT 1,
  price DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- =========================
-- Journal Akuntansi
-- =========================
CREATE TABLE IF NOT EXISTS journal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE,
  account_id INT NOT NULL,
  keterangan TEXT,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  invoice_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  CONSTRAINT chk_debit_credit CHECK (debit >= 0 AND credit >= 0)
);

-- =========================
-- Salary / Slip Gaji
-- =========================
CREATE TABLE IF NOT EXISTS salary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT,
  periode VARCHAR(20),
  total DECIMAL(15,2),
  breakdown TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- Indexes
-- =========================
CREATE INDEX idx_trans_user ON transactions(user_id);
CREATE INDEX idx_trans_date ON transactions(transaction_date);
CREATE INDEX idx_cust_name ON customers(nama);
CREATE INDEX idx_cust_email ON customers(email);
CREATE INDEX idx_inv_cust ON invoices(customer_id);
CREATE INDEX idx_inv_tgl ON invoices(tanggal);
CREATE INDEX idx_inv_status ON invoices(status);
CREATE INDEX idx_item_inv ON invoice_items(invoice_id);
CREATE INDEX idx_journal_acc ON journal(account_id);
CREATE INDEX idx_journal_inv ON journal(invoice_id);
CREATE INDEX idx_journal_tgl ON journal(tanggal);
CREATE INDEX idx_salary_emp ON salary(employee_id);
CREATE INDEX idx_salary_periode ON salary(periode);