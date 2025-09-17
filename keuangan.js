// =====================
// INVOICE MANAGEMENT MODULE
// =====================
/**
 * Invoice Management Module
 * Handles all operations related to invoices including creation, storage, and retrieval
 */

// =====================
// GLOBAL VARIABLES & CONSTANTS
// =====================
const INVOICE_PERMISSIONS = {
    admin: { create: true, edit: true, delete: true, view: true, approve: true },
    staff: { create: true, edit: true, delete: false, view: true, approve: false },
    viewer: { create: false, edit: false, delete: false, view: true, approve: false }
};

// Variabel untuk menyimpan state textarea asli sebelum print
let originalTextareaStates = new Map();

// =====================
// AUTHENTICATION & USER MANAGEMENT
// =====================
/**
 * Get current user information
 * @returns {Object|null} User object or null if not logged in
 */
function getCurrentUser() {
    try {
        const currentUser = localStorage.getItem("currentUser");
        if (!currentUser) return null;
        
        const user = JSON.parse(currentUser);
        console.log("[DEBUG] getCurrentUser: Current user", user.username, "with role", user.role);
        return user;
    } catch (error) {
        console.error("[DEBUG] getCurrentUser: Error", error);
        return null;
    }
}

/**
 * Check if user has permission for invoice operation
 * @param {string} operation - Operation to check (create, edit, delete, view, approve)
 * @returns {boolean} True if user has permission
 */
function hasInvoicePermission(operation) {
    const user = getCurrentUser();
    if (!user) {
        console.error("[DEBUG] hasInvoicePermission: No user logged in");
        return false;
    }
    
    const permissions = INVOICE_PERMISSIONS[user.role] || {};
    const hasPermission = permissions[operation] || false;
    
    console.log(`[DEBUG] hasInvoicePermission: User ${user.username} (${user.role}) ${hasPermission ? 'has' : 'does not have'} permission for ${operation}`);
    return hasPermission;
}

// =====================
// DATA ACCESS LAYER
// =====================
/**
 * Mendapatkan data invoice dari localStorage
 * @returns {Array} Array of invoice objects
 */
function getInvoices() {
    console.log("[DEBUG] getInvoices: Mengambil data invoice dari localStorage");
    
    if (!hasInvoicePermission('view')) {
        console.error("[DEBUG] getInvoices: User does not have view permission");
        showNotification("Anda tidak memiliki izin untuk melihat data invoice", "error");
        return [];
    }
    
    try {
        const data = getDataFromLocalStorage("dataPenjualan", "invoice");
        console.log("[DEBUG] getInvoices: Berhasil mengambil", data.length, "invoice");
        return data;
    } catch (error) {
        console.error("[DEBUG] getInvoices: Error mengambil data", error);
        return [];
    }
}

/**
 * Menyimpan data invoice ke localStorage
 * @param {Array} data - Array of invoice objects
 * @returns {boolean} True jika berhasil disimpan
 */
function simpanInvoices(data) {
    console.log("[DEBUG] simpanInvoices: Menyimpan", data.length, "invoice ke localStorage");
    
    if (!hasInvoicePermission('create') && !hasInvoicePermission('edit')) {
        console.error("[DEBUG] simpanInvoices: User does not have create or edit permission");
        showNotification("Anda tidak memiliki izin untuk menyimpan data invoice", "error");
        return false;
    }
    
    try {
        const result = saveDataToLocalStorage("dataPenjualan", data, "invoice");
        console.log("[DEBUG] simpanInvoices: Hasil penyimpanan", result ? "berhasil" : "gagal");
        return result;
    } catch (error) {
        console.error("[DEBUG] simpanInvoices: Error menyimpan data", error);
        return false;
    }
}

/**
 * Mendapatkan invoice berdasarkan nomor invoice
 * @param {string} noInvoice - Nomor invoice yang dicari
 * @returns {Object|null} Invoice object atau null jika tidak ditemukan
 */
function getInvoiceByNo(noInvoice) {
    console.log("[DEBUG] getInvoiceByNo: Mencari invoice dengan nomor", noInvoice);
    
    if (!hasInvoicePermission('view')) {
        console.error("[DEBUG] getInvoiceByNo: User does not have view permission");
        showNotification("Anda tidak memiliki izin untuk melihat data invoice", "error");
        return null;
    }
    
    try {
        const invoices = getInvoices();
        const foundInvoice = invoices.find(inv => inv.noInvoice === noInvoice);
        console.log("[DEBUG] getInvoiceByNo: Invoice", foundInvoice ? "ditemukan" : "tidak ditemukan");
        return foundInvoice || null;
    } catch (error) {
        console.error("[DEBUG] getInvoiceByNo: Error mencari invoice", error);
        return null;
    }
}

// =====================
// INVOICE OPERATIONS
// =====================
/**
 * Simpan invoice regular
 * @param {Object} invoiceData - Data invoice yang akan disimpan
 * @returns {boolean} True jika berhasil disimpan
 */
function simpanInvoiceRegular(invoiceData) {
    console.log("[DEBUG] simpanInvoiceRegular: Memulai penyimpanan invoice regular");
    console.log("[DEBUG] simpanInvoiceRegular: Data invoice", JSON.stringify(invoiceData));
    
    if (!hasInvoicePermission('create')) {
        console.error("[DEBUG] simpanInvoiceRegular: User does not have create permission");
        showNotification("Anda tidak memiliki izin untuk membuat invoice", "error");
        return false;
    }
    
    try {
        // Validasi data
        if (!invoiceData || !invoiceData.noInvoice || !invoiceData.items || invoiceData.items.length === 0) {
            console.error("[DEBUG] simpanInvoiceRegular: Data invoice tidak lengkap");
            throw new Error("Data invoice tidak lengkap");
        }
        
        // Hitung total
        let total = 0;
        invoiceData.items.forEach(item => {
            total += item.total || 0;
        });
        console.log("[DEBUG] simpanInvoiceRegular: Total invoice dihitung", total);
        
        // Set jenis invoice
        invoiceData.jenisInvoice = 'regular';
        invoiceData.total = total;
        invoiceData.status = "Belum Lunas";
        invoiceData.tanggalPelunasan = "";
        
        // Add user info
        const user = getCurrentUser();
        if (user) {
            invoiceData.createdBy = user.username;
            invoiceData.createdByRole = user.role;
        }
        
        // Simpan ke localStorage
        console.log("[DEBUG] simpanInvoiceRegular: Menyimpan ke localStorage");
        const invoices = getInvoices();
        invoices.push(invoiceData);
        const result = simpanInvoices(invoices);
        
        if (result) {
            console.log("[DEBUG] simpanInvoiceRegular: Berhasil menyimpan ke localStorage");
            
            // Simpan ke jurnal
            console.log("[DEBUG] simpanInvoiceRegular: Menyimpan ke jurnal");
            simpanKeJurnal(invoiceData);
            
            // Simpan ke database (async, tidak blocking)
            console.log("[DEBUG] simpanInvoiceRegular: Menyimpan ke database");
            simpanInvoiceKeDatabase(invoiceData).catch(err => {
                console.error("[DEBUG] simpanInvoiceRegular: Gagal menyimpan ke database", err);
            });
            
            // Log aktivitas
            console.log("[DEBUG] simpanInvoiceRegular: Mencatat aktivitas");
            logActivity(`Menyimpan invoice regular: ${invoiceData.noInvoice}`);
            
            showNotification("Invoice regular berhasil disimpan");
            return true;
        }
        
        console.error("[DEBUG] simpanInvoiceRegular: Gagal menyimpan ke localStorage");
        return false;
    } catch (error) {
        console.error("[DEBUG] simpanInvoiceRegular: Error", error);
        showNotification("Terjadi kesalahan saat menyimpan invoice regular: " + error.message, "error");
        return false;
    }
}

/**
 * Simpan invoice DP
 * @param {Object} invoiceData - Data invoice yang akan disimpan
 * @returns {boolean} True jika berhasil disimpan
 */
function simpanInvoiceDP(invoiceData) {
    console.log("[DEBUG] simpanInvoiceDP: Memulai penyimpanan invoice DP");
    console.log("[DEBUG] simpanInvoiceDP: Data invoice", JSON.stringify(invoiceData));
    
    if (!hasInvoicePermission('create')) {
        console.error("[DEBUG] simpanInvoiceDP: User does not have create permission");
        showNotification("Anda tidak memiliki izin untuk membuat invoice", "error");
        return false;
    }
    
    try {
        // Validasi data
        if (!invoiceData || !invoiceData.noInvoice || !invoiceData.items || invoiceData.items.length === 0) {
            console.error("[DEBUG] simpanInvoiceDP: Data invoice tidak lengkap");
            throw new Error("Data invoice tidak lengkap");
        }
        
        // Validasi DP
        if (!invoiceData.dp || invoiceData.dp <= 0) {
            console.error("[DEBUG] simpanInvoiceDP: Jumlah DP tidak valid", invoiceData.dp);
            throw new Error("Jumlah DP harus lebih dari 0");
        }
        
        // Hitung total
        let total = 0;
        invoiceData.items.forEach(item => {
            total += item.total || 0;
        });
        console.log("[DEBUG] simpanInvoiceDP: Total invoice dihitung", total);
        
        // Set jenis invoice
        invoiceData.jenisInvoice = 'dp';
        invoiceData.total = total; // Total sebelum DP
        invoiceData.dp = invoiceData.dp; // Simpan nilai DP
        invoiceData.sisa = total - invoiceData.dp; // Sisa pembayaran
        invoiceData.status = "Belum Lunas";
        invoiceData.tanggalPelunasan = "";
        
        // Add user info
        const user = getCurrentUser();
        if (user) {
            invoiceData.createdBy = user.username;
            invoiceData.createdByRole = user.role;
        }
        
        // Simpan ke localStorage
        console.log("[DEBUG] simpanInvoiceDP: Menyimpan ke localStorage");
        const invoices = getInvoices();
        invoices.push(invoiceData);
        const result = simpanInvoices(invoices);
        
        if (result) {
            console.log("[DEBUG] simpanInvoiceDP: Berhasil menyimpan ke localStorage");
            
            // Simpan ke jurnal
            console.log("[DEBUG] simpanInvoiceDP: Menyimpan ke jurnal");
            simpanKeJurnal(invoiceData);
            
            // Simpan ke database (async, tidak blocking)
            console.log("[DEBUG] simpanInvoiceDP: Menyimpan ke database");
            simpanInvoiceKeDatabase(invoiceData).catch(err => {
                console.error("[DEBUG] simpanInvoiceDP: Gagal menyimpan ke database", err);
            });
            
            // Log aktivitas
            console.log("[DEBUG] simpanInvoiceDP: Mencatat aktivitas");
            logActivity(`Menyimpan invoice DP: ${invoiceData.noInvoice}`);
            
            showNotification("Invoice DP berhasil disimpan");
            return true;
        }
        
        console.error("[DEBUG] simpanInvoiceDP: Gagal menyimpan ke localStorage");
        return false;
    } catch (error) {
        console.error("[DEBUG] simpanInvoiceDP: Error", error);
        showNotification("Terjadi kesalahan saat menyimpan invoice DP: " + error.message, "error");
        return false;
    }
}

/**
 * Simpan invoice pelunasan
 * @param {Object} invoiceData - Data invoice yang akan disimpan
 * @returns {boolean} True jika berhasil disimpan
 */
function simpanInvoicePelunasan(invoiceData) {
    console.log("[DEBUG] simpanInvoicePelunasan: Memulai penyimpanan invoice pelunasan");
    console.log("[DEBUG] simpanInvoicePelunasan: Data invoice", JSON.stringify(invoiceData));
    
    if (!hasInvoicePermission('create')) {
        console.error("[DEBUG] simpanInvoicePelunasan: User does not have create permission");
        showNotification("Anda tidak memiliki izin untuk membuat invoice", "error");
        return false;
    }
    
    try {
        // Validasi data
        if (!invoiceData || !invoiceData.noInvoice) {
            console.error("[DEBUG] simpanInvoicePelunasan: Data invoice tidak lengkap");
            throw new Error("Data invoice tidak lengkap");
        }
        
        // Validasi pelunasan
        if (!invoiceData.pelunasanAmount || invoiceData.pelunasanAmount <= 0) {
            console.error("[DEBUG] simpanInvoicePelunasan: Jumlah pelunasan tidak valid", invoiceData.pelunasanAmount);
            throw new Error("Jumlah pelunasan harus lebih dari 0");
        }
        
        // Validasi invoice yang dilunasi
        if (!invoiceData.dpInvoice && !invoiceData.regularInvoice) {
            console.error("[DEBUG] simpanInvoicePelunasan: Tidak ada invoice yang dilunasi");
            throw new Error("Pilih minimal satu invoice yang akan dilunasi");
        }
        
        // Hitung total tagihan
        let totalTagihan = 0;
        let totalDP = 0;
        
        if (invoiceData.dpInvoice) {
            totalTagihan += invoiceData.dpInvoice.total || 0;
            totalDP += invoiceData.dpInvoice.dp || 0;
        }
        
        if (invoiceData.regularInvoice) {
            totalTagihan += invoiceData.regularInvoice.total || 0;
        }
        
        console.log("[DEBUG] simpanInvoicePelunasan: Total tagihan", totalTagihan, "Total DP", totalDP);
        
        // Set jenis invoice
        invoiceData.jenisInvoice = 'pelunasan';
        invoiceData.total = invoiceData.pelunasanAmount; // Total pelunasan
        invoiceData.totalTagihan = totalTagihan; // Total tagihan asli
        invoiceData.totalDP = totalDP; // Total DP yang sudah dibayar
        invoiceData.status = "Lunas";
        invoiceData.tanggalPelunasan = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Add user info
        const user = getCurrentUser();
        if (user) {
            invoiceData.createdBy = user.username;
            invoiceData.createdByRole = user.role;
        }
        
        // Simpan referensi ke invoice yang dilunasi
        invoiceData.pelunasanInvoices = [];
        
        if (invoiceData.dpInvoice) {
            invoiceData.pelunasanInvoices.push({
                noInvoice: invoiceData.dpInvoice.noInvoice,
                jenis: 'dp',
                customer: invoiceData.dpInvoice.customer,
                amount: invoiceData.dpInvoice.total || 0,
                dpAmount: invoiceData.dpInvoice.dp || 0
            });
        }
        
        if (invoiceData.regularInvoice) {
            invoiceData.pelunasanInvoices.push({
                noInvoice: invoiceData.regularInvoice.noInvoice,
                jenis: 'regular',
                customer: invoiceData.regularInvoice.customer,
                amount: invoiceData.regularInvoice.total || 0,
                dpAmount: 0
            });
        }
        
        // Simpan ke localStorage
        console.log("[DEBUG] simpanInvoicePelunasan: Menyimpan ke localStorage");
        const invoices = getInvoices();
        invoices.push(invoiceData);
        const result = simpanInvoices(invoices);
        
        if (result) {
            console.log("[DEBUG] simpanInvoicePelunasan: Berhasil menyimpan ke localStorage");
            
            // Update status invoice yang dilunasi menjadi Lunas
            if (invoiceData.dpInvoice) {
                console.log("[DEBUG] simpanInvoicePelunasan: Update status DP invoice", invoiceData.dpInvoice.noInvoice);
                updateStatusInvoice(invoiceData.dpInvoice.noInvoice, "Lunas");
            }
            
            if (invoiceData.regularInvoice) {
                console.log("[DEBUG] simpanInvoicePelunasan: Update status regular invoice", invoiceData.regularInvoice.noInvoice);
                updateStatusInvoice(invoiceData.regularInvoice.noInvoice, "Lunas");
            }
            
            // Simpan ke jurnal
            console.log("[DEBUG] simpanInvoicePelunasan: Menyimpan ke jurnal");
            simpanKeJurnal(invoiceData);
            
            // Simpan ke database (async, tidak blocking)
            console.log("[DEBUG] simpanInvoicePelunasan: Menyimpan ke database");
            simpanInvoiceKeDatabase(invoiceData).catch(err => {
                console.error("[DEBUG] simpanInvoicePelunasan: Gagal menyimpan ke database", err);
            });
            
            // Log aktivitas
            console.log("[DEBUG] simpanInvoicePelunasan: Mencatat aktivitas");
            logActivity(`Menyimpan invoice pelunasan: ${invoiceData.noInvoice}`);
            
            showNotification("Invoice pelunasan berhasil disimpan");
            return true;
        }
        
        console.error("[DEBUG] simpanInvoicePelunasan: Gagal menyimpan ke localStorage");
        return false;
    } catch (error) {
        console.error("[DEBUG] simpanInvoicePelunasan: Error", error);
        showNotification("Terjadi kesalahan saat menyimpan invoice pelunasan: " + error.message, "error");
        return false;
    }
}

/**
 * Update status invoice
 * @param {string} noInvoice - Nomor invoice
 * @param {string} status - Status baru (Lunas/Belum Lunas)
 * @returns {boolean} True jika berhasil diupdate
 */
function updateStatusInvoice(noInvoice, status) {
    console.log(`[DEBUG] updateStatusInvoice: Mengupdate status invoice ${noInvoice} menjadi ${status}`);
    
    if (!hasInvoicePermission('edit')) {
        console.error("[DEBUG] updateStatusInvoice: User does not have edit permission");
        showNotification("Anda tidak memiliki izin untuk mengubah status invoice", "error");
        return false;
    }
    
    try {
        const invoices = getInvoices();
        const invoiceIndex = invoices.findIndex(inv => inv.noInvoice === noInvoice);
        
        if (invoiceIndex === -1) {
            console.error(`[DEBUG] updateStatusInvoice: Invoice ${noInvoice} tidak ditemukan`);
            throw new Error("Invoice tidak ditemukan");
        }
        
        console.log(`[DEBUG] updateStatusInvoice: Invoice ditemukan di index ${invoiceIndex}`);
        
        // Update status
        const oldStatus = invoices[invoiceIndex].status;
        invoices[invoiceIndex].status = status;
        
        if (status === "Lunas") {
            // Jika tanggal pelunasan belum diisi, isi dengan tanggal hari ini
            if (!invoices[invoiceIndex].tanggalPelunasan) {
                const today = new Date();
                invoices[invoiceIndex].tanggalPelunasan = today.toISOString().split('T')[0];
                console.log(`[DEBUG] updateStatusInvoice: Set tanggal pelunasan ke ${invoices[invoiceIndex].tanggalPelunasan}`);
            }
        } else {
            invoices[invoiceIndex].tanggalPelunasan = "";
            console.log(`[DEBUG] updateStatusInvoice: Reset tanggal pelunasan`);
        }
        
        // Simpan kembali
        console.log(`[DEBUG] updateStatusInvoice: Menyimpan perubahan ke localStorage`);
        const result = simpanInvoices(invoices);
        
        if (result) {
            console.log(`[DEBUG] updateStatusInvoice: Berhasil mengupdate status dari ${oldStatus} menjadi ${status}`);
            
            // Log aktivitas
            logActivity(`Update status invoice menjadi ${status}: ${noInvoice}`);
            
            return true;
        }
        
        console.error(`[DEBUG] updateStatusInvoice: Gagal menyimpan perubahan`);
        return false;
    } catch (error) {
        console.error(`[DEBUG] updateStatusInvoice: Error`, error);
        showNotification("Terjadi kesalahan saat update status invoice: " + error.message, "error");
        return false;
    }
}

/**
 * Hapus invoice
 * @param {string} noInvoice - Nomor invoice yang akan dihapus
 * @returns {boolean} True jika berhasil dihapus
 */
function hapusInvoice(noInvoice) {
    console.log(`[DEBUG] hapusInvoice: Menghapus invoice ${noInvoice}`);
    
    if (!hasInvoicePermission('delete')) {
        console.error("[DEBUG] hapusInvoice: User does not have delete permission");
        showNotification("Anda tidak memiliki izin untuk menghapus invoice", "error");
        return false;
    }
    
    try {
        const invoices = getInvoices();
        const invoiceIndex = invoices.findIndex(inv => inv.noInvoice === noInvoice);
        
        if (invoiceIndex === -1) {
            console.error(`[DEBUG] hapusInvoice: Invoice ${noInvoice} tidak ditemukan`);
            throw new Error("Invoice tidak ditemukan");
        }
        
        console.log(`[DEBUG] hapusInvoice: Invoice ditemukan di index ${invoiceIndex}`);
        
        // Get invoice data before deletion for logging
        const deletedInvoice = invoices[invoiceIndex];
        
        // Hapus invoice
        invoices.splice(invoiceIndex, 1);
        
        // Simpan kembali
        console.log(`[DEBUG] hapusInvoice: Menyimpan perubahan ke localStorage`);
        const result = simpanInvoices(invoices);
        
        if (result) {
            console.log(`[DEBUG] hapusInvoice: Berhasil menghapus invoice ${noInvoice}`);
            
            // Update laporan keuangan
            updateLaporanKeuanganAfterDelete(deletedInvoice);
            
            // Log aktivitas
            logActivity(`Menghapus invoice: ${noInvoice}`);
            
            showNotification("Invoice berhasil dihapus");
            return true;
        }
        
        console.error(`[DEBUG] hapusInvoice: Gagal menyimpan perubahan`);
        return false;
    } catch (error) {
        console.error(`[DEBUG] hapusInvoice: Error`, error);
        showNotification("Terjadi kesalahan saat menghapus invoice: " + error.message, "error");
        return false;
    }
}

// =====================
// PRINT HANDLING FUNCTIONS
// =====================

/**
 * Menyiapkan textarea untuk pencetakan
 * Mengubah style textarea agar tidak terpotong saat dicetak
 */
function prepareTextareasForPrint() {
    console.log("[DEBUG] prepareTextareasForPrint: Menyiapkan textarea untuk pencetakan");
    
    try {
        // Simpan state asli semua textarea
        const textareas = document.querySelectorAll('textarea');
        
        textareas.forEach(textarea => {
            // Simpan state asli
            const originalState = {
                value: textarea.value,
                style: {
                    height: textarea.style.height,
                    width: textarea.style.width,
                    overflow: textarea.style.overflow,
                    whiteSpace: textarea.style.whiteSpace,
                    wordWrap: textarea.style.wordWrap,
                    display: textarea.style.display,
                    border: textarea.style.border,
                    resize: textarea.style.resize
                },
                attributes: {
                    rows: textarea.getAttribute('rows'),
                    cols: textarea.getAttribute('cols')
                }
            };
            
            // Simpan ke map dengan ID sebagai key
            const textareaId = textarea.id || `textarea_${Math.random().toString(36).substr(2, 9)}`;
            if (!textarea.id) {
                textarea.id = textareaId;
            }
            originalTextareaStates.set(textareaId, originalState);
            
            // Terapkan style untuk print
            textarea.style.all = 'initial !important';
            textarea.style.display = 'inline-block !important';
            textarea.style.width = '100% !important';
            textarea.style.height = 'auto !important';
            textarea.style.minHeight = 'auto !important';
            textarea.style.overflow = 'visible !important';
            textarea.style.whiteSpace = 'pre-wrap !important';
            textarea.style.wordWrap = 'break-word !important';
            textarea.style.border = 'none !important';
            textarea.style.resize = 'none !important';
            textarea.style.orphans = '3 !important';
            textarea.style.widows = '3 !important';
            
            // Sesuaikan rows untuk menampilkan semua konten
            const lineCount = textarea.value.split('\n').length;
            textarea.setAttribute('rows', lineCount);
            
            console.log(`[DEBUG] prepareTextareasForPrint: Textarea ${textareaId} disiapkan untuk print`);
        });
        
        console.log(`[DEBUG] prepareTextareasForPrint: ${textareas.length} textarea telah disiapkan`);
    } catch (error) {
        console.error("[DEBUG] prepareTextareasForPrint: Error", error);
    }
}

/**
 * Mengembalikan textarea ke keadaan semula setelah pencetakan
 */
function restoreTextareasAfterPrint() {
    console.log("[DEBUG] restoreTextareasAfterPrint: Mengembalikan textarea ke keadaan semula");
    
    try {
        // Kembalikan semua textarea ke state aslinya
        originalTextareaStates.forEach((originalState, textareaId) => {
            const textarea = document.getElementById(textareaId);
            if (textarea) {
                // Kembalikan nilai
                textarea.value = originalState.value;
                
                // Kembalikan style
                Object.keys(originalState.style).forEach(prop => {
                    textarea.style[prop] = originalState.style[prop];
                });
                
                // Kembalikan atribut
                Object.keys(originalState.attributes).forEach(attr => {
                    if (originalState.attributes[attr]) {
                        textarea.setAttribute(attr, originalState.attributes[attr]);
                    } else {
                        textarea.removeAttribute(attr);
                    }
                });
                
                console.log(`[DEBUG] restoreTextareasAfterPrint: Textarea ${textareaId} dikembalikan ke keadaan semula`);
            }
        });
        
        // Kosongkan map
        originalTextareaStates.clear();
        
        console.log("[DEBUG] restoreTextareasAfterPrint: Semua textarea telah dikembalikan");
    } catch (error) {
        console.error("[DEBUG] restoreTextareasAfterPrint: Error", error);
    }
}

/**
 * Setup event listener untuk beforeprint dan afterprint
 */
function setupPrintEventListeners() {
    console.log("[DEBUG] setupPrintEventListeners: Mengatur event listener untuk pencetakan");
    
    try {
        // Event listener untuk beforeprint
        window.addEventListener('beforeprint', () => {
            console.log("[DEBUG] beforeprint event triggered");
            prepareTextareasForPrint();
        });
        
        // Event listener untuk afterprint
        window.addEventListener('afterprint', () => {
            console.log("[DEBUG] afterprint event triggered");
            restoreTextareasAfterPrint();
        });
        
        console.log("[DEBUG] setupPrintEventListeners: Event listener telah diatur");
    } catch (error) {
        console.error("[DEBUG] setupPrintEventListeners: Error", error);
    }
}

/**
 * Fungsi untuk menangani export PDF dengan html2canvas
 * @param {string} elementId - ID elemen yang akan diexport
 * @param {string} filename - Nama file PDF
 */
async function exportToPDF(elementId, filename) {
    console.log(`[DEBUG] exportToPDF: Mengekspor elemen ${elementId} ke PDF dengan nama ${filename}`);
    
    try {
        // Siapkan textarea sebelum capture
        prepareTextareasForPrint();
        
        // Tunggu sedikit agar style diterapkan
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Dapatkan elemen yang akan diexport
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Elemen dengan ID ${elementId} tidak ditemukan`);
        }
        
        // Konfigurasi html2canvas
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            height: element.scrollHeight,
            windowHeight: element.scrollHeight,
            scrollX: 0,
            scrollY: 0
        });
        
        // Buat PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        // Tambahkan gambar ke PDF
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Tambahkan halaman baru jika konten lebih dari satu halaman
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        // Simpan PDF
        pdf.save(filename);
        
        console.log(`[DEBUG] exportToPDF: PDF berhasil disimpan dengan nama ${filename}`);
        
        // Kembalikan textarea ke keadaan semula
        restoreTextareasAfterPrint();
        
        return true;
    } catch (error) {
        console.error("[DEBUG] exportToPDF: Error", error);
        showNotification("Terjadi kesalahan saat mengekspor ke PDF: " + error.message, "error");
        
        // Pastikan textarea dikembalikan ke keadaan semula meskipun terjadi error
        restoreTextareasAfterPrint();
        
        return false;
    }
}

/**
 * Fungsi untuk mencetak invoice
 * @param {string} elementId - ID elemen invoice yang akan dicetak
 */
function printInvoice(elementId) {
    console.log(`[DEBUG] printInvoice: Mencetak invoice dengan elemen ID ${elementId}`);
    
    try {
        const invoiceElement = document.getElementById(elementId);
        if (!invoiceElement) {
            throw new Error(`Elemen invoice dengan ID ${elementId} tidak ditemukan`);
        }
        
        // Siapkan textarea untuk print
        prepareTextareasForPrint();
        
        // Tunggu sedikit agar style diterapkan
        setTimeout(() => {
            // Cetak elemen
            window.print();
            
            // Event afterprint akan menangani pemulihan textarea
            console.log("[DEBUG] printInvoice: Perintah print telah dikirim");
        }, 100);
    } catch (error) {
        console.error("[DEBUG] printInvoice: Error", error);
        showNotification("Terjadi kesalahan saat mencetak invoice: " + error.message, "error");
        
        // Pastikan textarea dikembalikan ke keadaan semula meskipun terjadi error
        restoreTextareasAfterPrint();
    }
}

// =====================
// UI FUNCTIONS
// =====================
/**
 * Menampilkan notifikasi
 * @param {string} message - Pesan notifikasi
 * @param {string} type - Tipe notifikasi (success, error, warning, info)
 */
function showNotification(message, type = 'success') {
    console.log(`[DEBUG] showNotification: Menampilkan notifikasi ${type}: ${message}`);
    
    try {
        const notification = document.getElementById("notification");
        if (notification) {
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.add("show");
            
            setTimeout(() => {
                notification.classList.remove("show");
                console.log(`[DEBUG] showNotification: Notifikasi disembunyikan setelah 3 detik`);
            }, 3000);
        } else {
            console.warn(`[DEBUG] showNotification: Elemen notifikasi tidak ditemukan, menggunakan alert`);
            // Fallback ke alert jika elemen notifikasi tidak ada
            if (type === 'error') {
                alert(`Error: ${message}`);
            } else if (type === 'warning') {
                alert(`Warning: ${message}`);
            } else {
                alert(message);
            }
        }
    } catch (error) {
        console.error(`[DEBUG] showNotification: Error menampilkan notifikasi`, error);
        alert(message); // Fallback terakhir
    }
}

// =====================
// INVOICE PAGE FUNCTIONS
// =====================
/**
 * Fungsi untuk invoice.html
 * Memuat data invoice regular
 */
function loadInvoiceRegular() {
    console.log("[DEBUG] loadInvoiceRegular: Memuat data invoice regular");
    
    if (!hasInvoicePermission('create')) {
        console.error("[DEBUG] loadInvoiceRegular: User does not have create permission");
        showNotification("Anda tidak memiliki izin untuk membuat invoice", "error");
        // Redirect to dashboard if no permission
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 2000);
        return;
    }
    
    try {
        const selectedPelanggan = getPelangganTerpilih();
        if (!selectedPelanggan) {
            console.error("[DEBUG] loadInvoiceRegular: Pelanggan tidak dipilih");
            showNotification("Pelanggan tidak dipilih", "error");
            return;
        }
        
        console.log("[DEBUG] loadInvoiceRegular: Pelanggan terpilih", selectedPelanggan.nama);
        
        // Load customer data
        document.getElementById("namaPelanggan").textContent = selectedPelanggan.nama || "-";
        document.getElementById("alamatPelanggan").textContent = selectedPelanggan.alamat || "-";
        document.getElementById("telpPelanggan").textContent = selectedPelanggan.telp || "-";
        
        // Generate invoice number
        const noInvoice = generateNomorInvoice("regular");
        document.getElementById("noInvoice").textContent = noInvoice;
        console.log("[DEBUG] loadInvoiceRegular: Nomor invoice", noInvoice);
        
        // Set current date
        const today = new Date();
        const formattedDate = today.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById("tanggalInvoice").textContent = formattedDate;
        
        // Set payment terms
        document.getElementById("termOfPayment").textContent = "Kredit";
        
        // Set bank account
        document.getElementById("rekeningTujuan").value = "BCA - 1234567890 a/n Pacific Inter Teknologi";
        
        // Add initial item if table is empty
        const tbody = document.querySelector("#itemTable tbody");
        if (tbody.children.length === 0) {
            console.log("[DEBUG] loadInvoiceRegular: Menambah item awal");
            addItem();
        }
        
        // Update jenis invoice terpilih
        simpanJenisInvoiceTerpilih({
            jenisInvoice: "regular",
            noInvoice: noInvoice,
            tanggal: formattedDate,
            top: "Kredit",
            rekening: "BCA - 1234567890 a/n Pacific Inter Teknologi"
        });
        
        console.log("Invoice regular loaded successfully");
    } catch (error) {
        console.error("[DEBUG] loadInvoiceRegular: Error", error);
        showNotification("Terjadi kesalahan saat memuat invoice regular", "error");
    }
}

/**
 * Fungsi untuk invoice-dp.html
 * Memuat data invoice DP
 */
function loadInvoiceDP() {
    console.log("[DEBUG] loadInvoiceDP: Memuat data invoice DP");
    
    if (!hasInvoicePermission('create')) {
        console.error("[DEBUG] loadInvoiceDP: User does not have create permission");
        showNotification("Anda tidak memiliki izin untuk membuat invoice", "error");
        // Redirect to dashboard if no permission
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 2000);
        return;
    }
    
    try {
        const selectedPelanggan = getPelangganTerpilih();
        if (!selectedPelanggan) {
            console.error("[DEBUG] loadInvoiceDP: Pelanggan tidak dipilih");
            showNotification("Pelanggan tidak dipilih", "error");
            return;
        }
        
        console.log("[DEBUG] loadInvoiceDP: Pelanggan terpilih", selectedPelanggan.nama);
        
        // Load customer data
        document.getElementById("namaPelanggan").textContent = selectedPelanggan.nama || "-";
        document.getElementById("alamatPelanggan").textContent = selectedPelanggan.alamat || "-";
        document.getElementById("telpPelanggan").textContent = selectedPelanggan.telp || "-";
        
        // Generate invoice number
        const noInvoice = generateNomorInvoice("dp");
        document.getElementById("noInvoice").textContent = noInvoice;
        console.log("[DEBUG] loadInvoiceDP: Nomor invoice", noInvoice);
        
        // Set current date
        const today = new Date();
        const formattedDate = today.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById("tanggalInvoice").textContent = formattedDate;
        
        // Set payment terms
        document.getElementById("termOfPayment").textContent = "Kredit";
        
        // Set bank account
        document.getElementById("rekeningTujuan").value = "BCA - 1234567890 a/n Pacific Inter Teknologi";
        
        // Add initial item if table is empty
        const tbody = document.querySelector("#itemTable tbody");
        if (tbody.children.length === 0) {
            console.log("[DEBUG] loadInvoiceDP: Menambah item awal");
            addItem();
        }
        
        // Update jenis invoice terpilih
        simpanJenisInvoiceTerpilih({
            jenisInvoice: "dp",
            noInvoice: noInvoice,
            tanggal: formattedDate,
            top: "Kredit",
            rekening: "BCA - 1234567890 a/n Pacific Inter Teknologi",
            dpPercentage: 50 // Default 50%
        });
        
        console.log("Invoice DP loaded successfully");
    } catch (error) {
        console.error("[DEBUG] loadInvoiceDP: Error", error);
        showNotification("Terjadi kesalahan saat memuat invoice DP", "error");
    }
}

/**
 * Fungsi untuk invoice-pelunasan.html
 * Memuat data invoice pelunasan
 */
function loadInvoicePelunasan() {
    console.log("[DEBUG] loadInvoicePelunasan: Memuat data invoice pelunasan");
    
    if (!hasInvoicePermission('create')) {
        console.error("[DEBUG] loadInvoicePelunasan: User does not have create permission");
        showNotification("Anda tidak memiliki izin untuk membuat invoice", "error");
        // Redirect to dashboard if no permission
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 2000);
        return;
    }
    
    try {
        const selectedPelanggan = getPelangganTerpilih();
        if (!selectedPelanggan) {
            console.error("[DEBUG] loadInvoicePelunasan: Pelanggan tidak dipilih");
            showNotification("Pelanggan tidak dipilih", "error");
            return;
        }
        
        console.log("[DEBUG] loadInvoicePelunasan: Pelanggan terpilih", selectedPelanggan.nama);
        
        // Load customer data
        document.getElementById("namaPelanggan").textContent = selectedPelanggan.nama || "-";
        document.getElementById("alamatPelanggan").textContent = selectedPelanggan.alamat || "-";
        document.getElementById("telpPelanggan").textContent = selectedPelanggan.telp || "-";
        
        // Generate invoice number
        const noInvoice = generateNomorInvoice("pelunasan");
        document.getElementById("noInvoice").textContent = noInvoice;
        console.log("[DEBUG] loadInvoicePelunasan: Nomor invoice", noInvoice);
        
        // Set current date
        const today = new Date();
        const formattedDate = today.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById("tanggalInvoice").textContent = formattedDate;
        
        // Set payment terms
        document.getElementById("termOfPayment").textContent = "Kredit";
        
        // Set bank account
        document.getElementById("rekeningTujuan").value = "BCA - 1234567890 a/n Pacific Inter Teknologi";
        
        // Load DP invoices for selection
        console.log("[DEBUG] loadInvoicePelunasan: Memuat invoice DP untuk pelunasan");
        loadDPInvoices();
        
        // Update jenis invoice terpilih
        simpanJenisInvoiceTerpilih({
            jenisInvoice: "pelunasan",
            noInvoice: noInvoice,
            tanggal: formattedDate,
            top: "Kredit",
            rekening: "BCA - 1234567890 a/n Pacific Inter Teknologi"
        });
        
        console.log("Invoice pelunasan loaded successfully");
    } catch (error) {
        console.error("[DEBUG] loadInvoicePelunasan: Error", error);
        showNotification("Terjadi kesalahan saat memuat invoice pelunasan", "error");
    }
}

/**
 * Menambah item baru ke tabel invoice
 */
function addItem() {
    console.log("[DEBUG] addItem: Menambah item baru ke tabel invoice");
    
    try {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><textarea rows="2" placeholder="Deskripsi item..." oninput="updateTotal(); autoResize(this)"></textarea></td>
            <td><input type="number" value="1" min="1" oninput="updateTotal()"></td>
            <td><input type="text" value="pcs" oninput="updateTotal()"></td>
            <td><input type="number" value="0" min="0" oninput="updateTotal()"></td>
            <td class="line-total">Rp 0</td>
        `;
        document.querySelector("#itemTable tbody").appendChild(row);
        updateTotal();
        console.log("[DEBUG] addItem: Item berhasil ditambahkan");
    } catch (error) {
        console.error("[DEBUG] addItem: Error", error);
        showNotification("Terjadi kesalahan saat menambah item", "error");
    }
}

/**
 * Menghapus item terakhir dari tabel invoice
 */
function removeLastItem() {
    console.log("[DEBUG] removeLastItem: Menghapus item terakhir dari tabel invoice");
    
    try {
        const tbody = document.querySelector("#itemTable tbody");
        if (tbody.children.length > 1) {
            tbody.removeChild(tbody.lastChild);
            updateTotal();
            console.log("[DEBUG] removeLastItem: Item berhasil dihapus");
        } else {
            console.warn("[DEBUG] removeLastItem: Minimal harus ada satu item");
            showNotification("Minimal harus ada satu item", "error");
        }
    } catch (error) {
        console.error("[DEBUG] removeLastItem: Error", error);
        showNotification("Terjadi kesalahan saat menghapus item", "error");
    }
}

/**
 * Update total invoice
 */
function updateTotal() {
    console.log("[DEBUG] updateTotal: Menghitung total invoice");
    
    try {
        let subtotal = 0;
        const rows = document.querySelectorAll("#itemTable tbody tr");
        console.log(`[DEBUG] updateTotal: Ditemukan ${rows.length} baris item`);
        
        rows.forEach((row, index) => {
            const deskripsi = row.cells[0].querySelector("textarea").value.trim();
            const qty = parseFloat(row.cells[1].querySelector("input").value) || 0;
            const harga = parseFloat(row.cells[3].querySelector("input").value) || 0;
            const sub = qty * harga;
            
            console.log(`[DEBUG] updateTotal: Baris ${index}: ${deskripsi}, qty: ${qty}, harga: ${harga}, subtotal: ${sub}`);
            
            row.cells[4].textContent = "Rp " + sub.toLocaleString("id-ID");
            subtotal += sub;
        });
        
        console.log(`[DEBUG] updateTotal: Total subtotal: ${subtotal}`);
        
        // Update subtotal in summary
        const subtotalValue = document.getElementById("subtotalValue");
        if (subtotalValue) {
            subtotalValue.textContent = "Rp " + subtotal.toLocaleString("id-ID");
            console.log("[DEBUG] updateTotal: Subtotal ditampilkan di UI");
        } else {
            console.warn("[DEBUG] updateTotal: Elemen subtotalValue tidak ditemukan");
        }
        
        // Get jenis invoice
        const jenis = getJenisInvoiceTerpilih() || {};
        console.log(`[DEBUG] updateTotal: Jenis invoice: ${jenis.jenisInvoice}`);
        
        if (jenis.jenisInvoice === 'dp') {
            // Calculate DP amount based on percentage
            const dpPercentage = jenis.dpPercentage || 50;
            const dpAmount = (subtotal * dpPercentage) / 100;
            
            console.log(`[DEBUG] updateTotal: DP percentage: ${dpPercentage}%, DP amount: ${dpAmount}`);
            
            // Update DP value in summary
            const dpValue = document.getElementById("dpValue");
            if (dpValue) {
                dpValue.textContent = "Rp " + dpAmount.toLocaleString("id-ID");
                console.log("[DEBUG] updateTotal: DP value ditampilkan di UI");
            } else {
                console.warn("[DEBUG] updateTotal: Elemen dpValue tidak ditemukan");
            }
            
            // For DP invoice, total is the DP amount (what needs to be paid now)
            const total = dpAmount;
            
            // Update grand total
            const grandTotal = document.getElementById("grandTotal");
            if (grandTotal) {
                grandTotal.textContent = "Rp " + total.toLocaleString("id-ID");
                console.log("[DEBUG] updateTotal: Grand total ditampilkan di UI");
            } else {
                console.warn("[DEBUG] updateTotal: Elemen grandTotal tidak ditemukan");
            }
            
            // Update terbilang
            const terbilangText = document.getElementById("terbilangText");
            if (terbilangText) {
                const terbilangValue = terbilang(total);
                terbilangText.textContent = "Terbilang: " + terbilangValue + " Rupiah";
                console.log(`[DEBUG] updateTotal: Terbilang: ${terbilangValue}`);
            } else {
                console.warn("[DEBUG] updateTotal: Elemen terbilangText tidak ditemukan");
            }
            
            // Save calculated DP to jenisInvoiceTerpilih
            jenis.dp = dpAmount;
            simpanJenisInvoiceTerpilih(jenis);
            console.log("[DEBUG] updateTotal: DP disimpan ke jenisInvoiceTerpilih");
        } else {
            // For regular invoice, total is the subtotal
            const total = subtotal;
            console.log(`[DEBUG] updateTotal: Total invoice regular: ${total}`);
            
            // Update grand total
            const grandTotal = document.getElementById("grandTotal");
            if (grandTotal) {
                grandTotal.textContent = "Rp " + total.toLocaleString("id-ID");
                console.log("[DEBUG] updateTotal: Grand total ditampilkan di UI");
            } else {
                console.warn("[DEBUG] updateTotal: Elemen grandTotal tidak ditemukan");
            }
            
            // Update terbilang
            const terbilangText = document.getElementById("terbilangText");
            if (terbilangText) {
                const terbilangValue = terbilang(total);
                terbilangText.textContent = "Terbilang: " + terbilangValue + " Rupiah";
                console.log(`[DEBUG] updateTotal: Terbilang: ${terbilangValue}`);
            } else {
                console.warn("[DEBUG] updateTotal: Elemen terbilangText tidak ditemukan");
            }
        }
    } catch (error) {
        console.error("[DEBUG] updateTotal: Error menghitung total", error);
    }
}

/**
 * Auto resize textarea
 * @param {HTMLTextAreaElement} textarea - Textarea element
 */
function autoResize(textarea) {
    console.log("[DEBUG] autoResize: Mengubah ukuran textarea");
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// =====================
// HELPER FUNCTIONS
// =====================
/**
 * Generate nomor invoice otomatis
 * @param {string} jenisInvoice - Jenis invoice (regular, dp, pelunasan)
 * @returns {string} Nomor invoice yang digenerate
 */
function generateNomorInvoice(jenisInvoice) {
    console.log("[DEBUG] generateNomorInvoice: Generate nomor invoice untuk jenis", jenisInvoice);
    
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        
        // Get existing invoice data
        const invoices = getInvoices();
        
        // Filter by invoice type and year/month
        const currentMonthInvoices = invoices.filter(inv => {
            const invDate = new Date(inv.tanggal);
            return inv.jenisInvoice === jenisInvoice && 
                   invDate.getFullYear() === year && 
                   invDate.getMonth() + 1 === parseInt(month);
        });
        
        // Generate sequence number
        const nextNumber = currentMonthInvoices.length + 1;
        const paddedNumber = String(nextNumber).padStart(3, '0');
        
        // Format invoice number based on type
        let prefix = "INV";
        if (jenisInvoice === "dp") prefix = "INV-DP";
        if (jenisInvoice === "pelunasan") prefix = "INV-PEL";
        
        const result = `${prefix}/${year}/${month}/${paddedNumber}`;
        console.log("[DEBUG] generateNomorInvoice: Nomor invoice generated", result);
        return result;
    } catch (error) {
        console.error("[DEBUG] generateNomorInvoice: Error", error);
        showNotification("Terjadi kesalahan saat generate nomor invoice", "error");
        return "";
    }
}

// =====================
// DATA STORAGE FUNCTIONS
// =====================
/**
 * Mendapatkan data dari localStorage
 * @param {string} key - Kunci localStorage
 * @param {string} dataType - Tipe data untuk logging
 * @returns {Array} Data dari localStorage
 */
function getDataFromLocalStorage(key, dataType) {
    console.log(`[DEBUG] getDataFromLocalStorage: Mengambil data ${dataType} dengan key ${key}`);
    
    try {
        const data = localStorage.getItem(key);
        if (!data) {
            console.log(`[DEBUG] getDataFromLocalStorage: Tidak ada data untuk key ${key}`);
            return [];
        }
        
        const parsedData = JSON.parse(data);
        console.log(`[DEBUG] getDataFromLocalStorage: Berhasil mengambil ${parsedData.length} item`);
        return parsedData;
    } catch (error) {
        console.error(`[DEBUG] getDataFromLocalStorage: Error mengambil data`, error);
        return [];
    }
}

/**
 * Menyimpan data ke localStorage
 * @param {string} key - Kunci localStorage
 * @param {Array} data - Data yang akan disimpan
 * @param {string} dataType - Tipe data untuk logging
 * @returns {boolean} True jika berhasil disimpan
 */
function saveDataToLocalStorage(key, data, dataType) {
    console.log(`[DEBUG] saveDataToLocalStorage: Menyimpan ${data.length} item ${dataType} dengan key ${key}`);
    
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`[DEBUG] saveDataToLocalStorage: Berhasil menyimpan data`);
        return true;
    } catch (error) {
        console.error(`[DEBUG] saveDataToLocalStorage: Error menyimpan data`, error);
        return false;
    }
}

/**
 * Menyimpan data ke jurnal
 * @param {Object} invoiceData - Data invoice
 */
function simpanKeJurnal(invoiceData) {
    console.log("[DEBUG] simpanKeJurnal: Menyimpan data ke jurnal untuk invoice", invoiceData.noInvoice);
    
    try {
        const jurnalData = getDataFromLocalStorage("dataJurnal", "jurnal");
        
        // Tambahkan entri jurnal untuk penjualan
        jurnalData.push({
            tanggal: invoiceData.tanggal,
            akun: "Piutang Usaha",
            keterangan: `Penjualan Invoice ${invoiceData.noInvoice} - ${invoiceData.customer}`,
            debit: invoiceData.total,
            kredit: 0,
            fromPenjualan: true,
            noInvoice: invoiceData.noInvoice,
            jenisTransaksi: invoiceData.jenisInvoice
        });
        
        jurnalData.push({
            tanggal: invoiceData.tanggal,
            akun: "Pendapatan Jasa",
            keterangan: `Penjualan Invoice ${invoiceData.noInvoice} - ${invoiceData.customer}`,
            debit: 0,
            kredit: invoiceData.total,
            fromPenjualan: true,
            noInvoice: invoiceData.noInvoice,
            jenisTransaksi: invoiceData.jenisInvoice
        });
        
        // Jika invoice DP, tambahkan entri untuk uang muka
        if (invoiceData.jenisInvoice === 'dp' && invoiceData.dp > 0) {
            console.log("[DEBUG] simpanKeJurnal: Menambahkan entri DP sebesar", invoiceData.dp);
            
            jurnalData.push({
                tanggal: invoiceData.tanggal,
                akun: "Kas",
                keterangan: `DP Invoice ${invoiceData.noInvoice} - ${invoiceData.customer}`,
                debit: invoiceData.dp,
                kredit: 0,
                fromPenjualan: true,
                noInvoice: invoiceData.noInvoice,
                jenisTransaksi: "dp"
            });
            
            jurnalData.push({
                tanggal: invoiceData.tanggal,
                akun: "Uang Muka Pelanggan",
                keterangan: `DP Invoice ${invoiceData.noInvoice} - ${invoiceData.customer}`,
                debit: 0,
                kredit: invoiceData.dp,
                fromPenjualan: true,
                noInvoice: invoiceData.noInvoice,
                jenisTransaksi: "dp"
            });
        }
        
        saveDataToLocalStorage("dataJurnal", jurnalData, "jurnal");
        console.log("[DEBUG] simpanKeJurnal: Berhasil menyimpan ke jurnal");
    } catch (error) {
        console.error("[DEBUG] simpanKeJurnal: Error", error);
    }
}

/**
 * Log aktivitas
 * @param {string} activity - Deskripsi aktivitas
 */
function logActivity(activity) {
    console.log(`[DEBUG] logActivity: Logging activity: ${activity}`);
    
    try {
        const user = getCurrentUser();
        if (!user) {
            console.warn("[DEBUG] logActivity: No user logged in, skipping activity log");
            return;
        }
        
        const activities = getDataFromLocalStorage("activities", "activity logs");
        
        activities.push({
            timestamp: new Date().toISOString(),
            user: user.username,
            role: user.role,
            activity: activity
        });
        
        // Keep only last 1000 activities
        if (activities.length > 1000) {
            activities.splice(0, activities.length - 1000);
        }
        
        saveDataToLocalStorage("activities", activities, "activity logs");
        console.log("[DEBUG] logActivity: Activity logged successfully");
    } catch (error) {
        console.error("[DEBUG] logActivity: Error logging activity", error);
    }
}

/**
 * Update laporan keuangan setelah hapus invoice
 * @param {Object} invoiceData - Data invoice yang dihapus
 */
function updateLaporanKeuanganAfterDelete(invoiceData) {
    console.log("[DEBUG] updateLaporanKeuanganAfterDelete: Update laporan keuangan setelah hapus invoice", invoiceData.noInvoice);
    
    try {
        const laporanKeuangan = getDataFromLocalStorage("laporanKeuangan", "laporan keuangan");
        
        // Filter out entries related to this invoice
        const updatedLaporan = laporanKeuangan.filter(entry => 
            entry.noInvoice !== invoiceData.noInvoice || 
            (entry.invoiceId && entry.invoiceId !== invoiceData.id)
        );
        
        saveDataToLocalStorage("laporanKeuangan", updatedLaporan, "laporan keuangan");
        console.log("[DEBUG] updateLaporanKeuanganAfterDelete: Berhasil update laporan keuangan");
    } catch (error) {
        console.error("[DEBUG] updateLaporanKeuanganAfterDelete: Error", error);
    }
}

/**
 * Simpan invoice ke database (simulasi async)
 * @param {Object} invoiceData - Data invoice
 * @returns {Promise} Promise yang resolve saat selesai
 */
function simpanInvoiceKeDatabase(invoiceData) {
    console.log("[DEBUG] simpanInvoiceKeDatabase: Menyimpan invoice ke database", invoiceData.noInvoice);
    
    return new Promise((resolve, reject) => {
        // Simulasi penyimpanan ke database dengan delay
        setTimeout(() => {
            try {
                // Di sini biasanya ada kode untuk menyimpan ke database
                // Untuk sekarang, kita hanya log dan resolve
                console.log("[DEBUG] simpanInvoiceKeDatabase: Invoice berhasil disimpan ke database");
                resolve(true);
            } catch (error) {
                console.error("[DEBUG] simpanInvoiceKeDatabase: Error", error);
                reject(error);
            }
        }, 1000);
    });
}

// =====================
// FORMAT FUNCTIONS
// =====================
/**
 * Konversi angka ke terbilang
 * @param {number} angka - Angka yang akan dikonversi
 * @returns {string} Hasil konversi terbilang
 */
function terbilang(angka) {
    console.log("[DEBUG] terbilang: Mengkonversi angka", angka, "ke terbilang");
    
    try {
        const bilne = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
        
        if (angka < 12) {
            return bilne[angka] || "";
        } else if (angka < 20) {
            return terbilang(angka - 10) + " belas";
        } else if (angka < 100) {
            return terbilang(Math.floor(angka / 10)) + " puluh " + terbilang(angka % 10);
        } else if (angka < 200) {
            return "seratus " + terbilang(angka - 100);
        } else if (angka < 1000) {
            return terbilang(Math.floor(angka / 100)) + " ratus " + terbilang(angka % 100);
        } else if (angka < 2000) {
            return "seribu " + terbilang(angka - 1000);
        } else if (angka < 1000000) {
            return terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000);
        } else if (angka < 1000000000) {
            return terbilang(Math.floor(angka / 1000000)) + " juta " + terbilang(angka % 1000000);
        } else if (angka < 1000000000000) {
            return terbilang(Math.floor(angka / 1000000000)) + " miliar " + terbilang(angka % 1000000000);
        } else if (angka < 1000000000000000) {
            return terbilang(Math.floor(angka / 1000000000000)) + " triliun " + terbilang(angka % 1000000000000);
        }
        
        return "angka terlalu besar";
    } catch (error) {
        console.error("[DEBUG] terbilang: Error", error);
        return "";
    }
}

/**
 * Format angka ke Rupiah
 * @param {number} angka - Angka yang akan diformat
 * @returns {string} Hasil format Rupiah
 */
function formatRupiah(angka) {
    console.log("[DEBUG] formatRupiah: Memformat angka", angka, "ke Rupiah");
    
    try {
        return "Rp " + angka.toLocaleString("id-ID");
    } catch (error) {
        console.error("[DEBUG] formatRupiah: Error", error);
        return "Rp 0";
    }
}

/**
 * Format tanggal ke format Indonesia
 * @param {string|Date} tanggal - Tanggal yang akan diformat
 * @returns {string} Hasil format tanggal Indonesia
 */
function formatDateIndonesia(tanggal) {
    console.log("[DEBUG] formatDateIndonesia: Memformat tanggal", tanggal);
    
    try {
        const date = new Date(tanggal);
        
        if (isNaN(date.getTime())) {
            console.error("[DEBUG] formatDateIndonesia: Invalid date");
            return "-";
        }
        
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    } catch (error) {
        console.error("[DEBUG] formatDateIndonesia: Error", error);
        return "-";
    }
}

// =====================
// INVOICE SELECTION FUNCTIONS
// =====================
/**
 * Mendapatkan pelanggan terpilih
 * @returns {Object|null} Pelanggan object atau null jika tidak ada
 */
function getPelangganTerpilih() {
    console.log("[DEBUG] getPelangganTerpilih: Mengambil pelanggan terpilih");
    
    try {
        const selectedPelanggan = localStorage.getItem("selectedPelanggan");
        if (!selectedPelanggan) {
            console.log("[DEBUG] getPelangganTerpilih: Tidak ada pelanggan terpilih");
            return null;
        }
        
        const pelanggan = JSON.parse(selectedPelanggan);
        console.log("[DEBUG] getPelangganTerpilih: Pelanggan terpilih", pelanggan.nama);
        return pelanggan;
    } catch (error) {
        console.error("[DEBUG] getPelangganTerpilih: Error", error);
        return null;
    }
}

/**
 * Mendapatkan jenis invoice terpilih
 * @returns {Object|null} Jenis invoice object atau null jika tidak ada
 */
function getJenisInvoiceTerpilih() {
    console.log("[DEBUG] getJenisInvoiceTerpilih: Mengambil jenis invoice terpilih");
    
    try {
        const selectedJenis = localStorage.getItem("jenisInvoiceTerpilih");
        if (!selectedJenis) {
            console.log("[DEBUG] getJenisInvoiceTerpilih: Tidak ada jenis invoice terpilih");
            return null;
        }
        
        const jenis = JSON.parse(selectedJenis);
        console.log("[DEBUG] getJenisInvoiceTerpilih: Jenis invoice terpilih", jenis.jenisInvoice);
        return jenis;
    } catch (error) {
        console.error("[DEBUG] getJenisInvoiceTerpilih: Error", error);
        return null;
    }
}

/**
 * Simpan jenis invoice terpilih
 * @param {Object} jenisData - Data jenis invoice
 */
function simpanJenisInvoiceTerpilih(jenisData) {
    console.log("[DEBUG] simpanJenisInvoiceTerpilih: Menyimpan jenis invoice terpilih", jenisData.jenisInvoice);
    
    try {
        localStorage.setItem("jenisInvoiceTerpilih", JSON.stringify(jenisData));
        console.log("[DEBUG] simpanJenisInvoiceTerpilih: Berhasil menyimpan jenis invoice terpilih");
    } catch (error) {
        console.error("[DEBUG] simpanJenisInvoiceTerpilih: Error", error);
    }
}

/**
 * Load DP invoices untuk pelunasan
 */
function loadDPInvoices() {
    console.log("[DEBUG] loadDPInvoices: Memuat invoice DP untuk pelunasan");
    
    try {
        // Mendapatkan pelanggan terpilih
        const selectedPelanggan = getPelangganTerpilih();
        if (!selectedPelanggan) {
            console.error("[DEBUG] loadDPInvoices: Pelanggan tidak dipilih");
            return;
        }
        
        // Mendapatkan semua invoice
        const invoices = getInvoices();
        
        // Filter invoice DP yang belum lunas untuk pelanggan ini
        const dpInvoices = invoices.filter(inv => 
            inv.jenisInvoice === 'dp' && 
            inv.status === "Belum Lunas" && 
            inv.customer === selectedPelanggan.nama
        );
        
        console.log("[DEBUG] loadDPInvoices: Ditemukan", dpInvoices.length, "invoice DP untuk pelunasan");
        
        // Tampilkan di UI
        const dpInvoicesContainer = document.getElementById("dpInvoicesContainer");
        if (dpInvoicesContainer) {
            dpInvoicesContainer.innerHTML = "";
            
            if (dpInvoices.length === 0) {
                dpInvoicesContainer.innerHTML = "<p>Tidak ada invoice DP yang belum lunas</p>";
                return;
            }
            
            dpInvoices.forEach(invoice => {
                const invoiceElement = document.createElement("div");
                invoiceElement.className = "invoice-item";
                invoiceElement.innerHTML = `
                    <div class="invoice-info">
                        <div class="invoice-number">${invoice.noInvoice}</div>
                        <div class="invoice-date">${formatDateIndonesia(invoice.tanggal)}</div>
                        <div class="invoice-amount">Total: ${formatRupiah(invoice.total)}</div>
                        <div class="invoice-dp">DP: ${formatRupiah(invoice.dp)}</div>
                        <div class="invoice-sisa">Sisa: ${formatRupiah(invoice.sisa)}</div>
                    </div>
                    <div class="invoice-actions">
                        <button type="button" class="btn btn-sm btn-primary" onclick="selectDPInvoice('${invoice.noInvoice}')">
                            Pilih
                        </button>
                    </div>
                `;
                dpInvoicesContainer.appendChild(invoiceElement);
            });
        } else {
            console.warn("[DEBUG] loadDPInvoices: Elemen dpInvoicesContainer tidak ditemukan");
        }
    } catch (error) {
        console.error("[DEBUG] loadDPInvoices: Error", error);
    }
}

/**
 * Select DP invoice untuk pelunasan
 * @param {string} noInvoice - Nomor invoice DP yang dipilih
 */
function selectDPInvoice(noInvoice) {
    console.log("[DEBUG] selectDPInvoice: Memilih invoice DP", noInvoice);
    
    try {
        const invoice = getInvoiceByNo(noInvoice);
        if (!invoice) {
            console.error("[DEBUG] selectDPInvoice: Invoice tidak ditemukan");
            showNotification("Invoice tidak ditemukan", "error");
            return;
        }
        
        // Simpan ke localStorage
        localStorage.setItem("selectedDPInvoice", JSON.stringify(invoice));
        
        // Update UI
        const selectedDPInfo = document.getElementById("selectedDPInfo");
        if (selectedDPInfo) {
            selectedDPInfo.innerHTML = `
                <div class="selected-invoice">
                    <div class="invoice-number">${invoice.noInvoice}</div>
                    <div class="invoice-date">${formatDateIndonesia(invoice.tanggal)}</div>
                    <div class="invoice-amount">Total: ${formatRupiah(invoice.total)}</div>
                    <div class="invoice-dp">DP: ${formatRupiah(invoice.dp)}</div>
                    <div class="invoice-sisa">Sisa: ${formatRupiah(invoice.sisa)}</div>
                    <button type="button" class="btn btn-sm btn-danger" onclick="clearSelectedDPInvoice()">
                        Hapus
                    </button>
                </div>
            `;
            
            // Update pelunasan amount
            const pelunasanAmountInput = document.getElementById("pelunasanAmount");
            if (pelunasanAmountInput) {
                pelunasanAmountInput.value = invoice.sisa;
                updateTotalPelunasan();
            }
        }
        
        console.log("[DEBUG] selectDPInvoice: Invoice DP berhasil dipilih");
        showNotification("Invoice DP berhasil dipilih");
    } catch (error) {
        console.error("[DEBUG] selectDPInvoice: Error", error);
        showNotification("Terjadi kesalahan saat memilih invoice DP", "error");
    }
}

/**
 * Clear selected DP invoice
 */
function clearSelectedDPInvoice() {
    console.log("[DEBUG] clearSelectedDPInvoice: Menghapus pilihan invoice DP");
    
    try {
        localStorage.removeItem("selectedDPInvoice");
        
        // Update UI
        const selectedDPInfo = document.getElementById("selectedDPInfo");
        if (selectedDPInfo) {
            selectedDPInfo.innerHTML = "<p>Tidak ada invoice DP yang dipilih</p>";
        }
        
        // Reset pelunasan amount
        const pelunasanAmountInput = document.getElementById("pelunasanAmount");
        if (pelunasanAmountInput) {
            pelunasanAmountInput.value = 0;
            updateTotalPelunasan();
        }
        
        console.log("[DEBUG] clearSelectedDPInvoice: Pilihan invoice DP berhasil dihapus");
    } catch (error) {
        console.error("[DEBUG] clearSelectedDPInvoice: Error", error);
    }
}

/**
 * Update total pelunasan
 */
function updateTotalPelunasan() {
    console.log("[DEBUG] updateTotalPelunasan: Menghitung total pelunasan");
    
    try {
        const pelunasanAmountInput = document.getElementById("pelunasanAmount");
        const pelunasanAmount = parseFloat(pelunasanAmountInput.value) || 0;
        
        console.log("[DEBUG] updateTotalPelunasan: Jumlah pelunasan", pelunasanAmount);
        
        // Update grand total
        const grandTotal = document.getElementById("grandTotal");
        if (grandTotal) {
            grandTotal.textContent = "Rp " + pelunasanAmount.toLocaleString("id-ID");
            console.log("[DEBUG] updateTotalPelunasan: Grand total ditampilkan di UI");
        } else {
            console.warn("[DEBUG] updateTotalPelunasan: Elemen grandTotal tidak ditemukan");
        }
        
        // Update terbilang
        const terbilangText = document.getElementById("terbilangText");
        if (terbilangText) {
            const terbilangValue = terbilang(pelunasanAmount);
            terbilangText.textContent = "Terbilang: " + terbilangValue + " Rupiah";
            console.log(`[DEBUG] updateTotalPelunasan: Terbilang: ${terbilangValue}`);
        } else {
            console.warn("[DEBUG] updateTotalPelunasan: Elemen terbilangText tidak ditemukan");
        }
    } catch (error) {
        console.error("[DEBUG] updateTotalPelunasan: Error", error);
    }
}

// =====================
// INITIALIZATION
// =====================

/**
 * Inisialisasi fitur pencetakan
 */
function initializePrintFeatures() {
    console.log("[DEBUG] initializePrintFeatures: Menginisialisasi fitur pencetakan");
    
    try {
        // Setup event listener untuk print
        setupPrintEventListeners();
        
        // Tambahkan CSS untuk media print
        const printStyles = document.createElement('style');
        printStyles.setAttribute('type', 'text/css');
        printStyles.setAttribute('media', 'print');
        printStyles.textContent = `
            @media print {
                /* Reset semua properti textarea untuk print */
                textarea {
                    all: initial !important;
                    display: inline-block !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: auto !important;
                    overflow: visible !important;
                    white-space: pre-wrap !important;
                    word-wrap: break-word !important;
                    border: none !important;
                    resize: none !important;
                    orphans: 3 !important;
                    widows: 3 !important;
                    page-break-inside: avoid !important;
                }
                
                /* Pastikan tabel tidak terpotong */
                table {
                    page-break-inside: avoid !important;
                }
                
                tr {
                    page-break-inside: avoid !important;
                }
                
                td {
                    page-break-inside: avoid !important;
                }
                
                /* Hindari elemen terpotong di antara halaman */
                .invoice-container, .invoice-header, .invoice-footer {
                    page-break-inside: avoid !important;
                }
            }
        `;
        document.head.appendChild(printStyles);
        
        console.log("[DEBUG] initializePrintFeatures: Fitur pencetakan berhasil diinisialisasi");
    } catch (error) {
        console.error("[DEBUG] initializePrintFeatures: Error", error);
    }
}

// Panggil fungsi inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', function() {
    console.log("[DEBUG] DOM loaded, initializing print features");
    initializePrintFeatures();
});