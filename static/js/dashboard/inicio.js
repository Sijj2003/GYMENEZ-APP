// Configuración de API
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// ==========================================
// UTILIDADES DE INTERFAZ
// ==========================================
function showMessage(message, type = 'error') {
    const messagebox = document.getElementById('message-box');
    if(!messagebox) return;
    
    messagebox.textContent = message;
    messagebox.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-4 md:px-6 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-500 text-center w-11/12 max-w-[350px] border border-white/10 ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`;
    
    messagebox.style.opacity = '1';
    messagebox.style.transform = 'translate(-50%, 0)';
    
    setTimeout(() => {
        messagebox.style.opacity = '0';
        messagebox.style.transform = 'translate(-50%, -20px)';
    }, 3500);
}

// ==========================================
// SISTEMA DE BLOQUEO DE PLANES (Zero Trust Frontend)
// ==========================================
function lockCard(cardElement, requiredLevel) {
    if (!cardElement) return;
    
    // Anula el link y lanza alerta
    cardElement.href = "javascript:void(0)"; 
    cardElement.onclick = (e) => {
        e.preventDefault();
        showMessage(`MÓDULO BLOQUEADO: Requiere Plan ${requiredLevel}. Mejora tu suscripción.`, 'error');
    };

    // Aplica filtros visuales
    cardElement.classList.add('locked-card');
    cardElement.classList.remove('hover-green', 'hover-red', 'hover-sky'); 

    // Inserta la etiqueta visual de candado
    const tag = cardElement.querySelector('.badge-tag');
    if (tag) {
        tag.innerHTML = `🔒 PLAN ${requiredLevel}`;
        tag.className = 'badge-tag bg-gray-800/80 text-gray-300 text-[7px] md:text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest mb-2 inline-block border border-gray-600 shadow-md';
        tag.classList.remove('hidden'); 
    }
}

function applySubscriptionLocks(level) {
    const normalizedLevel = (level || 'No Suscrito').toUpperCase();
    
    const cardEats = document.getElementById('card-eats');
    const cardOn = document.getElementById('card-on');
    const cardGoals = document.getElementById('card-goals');

    const isUltra = normalizedLevel === 'ULTRA';
    const isPlus = normalizedLevel === 'PLUS' || isUltra;

    // Ejecuta las reglas de negocio
    if (!isUltra) lockCard(cardEats, 'ULTRA');
    if (!isPlus) {
        lockCard(cardOn, 'PLUS');    
        lockCard(cardGoals, 'PLUS'); 
    }

    // Actualiza el banner si ya está en el plan máximo
    if (isUltra) {
        const bannerTitle = document.getElementById('upgrade-banner-title');
        const bannerDesc = document.getElementById('upgrade-banner-desc');
        const bannerBtn = document.getElementById('upgrade-banner-btn');
        
        if (bannerTitle && bannerDesc && bannerBtn) {
            bannerTitle.textContent = "Nivel Ultra Activado";
            bannerTitle.classList.replace('text-white', 'text-[#FFC300]');
            bannerDesc.textContent = "Estás aprovechando el ecosistema al 100%. Sigue rompiendo tus límites.";
            bannerBtn.classList.add('hidden');
        }
    }
}

// ==========================================
// ALGORITMO GENERADOR DE MOTIVACIÓN 
// ==========================================
function setMotivationalQuote() {
    const quoteEl = document.getElementById('motivational-message');
    if (!quoteEl) return;

    const parts = {
        p1: ["La disciplina táctica", "El esfuerzo invisible", "La constancia absoluta", "La dedicación innegociable", "Cada gota de sudor"],
        p2: ["forja", "construye", "materializa", "desencadena", "garantiza"],
        p3: ["tu mejor versión física", "resultados matemáticos", "un progreso innegable", "una fuerza interior brutal", "el rendimiento a largo plazo"],
        p4: ["día tras día.", "cuando nadie está mirando.", "destruyendo las excusas.", "superando los límites del cuerpo.", "en cada fase del entrenamiento."]
    };

    const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
    quoteEl.textContent = `"${r(parts.p1)} ${r(parts.p2)} ${r(parts.p3)} ${r(parts.p4)}"`;
}

// ==========================================
// INICIALIZACIÓN DE DATOS (Perfil y Sesión)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    
    // 1. Activar frase
    setMotivationalQuote();

    // 2. Verificar token de seguridad local
    const storedSession = localStorage.getItem('userSession');
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    if (!storedSession || !token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    const user = JSON.parse(storedSession);
    const userId = user.id || user._id;
    
    // 3. Renderizar Nombre y Fecha
    const firstName = user.name ? user.name.split(' ')[0] : 'Atleta';
    document.getElementById('welcome-name').textContent = firstName;
    document.getElementById('header-user-name').textContent = `${firstName} ${user.last_name ? user.last_name.split(' ')[0] : ''}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', options);

    // 4. Fetch Nivel Suscripción desde el Backend
    fetch(`${API_BASE_URL}/api/profile/me`, {
        headers: { 'Authorization': `Bearer ${token}` } // Se envía el token JWT para autorizar
    })
    .then(res => {
        if(res.status === 401 || res.status === 403) {
            throw new Error('No autorizado');
        }
        return res.json();
    })
    .then(data => {
        if (data.success && data.profile) {
            const subLevel = data.profile.subscription_level || 'No Suscrito';
            document.getElementById('header-subscription').textContent = `Plan ${subLevel}`;
            applySubscriptionLocks(subLevel);
        } else {
            applySubscriptionLocks('No Suscrito');
        }
    })
    .catch(err => {
        console.error("Error obteniendo perfil:", err);
        // Si el token es inválido, lo pateamos al login
        if(err.message === 'No autorizado') {
            localStorage.removeItem('userSession');
            localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = '/apps/start/login.html';
        } else {
            applySubscriptionLocks('No Suscrito'); 
        }
    });

    // 5. Manejar Logout Manual
    document.getElementById('logout-button').addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ deviceId: localStorage.getItem(DEVICE_ID_KEY) })
            });
        } catch(e) {}
        
        localStorage.removeItem('userSession');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = '/apps/start/login.html';
    });
});
