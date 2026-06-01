// ====================================================================
// 🛡️ NÚCLEO CORE - CONTROLADOR DEL DOSSIER DE MEMBRESÍAS (PLANES)
// ====================================================================

const AUTH_TOKEN_KEY = 'gymen_auth_token';

// Configuración adaptativa de Endpoints perimetrales
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

/**
 * Redirige al atleta hacia el pipeline de cobro del nivel seleccionado
 * @param {string} tierName - Identificador del plan ('BASICO', 'PLUS', 'ULTRA')
 */
function selectTier(tierName) {
    if (!tierName) return;
    window.location.href = `/apps/user/payments.html?tier=${encodeURIComponent(tierName.toUpperCase())}`;
}

window.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');

    // 1. Extraer el pasaporte digital (JWT) del almacenamiento local seguro
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        console.warn("Pasaporte de autenticación ausente. Redirigiendo al perímetro exterior.");
        window.location.href = '/apps/start/login.html';
        return;
    }

    try {
        // 2. Interrogar la fuente única de verdad del Backend Core
        const res = await fetch(`${API_BASE_URL}/api/profile/me`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            const data = await res.json();
            const currentLevel = String(data.profile.subscription_level || 'BASICO').toUpperCase();

            // Mapeo defensivo de elementos del DOM
            const components = {
                'BASICO': {
                    btn: document.getElementById('btn-basico'),
                    card: document.getElementById('tier-basico'),
                    activeClass: 'border-white/20 bg-white/[0.02]'
                },
                'PLUS': {
                    btn: document.getElementById('btn-plus'),
                    card: document.getElementById('tier-plus'),
                    activeClass: 'border-sky-500/30 bg-sky-500/[0.02] shadow-[0_20px_50px_rgba(56,189,248,0.1)]'
                },
                'ULTRA': {
                    btn: document.getElementById('btn-ultra'),
                    card: document.getElementById('tier-ultra'),
                    activeClass: 'tier-card-active'
                }
            };

            // Clase inmutable de desactivación estética premium para mantener simetría gruesa
            const disabledBtnClass = "w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black text-xs uppercase tracking-[0.2em] cursor-not-allowed text-center transition-all";

            // 3. Aplicar candados visuales según el nivel de suscripción real verificado por el backend
            if (components[currentLevel]) {
                const activeConfig = components[currentLevel];
                
                if (activeConfig.btn) {
                    activeConfig.btn.textContent = "Tu Plan Activo";
                    activeConfig.btn.disabled = true;
                    activeConfig.btn.className = disabledBtnClass;
                    activeConfig.btn.removeAttribute('onclick');
                }
                
                if (activeConfig.card) {
                    // Inyectar clase de resplandor e inmutabilidad de la Bento-Card
                    activeConfig.card.classList.add(...activeConfig.activeClass.split(' '));
                    activeConfig.card.classList.remove('hover:border-white/10');
                }
                
                // Opacidad sutil a los planes alternativos de menor rango para guiar el foco visual del atleta
                Object.keys(components).forEach(key => {
                    if (key !== currentLevel && components[key].card) {
                        components[key].card.classList.add('opacity-40');
                    }
                });
            }
        } else if (res.status === 401 || res.status === 403) {
            console.error("Token de autenticación expirado o adulterado.");
            localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = '/apps/start/login.html';
        }
    } catch (error) {
        console.error("Fallo crítico de red consultando la telemetría de membresías:", error);
    }
});
