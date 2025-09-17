// sessionTimeout.js

// Konfigurasi timeout sesi (dalam milidetik)
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 menit
const WARNING_BEFORE_TIMEOUT = 1 * 60 * 1000; // Tampilkan peringatan 1 menit sebelum timeout

let idleTimer;
let warningTimer;
let countdownTimer;
let timeLeft;

/**
 * Inisialisasi deteksi aktivitas untuk session timeout
 */
function initSessionTimeout() {
    // Hanya inisialisasi jika user sudah login
    if (!getCurrentUser()) {
        return;
    }

    // Event listener untuk aktivitas pengguna
    const events = [
        'mousedown', 'mousemove', 'keypress', 
        'scroll', 'touchstart', 'click'
    ];
    
    events.forEach(event => {
        document.addEventListener(event, resetIdleTimer, true);
    });
    
    // Mulai timer idle
    resetIdleTimer();
}

/**
 * Reset timer idle
 */
function resetIdleTimer() {
    // Hanya reset jika user sudah login
    if (!getCurrentUser()) {
        return;
    }

    // Hapus timer yang ada
    clearTimeout(idleTimer);
    clearTimeout(warningTimer);
    clearInterval(countdownTimer);
    
    // Sembunyikan modal peringatan jika sedang ditampilkan
    const warningModal = document.getElementById('sessionWarning');
    if (warningModal) {
        warningModal.classList.remove('active');
    }
    
    // Set timer baru untuk peringatan
    warningTimer = setTimeout(showSessionWarning, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);
    
    // Set timer baru untuk timeout
    idleTimer = setTimeout(autoLogout, SESSION_TIMEOUT);
}

/**
 * Tampilkan modal peringatan session akan berakhir
 */
function showSessionWarning() {
    // Cek apakah user masih login
    if (!getCurrentUser()) {
        return;
    }

    // Buat modal jika belum ada
    let warningModal = document.getElementById('sessionWarning');
    if (!warningModal) {
        createSessionWarningModal();
        warningModal = document.getElementById('sessionWarning');
    }
    
    warningModal.classList.add('active');
    
    // Set waktu tersisa (dalam detik)
    timeLeft = Math.floor(WARNING_BEFORE_TIMEOUT / 1000);
    updateCountdown();
    
    // Update countdown setiap detik
    countdownTimer = setInterval(updateCountdown, 1000);
    
    // Event listener untuk tombol perpanjang sesi
    document.getElementById('extendSession').onclick = function() {
        resetIdleTimer();
        showNotification('Sesi telah diperpanjang', 'success');
    };
    
    // Event listener untuk tombol logout
    document.getElementById('logoutNow').onclick = function() {
        autoLogout();
    };
}

/**
 * Buat modal peringatan session
 */
function createSessionWarningModal() {
    const modal = document.createElement('div');
    modal.id = 'sessionWarning';
    modal.className = 'session-warning';
    
    modal.innerHTML = `
        <div class="session-warning-content">
            <div class="session-warning-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="session-warning-title">Sesi Akan Berakhir</h3>
            <p class="session-warning-message">
                Anda telah tidak aktif untuk beberapa waktu. Sesi Anda akan berakhir dalam:
            </p>
            <div class="session-warning-timer" id="sessionTimer">01:00</div>
            <div class="session-warning-buttons">
                <button id="extendSession" class="session-warning-btn session-warning-extend">
                    Perpanjang Sesi
                </button>
                <button id="logoutNow" class="session-warning-btn session-warning-logout">
                    Logout Sekarang
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Tambahkan styles untuk modal jika belum ada
    if (!document.getElementById('sessionWarningStyles')) {
        const styles = document.createElement('style');
        styles.id = 'sessionWarningStyles';
        styles.textContent = `
            .session-warning {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }
            
            .session-warning.active {
                opacity: 1;
                visibility: visible;
            }
            
            .session-warning-content {
                background-color: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                text-align: center;
                transform: scale(0.9);
                transition: transform 0.3s;
            }
            
            .session-warning.active .session-warning-content {
                transform: scale(1);
            }
            
            .session-warning-icon {
                font-size: 48px;
                color: #dd6b20;
                margin-bottom: 20px;
            }
            
            .session-warning-title {
                font-size: 22px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 15px;
            }
            
            .session-warning-message {
                font-size: 16px;
                color: #718096;
                margin-bottom: 25px;
                line-height: 1.5;
            }
            
            .session-warning-timer {
                font-size: 24px;
                font-weight: 700;
                color: #dd6b20;
                margin-bottom: 25px;
            }
            
            .session-warning-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .session-warning-btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            
            .session-warning-extend {
                background-color: #3182ce;
                color: white;
            }
            
            .session-warning-extend:hover {
                background-color: #2c5aa0;
            }
            
            .session-warning-logout {
                background-color: #e2e8f0;
                color: #2d3748;
            }
            
            .session-warning-logout:hover {
                background-color: #cbd5e0;
            }
            
            @media (max-width: 480px) {
                .session-warning-content {
                    padding: 20px;
                }
                
                .session-warning-title {
                    font-size: 20px;
                }
                
                .session-warning-message {
                    font-size: 15px;
                }
                
                .session-warning-timer {
                    font-size: 22px;
                }
                
                .session-warning-buttons {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

/**
 * Update tampilan countdown timer
 */
function updateCountdown() {
    timeLeft--;
    
    // Format waktu ke MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById('sessionTimer');
    if (timerElement) {
        timerElement.textContent = formattedTime;
    }
    
    // Jika waktu habis, logout otomatis
    if (timeLeft <= 0) {
        autoLogout();
    }
}

/**
 * Logout otomatis karena session timeout
 */
function autoLogout() {
    // Hapus timer
    clearTimeout(idleTimer);
    clearTimeout(warningTimer);
    clearInterval(countdownTimer);
    
    // Sembunyikan modal peringatan
    const warningModal = document.getElementById('sessionWarning');
    if (warningModal) {
        warningModal.classList.remove('active');
    }
    
    // Logout user
    logout();
}

/**
 * Mendapatkan user yang sedang login
 * @returns {object|null} User object jika ada, null jika belum login
 */
function getCurrentUser() {
    try {
        const saved = localStorage.getItem("currentUser");
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error("Error getting current user:", error);
        return null;
    }
}

/**
 * Logout user dan redirect ke halaman index
 */
function logout() {
    const user = getCurrentUser();
    localStorage.removeItem("currentUser");
    
    // Tampilkan notifikasi
    showNotification("Sesi Anda telah berakhir. Silakan login kembali.", "warning");
    
    // Log aktivitas logout
    if (user) {
        logActivity(`User ${user.username} (${user.role}) logout karena session timeout`);
    }
    
    // Redirect ke halaman login setelah 2 detik
    setTimeout(() => {
        window.location.href = "index.html";
    }, 2000);
}

/**
 * Tampilkan notifikasi kepada user
 * @param {string} message - Pesan notifikasi
 * @param {string} type - Tipe notifikasi (success, error, info, warning)
 */
function showNotification(message, type = "info") {
    // Cek apakah ada container notifikasi
    let notificationContainer = document.getElementById("notificationContainer");
    
    if (!notificationContainer) {
        // Buat container notifikasi jika belum ada
        notificationContainer = document.createElement("div");
        notificationContainer.id = "notificationContainer";
        notificationContainer.style.position = "fixed";
        notificationContainer.style.top = "20px";
        notificationContainer.style.right = "20px";
        notificationContainer.style.zIndex = "9999";
        document.body.appendChild(notificationContainer);
    }
    
    // Buat elemen notifikasi
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style untuk notifikasi
    notification.style.padding = "12px 20px";
    notification.style.marginBottom = "10px";
    notification.style.borderRadius = "4px";
    notification.style.color = "white";
    notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    notification.style.transform = "translateX(120%)";
    notification.style.transition = "transform 0.3s ease";
    
    // Warna berdasarkan tipe
    const colors = {
        success: "#4CAF50",
        error: "#F44336",
        info: "#2196F3",
        warning: "#FF9800"
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Tambahkan icon berdasarkan tipe
    const icons = {
        success: "✓",
        error: "✗",
        info: "ℹ",
        warning: "⚠"
    };
    notification.innerHTML = `<span style="margin-right: 8px;">${icons[type] || icons.info}</span>${message}`;
    
    // Tambahkan ke container
    notificationContainer.appendChild(notification);
    
    // Animasi muncul
    setTimeout(() => {
        notification.style.transform = "translateX(0)";
    }, 10);
    
    // Hapus otomatis setelah 3 detik
    setTimeout(() => {
        notification.style.transform = "translateX(120%)";
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Log aktivitas user
 * @param {string} activity - Deskripsi aktivitas
 */
function logActivity(activity) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const logs = JSON.parse(localStorage.getItem("activityLogs")) || [];
        
        logs.push({
            timestamp: new Date().toISOString(),
            user: user.username,
            role: user.role,
            activity: activity,
            page: window.location.pathname.split('/').pop() || 'unknown'
        });
        
        // Simpan maksimal 100 log terakhir
        if (logs.length > 100) {
            logs.shift();
        }
        
        localStorage.setItem("activityLogs", JSON.stringify(logs));
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}

// Inisialisasi session timeout saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', function() {
    initSessionTimeout();
});