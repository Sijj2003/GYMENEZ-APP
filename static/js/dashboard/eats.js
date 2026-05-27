const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

function initCinematicEats3D() {
    const showcase = document.getElementById('showcase-view');
    const layerMain = document.getElementById('sc-layer-main');
    const layerFloat = document.getElementById('sc-layer-float');
    const textLayer = document.getElementById('sc-text-layer');
    const orb = document.getElementById('sc-blur-orb');
    const cta = document.getElementById('sc-cta');
    
    const title = document.getElementById('sc-title');
    const desc = document.getElementById('sc-desc');
    const bar1 = document.getElementById('sc-bar-1');
    const bar2 = document.getElementById('sc-bar-2');
    const val1 = document.getElementById('sc-val-1');
    const val2 = document.getElementById('sc-val-2');

    window.addEventListener('scroll', () => {
        const rect = showcase.getBoundingClientRect();
        const viewHeight = showcase.offsetHeight - window.innerHeight;
        let p = -rect.top / viewHeight;
        if (p < 0) p = 0; if (p > 1) p = 1;

        // FASE 1: Ensamblaje Espacial (0% a 50%)
        if (p <= 0.5) {
            let norm = p / 0.5;
            
            // Capa Madre (Gira y se acerca)
            const rX = 22 - (22 * norm); const rY = -18 + (18 * norm);
            layerMain.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) translateZ(${norm * 30}px)`;
            layerMain.style.opacity = '1'; layerMain.style.filter = 'none';

            // Capa Flotante (Se mueve a diferente velocidad y profundidad - Efecto Apple)
            // Se desplaza lateralmente y vuela por encima de la tarjeta madre
            layerFloat.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) translateX(${140 - (norm * 60)}px) translateY(${40 - (norm * 20)}px) translateZ(${60 + (norm * 50)}px)`;
            layerFloat.style.opacity = `${norm}`;

            // Animación interna de datos biológicos reales
            val1.textContent = `${Math.round(norm * 210)}g`;
            val2.textContent = `${Math.round(norm * 340)}g`;
            bar1.style.width = `${norm * 90}%`;
            bar2.style.width = `${norm * 75}%`;

            // Textos cambiantes
            if (norm < 0.5) {
                title.textContent = "Partición de Macros";
                desc.textContent = "Sincronización Circadiana";
                orb.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
            } else {
                title.textContent = "Entorno Anabólico";
                desc.textContent = "Optimización de Glucógeno";
                orb.style.backgroundColor = "rgba(251, 195, 0, 0.08)";
            }

            textLayer.style.opacity = `${1 - (norm * 0.3)}`;
            cta.style.opacity = '0'; cta.style.pointerEvents = 'none';
        } 
        // FASE 2: Disolución Espacial y Paywall (50% a 100%)
        else {
            let norm = (p - 0.5) / 0.5;
            
            layerMain.style.opacity = `${1 - norm}`;
            layerMain.style.transform = `translateZ(${30 + (norm * 100)}px) scale(${1 - norm * 0.2})`;
            layerMain.style.filter = `blur(${norm * 8}px)`;

            layerFloat.style.opacity = `${1 - norm}`;
            layerFloat.style.transform = `translateX(80px) translateY(20px) translateZ(${110 + (norm * 150)}px) scale(${1 - norm * 0.3})`;
            layerFloat.style.filter = `blur(${norm * 12}px)`;

            textLayer.style.opacity = `${1 - norm}`;
            orb.style.backgroundColor = "rgba(16, 185, 129, 0.02)";

            // Emerge el CTA
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

        if (level === 'ULTRA') {
            document.getElementById('premium-view').classList.remove('hidden');
            // Aquí llamarías a las funciones reales de ULTRA
        } else {
            document.getElementById('showcase-view').classList.remove('hidden');
            initCinematicEats3D();
        }
    } catch (e) {
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error Core.</p>';
    }
});
