const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

function initCinematicOn3D() {
    const showcase = document.getElementById('showcase-view');
    const layerMain = document.getElementById('sc-layer-main');
    const layerFloat = document.getElementById('sc-layer-float');
    const textLayer = document.getElementById('sc-text-layer');
    const orb = document.getElementById('sc-blur-orb');
    const cta = document.getElementById('sc-cta');
    
    const title = document.getElementById('sc-title');
    const desc = document.getElementById('sc-desc');
    const fpsText = document.getElementById('sc-fps');

    if (!showcase || !layerMain || !layerFloat || !cta) return;

    window.addEventListener('scroll', () => {
        const rect = showcase.getBoundingClientRect();
        const viewHeight = showcase.offsetHeight - window.innerHeight;
        let p = -rect.top / viewHeight;
        if (p < 0) p = 0; if (p > 1) p = 1;

        // FASE 1: Ensamblaje Espacial Multicapa (0% a 50% del Scroll)
        if (p <= 0.5) {
            let norm = p / 0.5;
            
            // Capa Madre Base (Estructura del video)
            const rX = 22 - (22 * norm); 
            const rY = -18 + (18 * norm);
            const rZ = 6 - (6 * norm);
            layerMain.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) rotateZ(${rZ}deg) translateZ(${norm * 30}px)`;
            layerMain.style.opacity = '1'; 
            layerMain.style.filter = 'none';

            // Capa Flotante Voladora (Reproductor de Video sobrevolando en Z - Efecto Apple)
            layerFloat.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) rotateZ(${rZ}deg) translateX(${130 - (norm * 50)}px) translateY(${35 - (norm * 15)}px) translateZ(${70 + (norm * 60)}px)`;
            layerFloat.style.opacity = `${norm}`;
            layerFloat.style.filter = 'none';

            // Simulación cinemática del aumento de cuadros por segundo (FPS) en el escaneo
            fpsText.textContent = `${Math.round(norm * 120)} FPS`;

            // Textos y Orbes Dinámicos
            if (norm < 0.5) {
                title.textContent = "Análisis Cinemático";
                desc.textContent = "Mapeo de Vectores de Fuerza";
                orb.style.backgroundColor = "rgba(220, 38, 38, 0.1)"; // Resplandor Rojo Carmesí
            } else {
                title.textContent = "Tensión Mecánica";
                desc.textContent = "Máximo Reclutamiento Motor";
                orb.style.backgroundColor = "rgba(251, 195, 0, 0.08)"; // Viraje a Oro
            }

            textLayer.style.opacity = `${1 - (norm * 0.2)}`;
            textLayer.style.transform = `translateY(-${norm * 15}px)`;
            cta.style.opacity = '0'; 
            cta.style.pointerEvents = 'none';
        } 
        // FASE 2: Desvanecimiento Tridimensional hacia el Fondo y Paywall (50% a 100%)
        else {
            let norm = (p - 0.5) / 0.5;
            
            layerMain.style.opacity = `${1 - norm}`;
            layerMain.style.transform = `translateZ(${30 + (norm * 120)}px) scale(${1 - norm * 0.2})`;
            layerMain.style.filter = `blur(${norm * 10}px)`;

            layerFloat.style.opacity = `${1 - norm}`;
            layerFloat.style.transform = `translateX(80px) translateY(20px) translateZ(${130 + (norm * 160)}px) scale(${1 - norm * 0.3})`;
            layerFloat.style.filter = `blur(${norm * 14}px)`;

            textLayer.style.opacity = `${1 - norm}`;
            orb.style.backgroundColor = "rgba(220, 38, 38, 0.02)";

            // Revelado suave del llamado a la acción final
            cta.style.opacity = `${norm}`;
            cta.style.transform = `scale(${0.93 + (norm * 0.07)})`;
            cta.style.pointerEvents = norm > 0.8 ? 'auto' : 'none';
        }
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) { window.location.href = '/apps/start/login.html'; return; }

    try {
        const profileRes = await fetch(`${API_BASE_URL}/api/profile/me`);
        const profileData = await profileRes.json();
        const level = profileData.profile.subscription_level || 'BASICO';

        document.getElementById('loading-spinner').classList.add('hidden');

        // GYMENEZ ON (Streaming) está habilitado a partir del nivel PLUS o ULTRA
        if (level === 'PLUS' || level === 'ULTRA') {
            document.getElementById('premium-view').classList.remove('hidden');
        } else {
            document.getElementById('showcase-view').classList.remove('hidden');
            initCinematicOn3D();
        }
    } catch (e) {
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error de sincronización Core.</p>';
    }
});
