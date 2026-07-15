// ====================================================================
// ⚙️ CONFIGURACIÓN DE API E IDENTIDAD DE RED
// ====================================================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || 
                               window.location.hostname === 'localhost' || 
                               window.location.protocol === 'file:';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';
const AUTH_TOKEN_KEY = 'gymen_auth_token';

// Generar o recuperar huella digital del dispositivo local (Evita suplantación)
function getDeviceId() {
    let deviceId = localStorage.getItem('gymen_device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('gymen_device_id', deviceId);
    }
    return deviceId;
}

const localDeviceId = getDeviceId();

// ====================================================================
// 🎨 MANEJO DE INTERFAZ Y PRELOADER
// ====================================================================
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    const nav = document.getElementById('main-nav');
    const footer = document.getElementById('main-footer');

    // Desvanecer preloader
    preloader.style.opacity = '0';
    setTimeout(() => {
        preloader.style.display = 'none';
        document.body.classList.add('loaded');
        
        // Cargar animación de entrada del Nav y el Footer
        nav.classList.remove('opacity-0', '-translate-y-4');
        footer.classList.remove('opacity-0');
        footer.classList.add('opacity-40');
    }, 1000);

    // Si ya existe sesión activa localmente, mandar al destino correcto
    if (localStorage.getItem('userSession')) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');
        window.location.href = redirectUrl ? redirectUrl : '/apps/start/inicio.html';
    }
});

// Alertas flotantes UI (Feedback Visual)
function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    
    // Asignación de estilos dinámicos según el tipo de alerta
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${
        type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'
    }`;
    
    // Animación de entrada y salida
    box.style.opacity = '1';
    box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translate(-50%, -20px)';
    }, 4000);
}

// Utilidad universal para abrir/cerrar modales suavemente
function toggleModal(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) {
        el.classList.remove('hidden');
        setTimeout(() => el.classList.remove('opacity-0'), 10);
    } else {
        el.classList.add('opacity-0');
        setTimeout(() => el.classList.add('hidden'), 300);
    }
}

// ====================================================================
// 🛡️ RESTRICCIONES DE ENTRADA (MASCARAS NUMÉRICAS)
// ====================================================================
document.getElementById('force-shield-code')?.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });
document.getElementById('activation-code')?.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });
document.getElementById('forgot-code')?.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });
document.getElementById('unlock-code')?.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });

// ====================================================================
// 🔗 GESTIÓN DE MODALES DE ENLACES SECUNDARIOS
// ====================================================================
document.getElementById('staff-access-link').addEventListener('click', () => toggleModal('area-selection-modal', true));
document.getElementById('modal-close-btn').addEventListener('click', () => toggleModal('area-selection-modal', false));

// Apertura del Hub Central de Asistencia (Recuperación y Desbloqueo)
document.getElementById('forgot-password-link').addEventListener('click', () => {
    switchRecoveryView('menu');
    toggleModal('recovery-center-modal', true);
});

// ====================================================================
// 🚀 OPERACIÓN CENTRAL: LOGIN DEL ATLETA
// ====================================================================
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const emailField = document.getElementById('login-email').value.trim();
    const passwordField = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.textContent = 'AUTENTICANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailField, password: passwordField, deviceId: localDeviceId })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            // Guardado exitoso y redirección inteligente (SSO)
            localStorage.setItem('userSession', JSON.stringify(data.user));
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            
            // Lógica de redirección dinámica
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');
            window.location.href = redirectUrl ? redirectUrl : '/apps/start/inicio.html';
        } else {
            btn.disabled = false;
            btn.textContent = 'Ingresar al Sistema';

            // Escenarios de mitigación controlados por el Backend Perimetral
            if (data.error && data.error.includes('Sesion activa')) {
                // 1. Ya tiene sesión en otro lado -> Desplegar Shield
                document.getElementById('force-email').value = emailField;
                toggleModal('active-session-modal', true);
            } else if (data.requires_activation) {
                // 2. Es nuevo y no activó la cuenta -> Desplegar OTP Activación
                document.getElementById('activation-email').value = emailField;
                toggleModal('activation-modal', true);
                showUIFeedback('Se ha despachado un código OTP a tu correo.', 'success');
            } else {
                // 3. Fallo genérico (mala clave, bloqueado, etc.)
                showUIFeedback(data.error || 'Credenciales inválidas.', 'error');
            }
        }
    } catch (err) {
        showUIFeedback('Error de conexión perimetral con el servidor.', 'error');
        btn.disabled = false;
        btn.textContent = 'Ingresar al Sistema';
    }
});

// ====================================================================
// 🪓 PROTOCOLO SHIELD V1.5: FORZAR CIERRE DE DISPOSITIVO REMOTO
// ====================================================================

// Paso 1: Solicitar código Shield de Eyección
document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
    const btn = document.getElementById('modal-confirm-btn');
    const emailField = document.getElementById('login-email').value;
    const passwordField = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.textContent = "DESPACHANDO...";

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/request_force_code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailField, password: passwordField })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            document.getElementById('modal-options').classList.add('hidden');
            document.getElementById('force-logout-form').classList.remove('hidden');
            showUIFeedback('Código SHIELD inyectado en tu bandeja de correo.', 'success');
        } else {
            showUIFeedback(data.error || 'Fallo al solicitar código.', 'error');
            btn.disabled = false;
            btn.textContent = "Solicitar Código SHIELD";
        }
    } catch (err) {
        showUIFeedback('Error de conexión.', 'error');
        btn.disabled = false;
        btn.textContent = "Solicitar Código SHIELD";
    }
});

// Paso 2: Verificar Código e Inyectar nueva sesión forzada
document.getElementById('force-logout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('force-logout-btn');
    btn.disabled = true;
    btn.textContent = 'EXPULSANDO DISPOSITIVO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/verify_force_logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('force-email').value,
                code: document.getElementById('force-shield-code').value,
                deviceId: localDeviceId
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            localStorage.setItem('userSession', JSON.stringify(data.user));
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            showUIFeedback('Sesión remota purgada con éxito. Ingresando...', 'success');
            
            // Lógica de redirección dinámica
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');
            
            setTimeout(() => {
                window.location.href = redirectUrl ? redirectUrl : '/apps/start/inicio.html';
            }, 1200);
        } else {
            showUIFeedback(data.error || 'Código SHIELD incorrecto o caducado.', 'error');
            btn.disabled = false;
            btn.textContent = 'Expulsar Dispositivo Remoto';
        }
    } catch (err) {
        showUIFeedback('Fallo de comunicación perimetral.', 'error');
        btn.disabled = false;
        btn.textContent = 'Expulsar Dispositivo Remoto';
    }
});

// Abortar proceso de Shield
document.getElementById('modal-cancel-btn').addEventListener('click', () => toggleModal('active-session-modal', false));
document.getElementById('force-logout-cancel').addEventListener('click', () => {
    toggleModal('active-session-modal', false);
    setTimeout(() => {
        document.getElementById('modal-options').classList.remove('hidden');
        document.getElementById('force-logout-form').classList.add('hidden');
        document.getElementById('force-shield-code').value = '';
        document.getElementById('modal-confirm-btn').disabled = false;
        document.getElementById('modal-confirm-btn').textContent = "Solicitar Código SHIELD";
    }, 300);
});

// ====================================================================
// ✅ VERIFICACIÓN OTP: ACTIVACIÓN DE CUENTA POST-REGISTRO
// ====================================================================
document.getElementById('activation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('verify-btn');
    btn.disabled = true;
    btn.textContent = 'VERIFICANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/verify-activation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('activation-email').value,
                code: document.getElementById('activation-code').value
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showUIFeedback('¡Cuenta activada! Inicia sesión para ingresar.', 'success');
            toggleModal('activation-modal', false);
            document.getElementById('login-password').value = ''; // Limpiar campo por seguridad
        } else {
            showUIFeedback(data.error || 'Código incorrecto.', 'error');
        }
    } catch (err) {
        showUIFeedback('Error de comunicación.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Autenticar Código';
    }
});

document.getElementById('close-activation-modal').addEventListener('click', () => toggleModal('activation-modal', false));


// ====================================================================
// 🆘 CENTRO DE ASISTENCIA: RECUPERACIÓN DE CLAVE Y DESBLOQUEO DE CUENTA
// ====================================================================

// --- Control Visual del Modal Central de Recuperación ---
function closeRecoveryModal() {
    toggleModal('recovery-center-modal', false);
    // Limpiamos todos los formularios de seguridad por higiene de código
    document.getElementById('form-forgot-request').reset();
    document.getElementById('form-forgot-reset').reset();
    document.getElementById('form-unlock-request').reset();
    document.getElementById('form-unlock-verify').reset();
}

function switchRecoveryView(targetView) {
    const views = ['menu', 'forgot-request', 'forgot-reset', 'unlock-request', 'unlock-verify'];
    views.forEach(v => {
        document.getElementById(`recovery-view-${v}`).classList.add('hidden');
    });
    document.getElementById(`recovery-view-${targetView}`).classList.remove('hidden');
}

// ----------------------------------------------------
// FLUJO A: OLVIDÉ MI CLAVE
// ----------------------------------------------------
let recoveryTempEmail = "";

// Paso 1: Pedir el código al correo
document.getElementById('form-forgot-request').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-forgot-request');
    recoveryTempEmail = document.getElementById('forgot-email').value.trim();
    
    btn.disabled = true; btn.textContent = 'PROCESANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/request`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recoveryTempEmail })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showUIFeedback('Código despachado a tu correo.', 'success');
            switchRecoveryView('forgot-reset');
        } else {
            showUIFeedback(data.error, 'error');
        }
    } catch (err) { showUIFeedback('Error de conexión.', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Enviar Código'; }
});

// Paso 2: Verificar el código e insertar la clave nueva
document.getElementById('form-forgot-reset').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-forgot-reset');
    
    // Captura y Sanitización (Se limpian los inputs inmediatamente para mitigar inyecciones)
    const code = document.getElementById('forgot-code').value;
    const pass1Input = document.getElementById('forgot-pass1');
    const pass2Input = document.getElementById('forgot-pass2');
    const pass1 = pass1Input.value;
    const pass2 = pass2Input.value;

    pass1Input.value = '';
    pass2Input.value = '';

    if (pass1 !== pass2) {
        showUIFeedback('Las contraseñas no coinciden.', 'error');
        return;
    }

    btn.disabled = true; btn.textContent = 'ACTUALIZANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recoveryTempEmail, code: code, new_password: pass1 })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showUIFeedback('Contraseña actualizada con éxito. Ya puedes ingresar.', 'success');
            closeRecoveryModal();
        } else {
            showUIFeedback(data.error, 'error');
        }
    } catch (err) { showUIFeedback('Error de conexión.', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Confirmar Cambio'; }
});


// ----------------------------------------------------
// FLUJO B: DESBLOQUEAR USUARIO BANEADO
// ----------------------------------------------------
let unlockTempEmail = "";

// Paso 1: Autenticar credenciales y pedir token de desbloqueo
document.getElementById('form-unlock-request').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-unlock-request');
    
    unlockTempEmail = document.getElementById('unlock-email').value.trim();
    const passInput = document.getElementById('unlock-pass');
    const pass = passInput.value;
    passInput.value = ''; // Sanitización inmediata

    btn.disabled = true; btn.textContent = 'VERIFICANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/unlock/request`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: unlockTempEmail, password: pass })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showUIFeedback('Identidad confirmada. Código enviado.', 'success');
            switchRecoveryView('unlock-verify');
        } else {
            showUIFeedback(data.error, 'error');
        }
    } catch (err) { showUIFeedback('Error de conexión.', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Verificar e Inyectar Shield'; }
});

// Paso 2: Ingresar Token para liberar la cuenta
document.getElementById('form-unlock-verify').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-unlock-verify');
    const code = document.getElementById('unlock-code').value;

    btn.disabled = true; btn.textContent = 'LIBERANDO...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/unlock/verify`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: unlockTempEmail, code: code })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showUIFeedback('Usuario desbloqueado. Proceda a iniciar sesión.', 'success');
            closeRecoveryModal();
        } else {
            showUIFeedback(data.error, 'error');
        }
    } catch (err) { showUIFeedback('Error de conexión.', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Liberar Cuenta'; }
});
