// ====================================================================
// ⚙️ CONFIGURACIÓN DE API E IDENTIDAD DE RED
// ====================================================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';
const ADMIN_TOKEN_KEY = 'gymen_admin_token';

// Variable global para persistir el email entre pasos del login
let loginEmailTemp = "";

window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    if (localStorage.getItem('adminSession') && localStorage.getItem(ADMIN_TOKEN_KEY)) {
        window.location.href = '/apps/admin/dashboard.html';
    }
});

function showUIFeedback(message, type = 'error') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1';
    box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

// 1. PRIMER PASO: Validar Credenciales
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    loginEmailTemp = document.getElementById('login-email').value.trim();
    const passwordField = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.textContent = 'VALIDANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmailTemp, password: passwordField })
        });
        const data = await res.json();

        if (res.status === 202 && data.requires_2fa) {
            btn.disabled = false;
            btn.textContent = 'Verificar Credenciales';
            // Mostrar Modal 2FA
            document.getElementById('2fa-modal').classList.remove('hidden');
            document.getElementById('otp-input').focus();
        } else if (res.ok && data.success) {
            localStorage.setItem('adminSession', JSON.stringify(data.admin));
            localStorage.setItem(ADMIN_TOKEN_KEY, data.admin.token);
            window.location.href = '/apps/admin/dashboard.html';
        } else {
            showUIFeedback(data.error || 'Acceso denegado.', 'error');
            btn.disabled = false;
            btn.textContent = 'Verificar Credenciales';
        }
    } catch (err) {
        showUIFeedback('Falla de conexión con el Servidor Central.', 'error');
        btn.disabled = false;
        btn.textContent = 'Verificar Credenciales';
    }
});

// 2. SEGUNDO PASO: Verificar Código 2FA con Auto-Cierre
document.getElementById('btn-verify-2fa').addEventListener('click', async () => {
    const otpInput = document.getElementById('otp-input');
    const otpCode = otpInput.value.trim();
    const btn = document.getElementById('btn-verify-2fa');
    const modal = document.getElementById('2fa-modal');
    
    if (otpCode.length !== 6) {
        modal.classList.add('hidden'); // Auto-cierre
        otpInput.value = '';
        showUIFeedback("El código debe tener 6 dígitos.", "error");
        return;
    }

    btn.disabled = true;
    btn.textContent = "ACCEDIENDO...";

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmailTemp, otp_code: otpCode })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            localStorage.setItem('adminSession', JSON.stringify(data.admin));
            localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
            window.location.href = '/apps/admin/dashboard.html';
        } else {
            // 🔥 CIERRE AUTOMÁTICO EN CASO DE ERROR
            modal.classList.add('hidden');
            otpInput.value = '';
            btn.disabled = false;
            btn.textContent = 'Acceder al Core';
            showUIFeedback(data.error || 'Código 2FA incorrecto.', 'error');
        }
    } catch (err) {
        // 🔥 CIERRE AUTOMÁTICO EN CASO DE ERROR DE RED
        modal.classList.add('hidden');
        otpInput.value = '';
        btn.disabled = false;
        btn.textContent = 'Acceder al Core';
        showUIFeedback('Falla de conexión al verificar 2FA.', 'error');
    }
});

// 3. BOTÓN DE CIERRE (X)
document.getElementById('btn-close-2fa').addEventListener('click', () => {
    document.getElementById('2fa-modal').classList.add('hidden');
    document.getElementById('otp-input').value = '';
});

// Sanitización del input OTP
document.getElementById('otp-input').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '');
});
