const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// 🧠 DICCIONARIO BIOMÉTRICO CENTRALIZADO PARA RECONOCIMIENTO DE UNIDADES
const METRIC_CONFIG = {
    "weight": { label: "Peso Corporal", unit: "kg", icon: "⚖️" },
    "fat_percent": { label: "Grasa Corporal", unit: "%", icon: "🧬" },
    "muscle_percent": { label: "Masa Muscular", unit: "%", icon: "💪" },
    "waist": { label: "Perímetro Cintura", unit: "cm", icon: "📏" },
    "rm_push": { label: "1RM Empuje", unit: "kg", icon: "⚡" },
    "rm_pull": { label: "1RM Tracción", unit: "kg", icon: "💥" },
    "rm_legs": { label: "1RM Piernas", unit: "kg", icon: "🏋️" }
};

// ==========================================
// 🛠️ RENDERIZADOR DIGITAL DE ALTA GAMA (DASHBOARD)
// ==========================================
function renderPremiumDashboard(goals, metrics) {
    const emptyState = document.getElementById('goals-empty-state');
    const gridState = document.getElementById('goals-grid');

    if (!goals || Object.keys(goals).length === 0 || !goals.focus) {
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        gridState.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    gridState.classList.remove('hidden');
    gridState.classList.add('grid');

    document.getElementById('g-focus-title').textContent = goals.focus;

    const normalizeToArray = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (!data.description || data.description.trim() === '') return [];
        return [data];
    };

    const stGoals = normalizeToArray(goals.short_term);
    const mtGoals = normalizeToArray(goals.medium_term);
    const ltGoals = normalizeToArray(goals.long_term);

    // FÁBRICA DE TELEMETRÍA: Generador de Widgets de Control
    const createGoalHTML = (goal) => {
        const isDone = goal.status === 'Cumplido';
        const isCustom = !goal.metric_key || goal.metric_key === 'custom';
        
        let headerLabel = "Meta Cualitativa";
        let unit = "";
        let icon = "🎯";

        if (!isCustom && METRIC_CONFIG[goal.metric_key]) {
            headerLabel = METRIC_CONFIG[goal.metric_key].label;
            unit = METRIC_CONFIG[goal.metric_key].unit;
            icon = METRIC_CONFIG[goal.metric_key].icon;
        }

        // Estilos dinámicos según estado de cumplimiento
        const statusBadge = isDone 
            ? `<span class="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CUMPLIDO</span>`
            : `<span class="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">EN PROGRESO</span>`;

        let telemetryBlockHtml = '';

        // Si es una métrica medible y tenemos telemetría en el perfil
        if (!isCustom && metrics[goal.metric_key] !== undefined && metrics[goal.metric_key] !== null && metrics[goal.metric_key] !== '') {
            const currentVal = parseFloat(metrics[goal.metric_key]);
            const targetVal = parseFloat(goal.target_value);
            const startVal = parseFloat(goal.start_value);

            if (!isNaN(currentVal) && !isNaN(targetVal) && !isNaN(startVal) && targetVal !== startVal) {
                
                // 1. Cálculo matemático de distancias relativas
                const distanceTotal = Math.abs(targetVal - startVal);
                const distanceCovered = Math.abs(currentVal - startVal);
                let percent = 0;

                // 2. Evaluador de Vector Direccional (¿Avanza hacia la meta?)
                const isGoingDownAndCorrect = (targetVal < startVal && currentVal <= startVal);
                const isGoingUpAndCorrect = (targetVal > startVal && currentVal >= startVal);
                const isImproving = isGoingDownAndCorrect || isGoingUpAndCorrect;

                if (isImproving) {
                    percent = (distanceCovered / distanceTotal) * 100;
                }
                if (percent > 100 || isDone) percent = 100;

                // 3. Cálculo del Delta Restante o Superado
                const remainingDelta = targetVal - currentVal;
                let deltaText = "";
                let deltaClass = "text-[#FFC300]";

                if (isDone || (targetVal < startVal && currentVal <= targetVal) || (targetVal > startVal && currentVal >= targetVal)) {
                    deltaText = "✨ META ALCANZADA";
                    deltaClass = "text-emerald-400 font-black";
                } else {
                    const absDelta = Math.abs(remainingDelta).toFixed(1);
                    deltaText = targetVal < startVal 
                        ? `FALTAN -${absDelta} ${unit}` 
                        : `FALTAN +${absDelta} ${unit}`;
                }

                // Generamos la línea de tiempo visual automatizada
                telemetryBlockHtml = `
                    <div class="grid grid-cols-3 gap-1 text-center bg-black/50 p-2.5 rounded-xl border border-white/5 my-4">
                        <div>
                            <span class="block text-[7px] text-gray-500 font-black uppercase tracking-widest">Inicial</span>
                            <span class="text-xs font-mono font-bold text-gray-400">${startVal}${unit}</span>
                        </div>
                        <div class="border-x border-white/5">
                            <span class="block text-[7px] text-gray-400 font-black uppercase tracking-widest">Actual</span>
                            <span class="text-xs font-mono font-black text-white">${currentVal}${unit}</span>
                        </div>
                        <div>
                            <span class="block text-[7px] text-[#FFC300] font-black uppercase tracking-widest">Objetivo</span>
                            <span class="text-xs font-mono font-black text-[#FFC300]">${targetVal}${unit}</span>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="flex justify-between items-end text-[7px] font-black uppercase tracking-widest">
                            <span class="text-gray-500">Progreso Relativo (${Math.round(percent)}%)</span>
                            <span class="${deltaClass}">${deltaText}</span>
                        </div>
                        <div class="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <div class="h-full rounded-full bg-gradient-to-r ${isDone || percent === 100 ? 'from-emerald-500 to-teal-400' : 'from-[#FFC300] to-amber-500'} transition-all duration-1000" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                `;
            } else {
                // Fallback si faltan variables en el admin
                telemetryBlockHtml = `
                    <div class="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                        <span class="text-[8px] text-amber-400 font-black uppercase tracking-widest">⚠️ Registro Incompleto</span>
                        <p class="text-[9px] text-gray-500 mt-0.5 font-medium">Falta calibrar el valor inicial en la Consola Core.</p>
                    </div>
                `;
            }
        } else {
            // Render para Metas Cualitativas (Hábitos o Textos Libres)
            telemetryBlockHtml = `
                <div class="mt-4 pt-3 border-t border-white/5 flex flex-col">
                    <span class="text-[7px] text-gray-500 font-black uppercase tracking-widest mb-1">Target Específico</span>
                    <span class="text-lg font-black tracking-tighter text-[#FFC300] uppercase">${goal.target_value || 'Ver Directiva'}</span>
                </div>
            `;
        }

        return `
            <div class="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                <div>
                    <div class="flex justify-between items-start gap-4 mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-sm">${icon}</span>
                            <h5 class="text-[10px] font-black uppercase tracking-widest text-white">${headerLabel}</h5>
                        </div>
                        ${statusBadge}
                    </div>
                    <p class="text-[11px] text-gray-400 leading-relaxed font-medium pr-2 mt-1 italic">${goal.description}</p>
                </div>
                ${telemetryBlockHtml}
            </div>
        `;
    };
    
    const stContainer = document.getElementById('g-st-container');
    const mtContainer = document.getElementById('g-mt-container');
    const ltContainer = document.getElementById('g-lt-container');

    stContainer.innerHTML = stGoals.length ? stGoals.map(createGoalHTML).join('') : '<div class="text-center py-6 text-gray-600 font-bold uppercase tracking-widest text-[9px]">Sin asignación activa.</div>';
    mtContainer.innerHTML = mtGoals.length ? mtGoals.map(createGoalHTML).join('') : '<div class="text-center py-6 text-gray-600 font-bold uppercase tracking-widest text-[9px]">Sin asignación activa.</div>';
    ltContainer.innerHTML = ltGoals.length ? ltGoals.map(createGoalHTML).join('') : '<div class="text-center py-6 text-gray-600 font-bold uppercase tracking-widest text-[9px]">Sin asignación activa.</div>';

    // Animación fluida de entrada para las barras de progreso
    setTimeout(() => {
        document.querySelectorAll('.bg-gradient-to-r').forEach(bar => {
            const finalWidth = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => { bar.style.width = finalWidth; }, 150);
        });
    }, 100);
}

// ==========================================
// 🎬 MOTOR CINEMÁTICO PARALLAX (SÓLO BÁSICOS)
// ==========================================
function initCinematicScroll3D() {
    const showcaseView = document.getElementById('basico-showcase-view');
    const masterCard = document.getElementById('sc-master-card');
    
    const cardTag = document.getElementById('sc-card-tag');
    const cardTitle = document.getElementById('sc-card-title');
    const cardDesc = document.getElementById('sc-card-desc');
    const cardTarget = document.getElementById('sc-card-target');
    const cardIndicator = document.getElementById('sc-card-indicator');
    
    const narrativeText = document.getElementById('sc-narrative-text');
    const mainTag = document.getElementById('sc-main-tag');
    const mainTitle = document.getElementById('sc-main-title');
    const mainDesc = document.getElementById('sc-main-desc');
    const ctaLock = document.getElementById('sc-cta-lock');

    if (!showcaseView || !masterCard || !narrativeText || !ctaLock) return;

    function switchBg(activeId) {
        document.querySelectorAll('.sc-bg-fade').forEach(bg => {
            if(bg.id === activeId) bg.classList.add('opacity-40');
            else bg.classList.remove('opacity-40');
        });
    }

    window.addEventListener('scroll', () => {
        const rect = showcaseView.getBoundingClientRect();
        const viewHeight = showcaseView.offsetHeight - window.innerHeight;
        let progress = -rect.top / viewHeight;
        
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;

        if (progress >= 0 && progress < 0.20) {
            let p = progress / 0.20; 
            switchBg('sc-bg-1');
            const rotX = 15 - (15 * p), rotY = -15 + (15 * p);
            masterCard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(${p * 40}px)`;
            masterCard.style.opacity = '1';
            masterCard.style.filter = 'none';

            cardTag.textContent = "Planificación Global";
            cardTitle.textContent = "Foco Estratégico";
            cardDesc.textContent = "Definición del protocolo de entrenamiento y alimentación en base a tu fisiología. (Pérdida Lipídica, Ganancia Magra o Rendimiento).";
            cardTarget.textContent = "Métrica Maestra";
            cardTarget.className = "text-2xl md:text-3xl font-black tracking-tighter font-mono text-white";
            cardIndicator.className = "px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-[7px] font-black uppercase tracking-widest";
            
            mainTag.textContent = "Macrociclo";
            mainTitle.textContent = "La Hoja de Ruta";
            mainDesc.textContent = "Estableciendo el norte biológico";
            
            narrativeText.style.opacity = '1';
            narrativeText.style.transform = 'translateY(0)';
            ctaLock.style.opacity = '0';
        }
        else if (progress >= 0.20 && progress < 0.45) {
            switchBg('sc-bg-2');
            masterCard.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(40px)`;
            masterCard.style.opacity = '1';

            cardTag.textContent = "Meses 1 al 3";
            cardTitle.textContent = "Fase Adaptativa";
            cardDesc.textContent = "Adecuación neuromuscular, asimilación del déficit/superávit y construcción de hábitos de disciplina inquebrantable.";
            cardTarget.textContent = "Hitos a Corto Plazo";
            cardTarget.className = "text-2xl md:text-3xl font-black tracking-tighter font-mono text-[#FFC300]";
            cardIndicator.className = "px-3 py-1 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded text-[#FFC300] text-[7px] font-black uppercase tracking-widest";

            mainTag.textContent = "Fase I";
            mainTitle.textContent = "El Cimiento";
            mainDesc.textContent = "Acostumbrando al cuerpo al estrés";
            narrativeText.style.opacity = '1';
        }
        else if (progress >= 0.45 && progress < 0.70) {
            switchBg('sc-bg-3');
            masterCard.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(40px)`;
            masterCard.style.opacity = '1';
            masterCard.style.filter = `none`;

            cardTag.textContent = "Meses 4 al 7";
            cardTitle.textContent = "Recomposición Real";
            cardDesc.textContent = "El punto de quiebre. Sobrecarga progresiva agresiva, ruptura de mesetas de peso y transformación visual de tu biotipo.";
            cardTarget.textContent = "Hitos a Mediano Plazo";
            cardTarget.className = "text-2xl md:text-3xl font-black tracking-tighter font-mono text-emerald-400";
            cardIndicator.className = "px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-[7px] font-black uppercase tracking-widest";

            mainTag.textContent = "Fase II";
            mainTitle.textContent = "La Transformación";
            mainDesc.textContent = "Cuando los números se hacen visibles";
            narrativeText.style.opacity = '1';
        }
        else if (progress >= 0.70) {
            let p = (progress - 0.70) / 0.30; 
            switchBg('sc-bg-4');

            masterCard.style.opacity = `${1 - p}`;
            masterCard.style.transform = `scale(${1 - p * 0.5}) translateZ(${40 - p * 100}px)`;
            masterCard.style.filter = `blur(${p * 10}px)`;
            narrativeText.style.opacity = `${1 - (p * 2)}`;

            ctaLock.style.opacity = `${p}`;
            ctaLock.style.transform = `scale(${0.90 + (p * 0.10)})`;
            if (p > 0.6) ctaLock.style.pointerEvents = 'auto'; 
            else ctaLock.style.pointerEvents = 'none';
        }
    });
}

// ==========================================
// 🚀 INICIALIZADOR CENTRAL PERIMETRAL
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token') || localStorage.getItem('admin_token');
    
    if (!token) {
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">No hay sesión activa.</p>';
        document.body.classList.add('loaded');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/client/metrics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Acceso denegado.");
        
        const data = await res.json();
        const level = data.profile?.subscription_level || 'BASICO';

        document.getElementById('loading-spinner').classList.add('hidden');

        if (level === 'PLUS' || level === 'ULTRA') {
            const plusView = document.getElementById('plus-goals-view');
            plusView.classList.remove('hidden');
            plusView.classList.add('flex');
            
            renderPremiumDashboard(data.goals || {}, data.metrics || {});
        } else {
            const basicoView = document.getElementById('basico-showcase-view');
            basicoView.classList.remove('hidden');
            if (typeof initCinematicScroll3D === 'function') {
                initCinematicScroll3D(); 
            }
        }

    } catch (error) {
        console.error("Fallo del sistema:", error);
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error de conexión al Biolab.</p>';
    } finally {
        document.body.classList.add('loaded');
    }
});
