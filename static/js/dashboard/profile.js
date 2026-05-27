// Configuración de API
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

function showUIFeedback(message, type = 'error') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1';
    box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

// Renderizadores de Datos
function renderProfile(data) {
    document.getElementById('p-fullname').textContent = `${data.name || ''} ${data.last_name || ''}`.trim() || 'ATLETA';
    document.getElementById('p-email').textContent = data.email || '--';
    
    const subElement = document.getElementById('p-subscription');
    const level = data.subscription_level ? data.subscription_level.toUpperCase() : 'BÁSICO';
    subElement.textContent = `PLAN ${level}`;
    
    if (level === 'ULTRA') {
        subElement.className = "px-3 py-1 bg-[#FFC300] text-black text-[8px] md:text-[9px] font-black rounded border border-[#FFC300] uppercase tracking-widest inline-block mb-4 shadow-[0_0_15px_rgba(255,195,0,0.5)]";
    }

    document.getElementById('p-dob').textContent = data.dob || '--';
    document.getElementById('p-sex').textContent = data.sex || '--';
    document.getElementById('p-active-since').textContent = data.activo_desde || '--';
}

function renderMetrics(m) {
    // Rasgos Generales
    document.getElementById('m-peso').textContent = m.peso || '--';
    document.getElementById('m-estatura').textContent = m.estatura || '--';
    document.getElementById('m-edad').textContent = m.edad || '--';

    // Tren Superior
    document.getElementById('m-cuello').textContent = m.cuello ? `${m.cuello} cm` : '--';
    document.getElementById('m-espalda').textContent = m.espalda ? `${m.espalda} cm` : '--';
    document.getElementById('m-torax').textContent = m.torax ? `${m.torax} cm` : '--';
    document.getElementById('m-abdomen').textContent = m.abdomen ? `${m.abdomen} cm` : '--';
    document.getElementById('m-brazo_der').textContent = m.brazo_derecho || '--';
    document.getElementById('m-brazo_izq').textContent = m.brazo_izquierdo || '--';
    document.getElementById('m-antebrazo_der').textContent = m.antebrazo_derecho || '--';
    document.getElementById('m-antebrazo_izq').textContent = m.antebrazo_izquierdo || '--';

    // Tren Inferior
    document.getElementById('m-cintura').textContent = m.cintura ? `${m.cintura} cm` : '--';
    document.getElementById('m-femur_der').textContent = m.femur_derecho || '--';
    document.getElementById('m-femur_izq').textContent = m.femur_izquierdo || '--';
    document.getElementById('m-tibia_der').textContent = m.tibia_derecha || '--';
    document.getElementById('m-tibia_izq').textContent = m.tibia_izquierda || '--';

    // Patologías
    document.getElementById('m-alergias').textContent = m.alergias || 'Ninguna registrada.';
    document.getElementById('m-enfermedades').textContent = m.enfermedades_cronicas || 'Ninguna registrada.';
    document.getElementById('m-otros').textContent = m.otros || 'Sin observaciones.';
}

// Motor Principal
window.addEventListener('DOMContentLoaded', async () => {
    
    // Quitar difuminado base del body
    document.body.classList.add('loaded');

    const storedSession = localStorage.getItem('userSession');
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedSession || !token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    try {
        // 1. Fetch de la Fuente Única de Verdad (Perfil Base)
        const profileRes = await fetch(`${API_BASE_URL}/api/profile/me`);
        if (profileRes.ok) {
            const profileData = await profileRes.json();
            renderProfile(profileData.profile);
        }

        // 2. Fetch de Métricas Biológicas
        const metricsRes = await fetch(`${API_BASE_URL}/api/client/metrics`);
        
        if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            const m = metricsData.metrics || {};
            
            // Lógica de visibilidad del botón "Solicitar Mediciones"
            const hasData = m.peso || m.estatura || m.cuello || m.cintura;
            
            if (!hasData) {
                // Si el objeto está vacío, mostramos el botón
                document.getElementById('request-metrics-container').classList.remove('hidden');
                document.getElementById('request-metrics-container').classList.add('flex');
            } else {
                // Si hay datos, lo mantenemos oculto y renderizamos la data
                document.getElementById('request-metrics-container').classList.add('hidden');
            }
            
            renderMetrics(m);
        }

        // 3. Transición de spinner a contenido
        document.getElementById('loading-spinner').classList.add('hidden');
        document.getElementById('profile-content').classList.remove('hidden');
        document.getElementById('profile-content').classList.add('flex');

    } catch (error) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error de comunicación core.</p>';
    }
});
