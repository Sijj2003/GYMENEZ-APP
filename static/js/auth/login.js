// Configuración de API e Identidad de Red
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || 
                               window.location.hostname === 'localhost' || 
                               window.location.protocol === 'file:';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';
const AUTH_TOKEN_KEY = 'gymen_auth_token';

// Generar o recuperar huella digital del dispositivo local
function getDeviceId() {
    let deviceId = localStorage.getItem('gymen_device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('gymen_device_id', deviceId);
    }
    return deviceId;
}

const localDeviceId = getDeviceId();

// --- MANEJO DE INTERFAZ Y PRELOADER ---
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    const nav = document.getElementById('main-nav');
    const footer = document.getElementById('main-footer');

    preloader.style.opacity = '0';
    setTimeout(() => {
        preloader.style.display = 'none';
        document.body.classList.add('loaded');
        
        // Cargar animación de entrada del Nav y el Footer
        nav.classList.remove('opacity-0', '-translate-y-4');
        footer.classList.remove('opacity-0');
        footer.classList.add('opacity-40');
    }, 1000);

    // Si ya existe sesión activa localmente, mandar al Hub directo
    if (localStorage.getItem('userSession')) {
        window.location.href = '/apps/start/inicio.html';
    }
});

// Alertas flotantes UI
function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = 'fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px]';
    
    if(type === 'success') {
        box.classList.add('bg-emerald-950/80', 'text-emerald-400', 'border-emerald-500/30');
    } else {
        box.classList.add('bg-red-950/80', 'text-red-400', 'border-red-500/30');
    }
    
    box.style.opacity = '1';
    box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translate(-50%, -20px)';
    }, 4000);
}

// Utilidad para abrir/cerrar modales suavemente
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

// Filtros de entrada para los campos de códigos (Solo números)
document.getElementById('force-shield-code').addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });
document.getElementById('activation-code').addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });

// --- GESTIÓN DE MODALES DE ENLACES SECUNDARIOS ---
document.getElementById('staff-access-link').addEventListener('click', () => toggleModal('area-selection-modal', true));
document.getElementById('modal-close-btn').addEventListener('click', () => toggleModal('area-selection-modal', false));
document.getElementById('forgot-password-link').addEventListener('click', () => {
    const msg = encodeURIComponent("Hola Soporte GYMENEZ, necesito recuperar las credenciales de mi perfil de atleta.");
    window.open(`https://wa.me/584148780392?text=${msg}`, '_blank');
});

// --- OPERACIÓN CENTRAL: LOGIN ATLETA ---
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
            // Guardado exitoso y redirección inmutable
            localStorage.setItem('userSession', JSON.stringify(data.user));
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            window.location.href = '/apps/start/inicio.html';
        } else {
            btn.disabled = false;
            btn.textContent = 'Ingresar al Sistema';

            // Escenarios controlados por el Backend perimetral
            if (data.error && data.error.includes('Sesion activa')) {
                document.getElementById('force-email').value = emailField;
                toggleModal('active-session-modal', true);
            } else if (data.requires_activation) {
                document.getElementById('activation-email').value = emailField;
                toggleModal('activation-modal', true);
                showUIFeedback('Se ha despachado un código OTP a tu correo.', 'success');
            } else {
                showUIFeedback(data.error || 'Credenciales inválidas.', 'error');
            }
        }
    } catch (err) {
        showUIFeedback('Error de conexión perimetral con el servidor.', 'error');
        btn.disabled = false;
        btn.textContent = 'Ingresar al Sistema';
    }
});

// --- FLUJO SHIELD V1.5: FORZAR CIERRE DISPOSITIVO REMOTO ---

// Paso 1: Solicitar código Shield
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

// Paso 2: Verificar e Inyectar nueva sesión forzada
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
            setTimeout(() => window.location.href = '/apps/start/inicio.html', 1200);
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

// Abortar o cerrar modales de sesión
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

// --- VERIFICACIÓN OTP: ACTIVACIÓN DE CUENTA POST-REGISTRO ---
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
            document.getElementById('login-password').value = ''; // Limpiar campo
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
