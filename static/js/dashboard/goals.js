const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// ==========================================
// 🛠️ RENDERIZADOR DATA-DRIVEN (Con Barras de Progreso Reales)
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

    // FÁBRICA INTELIGENTE: Matemática de Progreso Absoluto
    const createGoalHTML = (goal) => {
        const isDone = goal.status === 'Cumplido';
        const badgeClass = isDone ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/10 text-white border-white/20';
        const targetColor = isDone ? 'text-emerald-400' : 'text-[#FFC300]';

        let dynamicProgressHtml = '';

        if (goal.metric_key && goal.metric_key !== 'custom') {
            
            if (metrics[goal.metric_key] !== undefined && metrics[goal.metric_key] !== null && metrics[goal.metric_key] !== '') {
                const currentVal = parseFloat(metrics[goal.metric_key]);
                const targetVal = parseFloat(goal.target_value);
                const startVal = parseFloat(goal.start_value);

                // 🧠 SI TENEMOS LOS 3 DATOS: FÓRMULA DE PROGRESO REAL
                if (!isNaN(currentVal) && !isNaN(targetVal) && !isNaN(startVal) && targetVal !== startVal) {
                    
                    // Fórmula Maestra: Absorbe reducciones y aumentos por igual
                    let percent = ((currentVal - startVal) / (targetVal - startVal)) * 100;
                    
                    // Control de límites (Si el usuario empeoró, la barra no se sale por la izquierda; si llegó, no pasa de 100)
                    if (percent < 0) percent = 0; 
                    if (percent > 100 || isDone) percent = 100;

                    dynamicProgressHtml = `
                    <div class="mt-4 pt-3 border-t border-white/5">
                        <div class="flex justify-between items-end mb-2">
                            <span class="text-[7px] text-gray-500 font-black uppercase tracking-widest">Progreso Táctico (${Math.round(percent)}%)</span>
                            <span class="text-[10px] font-mono font-bold ${isDone ? 'text-emerald-400' : 'text-white'}">
                                ${currentVal} <span class="text-gray-500">/ ${targetVal}</span>
                            </span>
                        </div>
                        <div class="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                            <div class="h-full rounded-full ${isDone ? 'bg-emerald-400' : 'bg-[#FFC300]'} transition-all duration-1000" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                    `;
                } 
                // FALLBACK: Si el Admin olvidó colocar un Valor Inicial
                else if (!isNaN(currentVal) && !isNaN(targetVal)) {
                    dynamicProgressHtml = `
                    <div class="mt-4 pt-3 border-t border-white/5 flex flex-col">
                        <span class="text-[7px] text-gray-500 font-black uppercase tracking-widest mb-1">Estado Actual vs Meta</span>
                        <span class="text-sm font-black tracking-tighter ${isDone ? 'text-emerald-400' : 'text-white'}">
                            ${currentVal} <span class="text-gray-600 text-xs">➡️ ${targetVal}</span>
                        </span>
                        <span class="text-[8px] text-amber-500/70 uppercase font-bold mt-1">Falta registrar "Valor Inicial" en Admin para ver barra de progreso.</span>
                    </div>
                    `;
                }
            } else {
                dynamicProgressHtml = `
                <div class="mt-4 pt-3 border-t border-white/5">
                    <div class="p-2 rounded bg-red-500/10 border border-red-500/20 text-center">
                        <span class="text-[7px] text-red-400 font-black uppercase tracking-widest">⚠️ Requiere Telemetría Base</span>
                        <p class="text-[9px] text-gray-400 mt-1 font-medium">Asienta esta variable en el perfil para habilitar métricas.</p>
                    </div>
                </div>`;
            }
        } 
        
        if (!dynamicProgressHtml) {
            dynamicProgressHtml = `
            <div class="mt-4 border-t border-white/5 pt-3 flex flex-col">
                <span class="text-[7px] text-gray-500 font-black uppercase tracking-widest mb-1">Target Específico</span>
                <span class="text-lg md:text-xl font-black tracking-tighter ${targetColor}">${goal.target_value || '--'}</span>
            </div>`;
        }

        return `
        <div class="p-5 rounded-[20px] bg-black/40 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors flex flex-col justify-between">
            <div>
                <div class="absolute top-0 right-0 p-4">
                    <span class="px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest border ${badgeClass}">${goal.status || 'En progreso'}</span>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed font-medium pr-16">${goal.description}</p>
            </div>
            ${dynamicProgressHtml}
        </div>
        `;
    };
    
    const stContainer = document.getElementById('g-st-container');
    const mtContainer = document.getElementById('g-mt-container');
    const ltContainer = document.getElementById('g-lt-container');

    stContainer.innerHTML = stGoals.length ? stGoals.map(createGoalHTML).join('') : '<p class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Sin asignar.</p>';
    mtContainer.innerHTML = mtGoals.length ? mtGoals.map(createGoalHTML).join('') : '<p class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Sin asignar.</p>';
    ltContainer.innerHTML = ltGoals.length ? ltGoals.map(createGoalHTML).join('') : '<p class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Sin asignar.</p>';

    // Un pequeño toque de lujo: Animar las barras de progreso después de dibujarlas
    setTimeout(() => {
        document.querySelectorAll('.bg-\\[\\#FFC300\\]').forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => { bar.style.width = width; }, 100);
        });
    }, 100);
}

// ==========================================
// 🎬 MOTOR CINEMÁTICO: EL VIAJE DEL MACROCICLO
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
// 🚀 INICIALIZADOR CENTRAL BLINDADO
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token') || localStorage.getItem('admin_token');
    
    if (!token) {
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">No hay sesión activa.</p>';
        document.body.classList.add('loaded');
        return;
    }

    try {
        // En una sola petición nos traemos las Métricas de Telemetría Y los Objetivos
        const res = await fetch(`${API_BASE_URL}/api/client/metrics`);
        
        if (!res.ok) throw new Error("Acceso denegado.");
        
        const data = await res.json();
        const level = data.profile?.subscription_level || 'BASICO';

        document.getElementById('loading-spinner').classList.add('hidden');

        if (level === 'PLUS' || level === 'ULTRA') {
            const plusView = document.getElementById('plus-goals-view');
            plusView.classList.remove('hidden');
            plusView.classList.add('flex');
            
            // Le pasamos AMBOS datos a la función renderizadora para que cruce la información
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
