const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// ==========================================
// 🎬 MOTOR CINEMÁTICO REALISTA DE 4 ETAPAS (CORREGIDO)
// ==========================================
function initCinematicScroll3D() {
    const showcaseView = document.getElementById('basico-showcase-view');
    const masterCard = document.getElementById('sc-master-card');
    const cardBar = document.getElementById('sc-card-bar');
    const cardValue = document.getElementById('sc-card-value');
    const barLabel = document.getElementById('sc-bar-label');
    const barPercent = document.getElementById('sc-bar-percent');
    const cardTitle = document.getElementById('sc-card-title');
    const cardTag = document.getElementById('sc-card-tag');
    const cardIndicator = document.getElementById('sc-card-indicator');
    
    const narrativeText = document.getElementById('sc-narrative-text');
    const mainTitle = document.getElementById('sc-main-title');
    const mainDesc = document.getElementById('sc-main-desc');
    const ctaLock = document.getElementById('sc-cta-lock');

    // Escudo protector: Si falta algún elemento crítico, abortamos para no romper la consola
    if (!showcaseView || !masterCard || !narrativeText || !ctaLock) return;

    // Cambiar fondos dinámicamente
    function switchBg(activeId) {
        document.querySelectorAll('.sc-bg-fade').forEach(bg => {
            if(bg.id === activeId) bg.classList.add('active-bg');
            else bg.classList.remove('active-bg');
        });
    }

    window.addEventListener('scroll', () => {
        const rect = showcaseView.getBoundingClientRect();
        const viewHeight = showcaseView.offsetHeight - window.innerHeight;
        let progress = -rect.top / viewHeight;
        
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;

        // --- ETAPA 1: FUERZA INCREMENTAL (0% a 25% del Scroll) ---
        if (progress >= 0 && progress < 0.25) {
            let p = progress / 0.25; 
            switchBg('sc-bg-1');
            
            const rotX = 22 - (22 * p);
            const rotY = -18 + (18 * p);
            const rotZ = 6 - (6 * p);
            
            masterCard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) translateZ(${p * 40}px)`;
            masterCard.style.opacity = '1';
            masterCard.style.filter = 'none';

            cardTag.textContent = "Potencia / Sobrecarga Progresiva";
            cardTitle.textContent = "Fuerza Incremental";
            cardIndicator.className = "w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_15px_#38bdf8]";
            cardBar.className = "h-full rounded-full bg-sky-400";
            barLabel.textContent = "1RM Prensa e Hilera Coeficiente";
            
            let val = (p * 14.2).toFixed(1);
            cardValue.textContent = `+${val}%`;
            cardValue.className = "text-5xl md:text-6xl font-[900] tracking-tighter font-mono text-white";
            cardBar.style.width = `${p * 100}%`;
            barPercent.textContent = `${Math.round(p * 100)}%`;

            mainTitle.textContent = "Potencia Pura";
            mainDesc.textContent = "Monitoreo del Índice de Sobrecarga Progresiva";
            
            narrativeText.style.opacity = `${1 - p}`;
            narrativeText.style.transform = `translateY(-${p * 20}px)`;
            ctaLock.style.opacity = '0';
        }
        
        // --- ETAPA 2: COMPOSICIÓN LIPÍDICA (25% a 50% del Scroll) ---
        else if (progress >= 0.25 && progress < 0.50) {
            let p = (progress - 0.25) / 0.25; 
            switchBg('sc-bg-2');

            masterCard.style.transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateZ(40px)`;
            masterCard.style.opacity = '1';
            masterCard.style.filter = 'none';

            cardTag.textContent = "Composición Corporal / Antropometría";
            cardTitle.textContent = "Pérdida Lipídica";
            cardIndicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_15px_#34d399]";
            cardBar.className = "h-full rounded-full bg-emerald-400";
            barLabel.textContent = "Oxidación de Ácidos Grasos Libres";

            let val = (p * -3.8).toFixed(1);
            cardValue.textContent = `${val} KG`;
            cardValue.className = "text-5xl md:text-6xl font-[900] tracking-tighter font-mono text-emerald-400";
            cardBar.style.width = `${p * 100}%`;
            barPercent.textContent = `${Math.round(p * 100)}%`;

            mainTitle.textContent = "Déficit Calibrado";
            mainDesc.textContent = "Telemetría de Masa Grasa vs Masa Magra";
            
            narrativeText.style.opacity = '1';
            narrativeText.style.transform = 'translateY(0)';
        }

        // --- ETAPA 3: CONSISTENCIA TÁCTICA (50% a 75% del Scroll) ---
        else if (progress >= 0.50 && progress < 0.75) {
            let p = (progress - 0.50) / 0.25; 
            switchBg('sc-bg-3');

            masterCard.style.transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateZ(40px)`;
            masterCard.style.opacity = `${1 - p}`; 
            masterCard.style.filter = `blur(${p * 4}px)`;

            cardTag.textContent = "Adherencia / Frecuencia Semanal";
            cardTitle.textContent = "Consistencia Táctica";
            cardIndicator.className = "w-2.5 h-2.5 rounded-full bg-[#FFC300] shadow-[0_0_15px_#FFC300]";
            cardBar.className = "h-full rounded-full bg-[#FFC300]";
            barLabel.textContent = "Volumen de bloques completados";

            let currentRoutines = Math.round(p * 14);
            cardValue.textContent = `${currentRoutines} / 18`;
            cardValue.className = "text-5xl md:text-6xl font-[900] tracking-tighter font-mono text-[#FFC300]";
            cardBar.style.width = `${(currentRoutines/18) * 100}%`;
            barPercent.textContent = `${Math.round((currentRoutines/18) * 100)}%`;

            mainTitle.textContent = "Disciplina Inmutable";
            mainDesc.textContent = "Control de Bloques Físicos Ejecutados";
            
            narrativeText.style.opacity = `${1 - p}`;
            narrativeText.style.transform = `translateY(-${p * 20}px)`;
        }

        // --- ETAPA 4: PAYWALL CINEMÁTICO FINAL (75% a 100% del Scroll) ---
        else if (progress >= 0.75) {
            let p = (progress - 0.75) / 0.25; 
            document.querySelectorAll('.sc-bg-fade').forEach(bg => bg.style.opacity = '0');

            masterCard.style.opacity = '0';
            masterCard.style.transform = `scale(${1 - p})`;
            
            ctaLock.style.opacity = `${p}`;
            ctaLock.style.transform = `scale(${0.92 + (p * 0.08)})`;
            
            if (p > 0.8) {
                ctaLock.style.pointerEvents = 'auto'; 
            } else {
                ctaLock.style.pointerEvents = 'none';
            }
        }
    });
}

// ==========================================
// 👑 RENDERIZADOR DEL DASHBOARD PREMIUM (PLUS/ULTRA)
// ==========================================
function renderPremiumDashboard(metrics) {
    document.getElementById('g-focus-title').textContent = metrics.foco_titulo || "Fase de Recomposición Corporal";
    document.getElementById('g-focus-desc').textContent = metrics.foco_descripcion || "Optimización del índice metabólico mediante carga progresiva y control estricto de macros de alta densidad biológica.";
    
    document.getElementById('g-routines-count').textContent = metrics.rutinas_completadas || "14";
    document.getElementById('g-routines-target').textContent = `Meta: ${metrics.rutinas_meta || "18"} Entrenamientos`;
    const routinesPct = ((metrics.rutines_completadas || 14) / (metrics.rutines_meta || 18)) * 100;
    document.getElementById('g-routines-bar').style.width = `${routinesPct}%`;

    const pesoDiff = metrics.peso_variacion || "-3.8";
    document.getElementById('g-weight-diff').textContent = `${pesoDiff} KG`;
    document.getElementById('g-weight-bar').style.width = `${Math.abs(pesoDiff) * 15}%`;

    const fuerzaIdx = metrics.fuerza_indice || "+14.2";
    document.getElementById('g-strength-index').textContent = `${fuerzaIdx}%`;
    document.getElementById('g-strength-bar').style.width = `${parseFloat(fuerzaIdx) * 4}%`;
}

// ==========================================
// 🚀 INICIALIZADOR CENTRAL DEL CONTROLADOR
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    try {
        const profileRes = await fetch(`${API_BASE_URL}/api/profile/me`);
        if (!profileRes.ok) throw new Error("Fallo de sesión");
        
        const profileData = await profileRes.json();
        const level = profileData.profile.subscription_level || 'BASICO';

        document.getElementById('loading-spinner').classList.add('hidden');

        if (level === 'PLUS' || level === 'ULTRA') {
            const plusView = document.getElementById('plus-goals-view');
            plusView.classList.remove('hidden');
            plusView.classList.add('flex');
            
            const metricsRes = await fetch(`${API_BASE_URL}/api/client/metrics`);
            if (metricsRes.ok) {
                const metricsData = await metricsRes.json();
                renderPremiumDashboard(metricsData.metrics || {});
            }
        } else {
            // Cargar la experiencia interactiva cinematográfica para usuarios Básicos
            document.getElementById('basico-showcycle-view');
            const basicoView = document.getElementById('basico-showcase-view');
            basicoView.classList.remove('hidden');
            initCinematicScroll3D(); 
        }

    } catch (error) {
        console.error(error);
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error de sincronización.</p>';
    }
});
