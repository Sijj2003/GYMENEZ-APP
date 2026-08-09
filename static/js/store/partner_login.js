const API_URL = 'https://sijj2003.pythonanywhere.com/api/partner';

// ==========================================
// 1. AUTO REDIRECCIÓN SI YA ESTÁ LOGUEADO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('gymenez_partner_token');
    if (token) {
        window.location.href = '/store/partner/dashboard.html';
    }
});

// ==========================================
// 2. OBTENER NOMBRE DEL DISPOSITIVO
// ==========================================
function getDeviceName() {
    const ua = navigator.userAgent;
    let browser = "Navegador Desconocido";
    if(ua.includes("Firefox")) browser = "Firefox";
    else if(ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if(ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if(ua.includes("Edg")) browser = "Edge";

    let os = "OS Desconocido";
    if(ua.includes("Win")) os = "Windows";
    else if(ua.includes("Mac")) os = "Mac";
    else if(ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
    else if(ua.includes("Android")) os = "Android";
    else if(ua.includes("like Mac")) os = "iOS";

    return `${browser} en ${os}`;
}

// Variables globales para el cierre de sesión
let pendingLoginEmail = '';
let pendingLoginPassword = '';
let originalLoginButtonContent = '';

// ==========================================
// 3. FUNCIÓN UNIFICADA DE LOGIN
// ==========================================
document.getElementById('form-login-action').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    originalLoginButtonContent = btn.innerHTML; // Guardamos el texto original
    
    pendingLoginEmail = document.getElementById('login-email').value;
    pendingLoginPassword = document.getElementById('login-password').value;

    btn.innerHTML = '<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: pendingLoginEmail, 
                password: pendingLoginPassword,
                device_name: getDeviceName() 
            })
        });

        const data = await response.json();

        if (response.status === 409 && data.requires_session_kill) {
            // 🛡️ LÍMITE ALCANZADO: MUESTRA EL MODAL (No reseteamos el botón aquí porque el proceso sigue)
            openSessionModal(data.active_sessions);
        } else if (response.ok && data.success) {
            localStorage.setItem('gymenez_partner_token', data.token);
            showToast(`Bienvenido de vuelta, ${data.store_name}`, 'success');
            setTimeout(() => { window.location.href = '/store/partner/dashboard.html'; }, 1500);
        } else {
            showToast(data.error || "Credenciales inválidas.", "error");
            btn.innerHTML = originalLoginButtonContent;
            btn.disabled = false;
        }
    } catch (error) {
        showToast("Error de red. Verifica tu conexión.", "error");
        btn.innerHTML = originalLoginButtonContent;
        btn.disabled = false;
    } 
});

// ==========================================
// 4. LÓGICA DEL MODAL DE SESIONES
// ==========================================
function openSessionModal(sessions) {
    const modal = document.getElementById('session-limit-modal');
    const list = document.getElementById('active-sessions-list');
    
    list.innerHTML = sessions.map(s => `
        <button onclick="killSessionAndLogin('${s.session_id}')" class="w-full flex items-center justify-between p-4 bg-[#12121a] border border-white/10 rounded-2xl hover:border-red-500 hover:bg-red-500/10 transition-colors group">
            <div class="flex flex-col text-left">
                <span class="text-sm font-bold text-white group-hover:text-red-400 transition-colors">${s.device_name}</span>
                <span class="text-[9px] uppercase tracking-widest text-gray-500 mt-1">Cerrar esta sesión</span>
            </div>
            <svg class="w-5 h-5 text-gray-600 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"></path></svg>
        </button>
    `).join('');

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
}

function closeSessionModal() {
    const modal = document.getElementById('session-limit-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);

    // 🚀 NUEVO: Si el usuario se arrepiente y cierra el modal, destrabamos el botón principal
    const btn = document.getElementById('btn-login');
    if (btn && originalLoginButtonContent) {
        btn.innerHTML = originalLoginButtonContent;
        btn.disabled = false;
    }
}

async function killSessionAndLogin(sessionIdToKill) {
    closeSessionModal();
    const btn = document.getElementById('btn-login');
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>';
    btn.disabled = true; // Aseguramos que siga bloqueado mientras mata la sesión
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: pendingLoginEmail, 
                password: pendingLoginPassword,
                device_name: getDeviceName(),
                session_to_kill: sessionIdToKill
            })
        });

        const data = await response.json();
        
        if (response.status === 409 && data.requires_session_kill) {
            openSessionModal(data.active_sessions);
        } 
        else if (response.ok && data.success) {
            localStorage.setItem('gymenez_partner_token', data.token);
            showToast("Sesión remota finalizada. Entrando...", "success");
            setTimeout(() => { window.location.href = '/store/partner/dashboard.html'; }, 1000);
        } else {
            showToast(data.error || "No se pudo cerrar la sesión remota.", "error");
            btn.innerHTML = originalLoginButtonContent;
            btn.disabled = false;
        }
    } catch (error) {
        showToast("Fallo de conexión.", "error");
        btn.innerHTML = originalLoginButtonContent;
        btn.disabled = false;
    }
}

// =====================================
// LÓGICA DE INTERFAZ & ANIMACIONES
// =====================================
function toggleForms(target) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (target === 'register') {
        loginForm.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            setTimeout(() => {
                registerForm.classList.remove('opacity-0');
            }, 50);
        }, 300);
    } else {
        registerForm.classList.add('opacity-0');
        setTimeout(() => {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            setTimeout(() => {
                loginForm.classList.remove('opacity-0', 'scale-95');
            }, 50);
        }, 300);
    }
}

function updateFileLabel(input, labelId) {
    const label = document.getElementById(labelId);
    if (input.files && input.files[0]) {
        label.innerText = input.files[0].name;
        if(labelId === 'label-logo') {
            label.classList.remove('text-gray-500');
            label.classList.add('text-[#FFC300]');
        } else {
            label.classList.remove('text-gray-500');
            label.classList.add('text-emerald-400');
        }
    } else {
        label.innerText = 'Tocar para subir...';
        label.className = 'text-xs text-gray-500 transition truncate w-40';
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgObj = document.getElementById('toast-msg');
    const iconObj = document.getElementById('toast-icon');

    toast.className = 'transform opacity-0 -translate-y-10 transition-all duration-500 ease-out bg-white/95 backdrop-blur-xl text-black px-6 py-3.5 rounded-full font-bold text-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center gap-3 border border-black/5';
    
    if (type === 'success') {
        iconObj.innerHTML = '<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
    } else {
        iconObj.innerHTML = '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    }

    msgObj.innerText = message;

    setTimeout(() => {
        toast.classList.remove('opacity-0', '-translate-y-10');
        toast.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-10');
    }, 4000);
}

// =====================================
// API CALLS: REGISTRO KYC (FormData)
// =====================================
document.getElementById('form-register-action').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-register');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div><span class="ml-2">Subiendo documentos...</span>';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('storeName', document.getElementById('reg-storeName').value);
    formData.append('docType', document.getElementById('reg-docType').value);
    formData.append('docNumber', document.getElementById('reg-docNumber').value);
    formData.append('email', document.getElementById('reg-email').value);
    formData.append('phone', document.getElementById('reg-phone').value);
    formData.append('password', document.getElementById('reg-password').value);

    const cedula = document.getElementById('reg-cedula').files[0];
    const rif = document.getElementById('reg-rif').files[0];
    const logo = document.getElementById('reg-logo').files[0];

    if (cedula) formData.append('cedula', cedula);
    if (rif) formData.append('rif', rif);
    if (logo) formData.append('logo', logo);

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            body: formData 
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('¡Documentos enviados a auditoría exitosamente!', 'success');
            e.target.reset();
            document.getElementById('label-cedula').innerText = 'Tocar para subir...';
            document.getElementById('label-rif').innerText = 'Tocar para subir...';
            document.getElementById('label-logo').innerText = 'Tocar para subir...';
            
            setTimeout(() => { toggleForms('login'); }, 3000);
        } else {
            showToast(data.error || 'Error en el registro', 'error');
        }
    } catch (error) {
        showToast('Error de red al subir los documentos.', 'error');
    } finally {
        if(btn.disabled) { 
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
});

// =====================================
// 5. RECUPERACIÓN DE CONTRASEÑA (OTP)
// =====================================

function openRecoveryModal() {
    const modal = document.getElementById('recovery-modal');
    const modalInner = modal.querySelector('div');
    
    // Resetear vistas al estado inicial
    document.getElementById('form-recovery-step1').classList.remove('opacity-0', 'pointer-events-none', '-translate-x-10');
    document.getElementById('form-recovery-step2').classList.add('opacity-0', 'pointer-events-none', 'translate-x-10');
    document.getElementById('recovery-email').value = document.getElementById('login-email').value; // Autocompletar si ya había escrito algo
    document.getElementById('recovery-otp').value = '';
    document.getElementById('recovery-new-password').value = '';

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalInner.classList.remove('scale-95');
    }, 10);
}

function closeRecoveryModal() {
    const modal = document.getElementById('recovery-modal');
    const modalInner = modal.querySelector('div');
    modal.classList.add('opacity-0');
    modalInner.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

let storedRecoveryEmail = '';

// PASO 1: Solicitar el Código
document.getElementById('form-recovery-step1').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-recovery-step1');
    const originalText = btn.innerHTML;
    const email = document.getElementById('recovery-email').value;

    btn.innerHTML = '<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            storedRecoveryEmail = email; // Guardamos el correo para el paso 2
            
            // Transición animada al Paso 2
            const step1 = document.getElementById('form-recovery-step1');
            const step2 = document.getElementById('form-recovery-step2');
            
            step1.classList.add('opacity-0', 'pointer-events-none', '-translate-x-10');
            setTimeout(() => {
                step2.classList.remove('opacity-0', 'pointer-events-none', 'translate-x-10');
            }, 300);
            
            showToast("Código solicitado. Revisa tu bandeja de entrada.", "success");
        } else {
            showToast(data.error || "Error al solicitar el código.", "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        showToast("Error de conexión.", "error");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// PASO 2: Verificar OTP y Cambiar Clave
document.getElementById('form-recovery-step2').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-recovery-step2');
    const originalText = btn.innerHTML;
    
    const otp = document.getElementById('recovery-otp').value;
    const newPassword = document.getElementById('recovery-new-password').value;

    btn.innerHTML = '<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: storedRecoveryEmail,
                otp: otp,
                new_password: newPassword
            })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showToast("✅ Credencial actualizada. Las sesiones previas fueron cerradas.", "success");
            setTimeout(() => {
                closeRecoveryModal();
                // Opcional: Llenar el input del login con la nueva data para facilitarle la vida
                document.getElementById('login-email').value = storedRecoveryEmail;
                document.getElementById('login-password').value = newPassword;
            }, 1500);
        } else {
            showToast(data.error || "Código inválido o expirado.", "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        showToast("Error de conexión.", "error");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
