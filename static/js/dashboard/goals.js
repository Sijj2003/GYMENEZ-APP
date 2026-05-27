// Configuración del Endpoint
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// ==========================================
// 🎬 MOTOR DE ANIMACIÓN INTERACTIVA 3D (Scroll Physics)
// ==========================================
function initCinematicScroll3D() {
    const showcaseView = document.getElementById('basico-showcase-view');
    const card3D = document.getElementById('sc-card-3d');
    const progressBar = document.getElementById('sc-progress-bar');
    const counterText = document.getElementById('sc-counter');
    const fadeText = document.getElementById('sc-fade-text');
    const ctaLock = document.getElementById('sc-cta-lock');

    window.addEventListener('scroll', () => {
        // Calcular la posición exacta del scroll dentro de la sección cinemática
        const rect = showcaseView.getBoundingClientRect();
        const viewHeight = showcaseView.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        
        // Porcentaje de progreso del scroll (de 0 a 1)
        let progress = scrolled / viewHeight;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;

        // Fase 1: Rotación Tridimensional Matemática Interactiva
        // Arranca inclinado (20deg, -15deg) y se endereza a (0, 0) a mitad de scroll (0.5)
        if (progress <= 0.5) {
            const factor = progress * 2; // Normalizar de 0 a 1 en la primera mitad
            const rotX = 20 - (20 * factor);
            const rotY = -15 + (15 * factor);
            const rotZ = 5 - (5 * factor);
            const transZ = factor * 50;

            card3D.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) translateZ(${transZ}px)`;
            card3D.style.opacity = '1';
            card3D.style.filter = 'blur(0px)';
            
            // Llenar barra de progreso y contador numérico en tiempo real
            const percentage = (factor * 18.5).toFixed(1);
            progressBar.style.width = `${factor * 100}%`;
            counterText.textContent = `+${percentage}%`;
            
            // Atenuar texto superior inicial
            fadeText.style.opacity = `${1 - factor}`;
            fadeText.style.transform = `translateY(-${factor * 20}px)`;
            
            // Asegurar que el CTA final esté totalmente oculto
            ctaLock.style.opacity = '0';
            ctaLock.style.transform = 'scale(0.95)';
            ctaLock.style.pointerEvents = 'none';
        } 
        // Fase 2: Desvanecimiento de tarjeta y emergencia del Bloqueo CTA
        else {
            const factor = (progress - 0.5) * 2; // Normalizar de 0 a 1 en la segunda mitad
            
            // Desvanecer tarjeta hacia el fondo
            card3D.style.transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateZ(${50 + (factor * 100)}px)`;
            card3D.style.opacity = `${1 - factor}`;
            card3D.style.filter = `blur(${factor * 10}px)`;
            
            // Llenar la barra al 100%
            progressBar.style.width = '100%';
            counterText.textContent = '+18.5%';
            counterText.className = "text-[#FFC300] font-mono text-xs animate-pulse";

            // Emerger llamado a la acción (CTA) con botón dorado
            ctaLock.style.opacity = `${factor}`;
            ctaLock.style.transform = `scale(${0.95 + (factor * 0.05)})`;
            
            if (factor > 0.8) {
                ctaLock.style.pointerEvents = 'auto'; // Activar el botón de suscripción al final
            } else {
                ctaLock.style.pointerEvents = 'none';
            }
        }
    });
}

// ==========================================
// 👑 RENDERIZADOR PREMIUM (PLUS / ULTRA)
// ==========================================
function renderPremiumDashboard(metrics) {
    // Si no hay datos asignados aún por el Administrador, colocamos valores por defecto elegantes
    document.getElementById('g-focus-title').textContent = metrics.foco_titulo || "Fase de Recomposición Corporal";
    document.getElementById('g-focus-desc').textContent = metrics.foco_descripcion || "Optimización del índice metabólico mediante carga progresiva y control estricto de macros de alta densidad biológica.";
    
    // Contadores Dinámicos Animados
    document.getElementById('g-routines-count').textContent = metrics.rutinas_completadas || "14";
    document.getElementById('g-routines-target').textContent = `Meta: ${metrics.rutinas_meta || "18"} Entrenamientos`;
    const routinesPct = ((metrics.rutines_completadas || 14) / (metrics.rutines_meta || 18)) * 100;
    document.getElementById('g-routines-bar').style.width = `${routinesPct}%`;

    // Peso
    const pesoDiff = metrics.peso_variacion || "-3.8";
    document.getElementById('g-weight-diff').textContent = `${pesoDiff} KG`;
    document.getElementById('g-weight-bar').style.width = `${Math.abs(pesoDiff) * 15}%`;

    // Fuerza
    const fuerzaIdx = metrics.fuerza_indice || "+14.2";
    document.getElementById('g-strength-index').textContent = `${fuerzaIdx}%`;
    document.getElementById('g-strength-bar').style.width = `${parseFloat(fuerzaIdx) * 4}%`;
}

// ==========================================
// 🚀 INICIALIZADOR CENTRAL DEL CORE
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    // Quitar la cortina de opacidad
    document.body.classList.add('loaded');

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    try {
        // Consultar el perfil inmutable para verificar jerarquía
        const profileRes = await fetch(`${API_BASE_URL}/api/profile/me`);
        if (!profileRes.ok) throw new Error("Fallo de autenticación");
        
        const profileData = await profileRes.json();
        const level = profileData.profile.subscription_level || 'BASICO';

        // Ocultar spinner inicial
        document.getElementById('loading-spinner').classList.add('hidden');

        // Evaluación de Jerarquía de Acceso
        if (level === 'PLUS' || level === 'ULTRA') {
            // Activar Vista Premium y renderizar datos
            const plusView = document.getElementById('plus-goals-view');
            plusView.classList.remove('hidden');
            plusView.classList.add('flex');
            
            // Buscamos las metas del atleta (Reutilizamos el endpoint desbloqueado)
            const metricsRes = await fetch(`${API_BASE_URL}/api/client/metrics`);
            if (metricsRes.ok) {
                const metricsData = await metricsRes.json();
                renderPremiumDashboard(metricsData.metrics || {});
            }
        } else {
            // Activar Vista Cinemática 3D Interactiva para usuarios Básicos
            const basicoView = document.getElementById('basico-showcase-view');
            basicoView.classList.remove('hidden');
            initCinematicScroll3D(); // Encender motor matemático de scroll
        }

    } catch (error) {
        console.error(error);
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error de sincronización.</p>';
    }
});
