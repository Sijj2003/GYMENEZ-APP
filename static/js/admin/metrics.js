const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// ID del atleta seleccionado activamente en el espacio de trabajo
let activeSelectedUserId = null;

// ==========================================
// 📚 GLOSARIO CIENTÍFICO DE PLANTILLAS SMART
// ==========================================
const GOALS_GLOSSARY = {
    "Pérdida de Grasa": {
        st: "Reducir el porcentaje de grasa corporal mediante un déficit calórico controlado y asentar el hábito de registro diario alimentario.",
        mt: "Reducción adaptativa de medidas antropométricas basales y estabilización de la energía metabólica diaria sin picos de fatiga.",
        lt: "Alcanzar y mantener el porcentaje de adiposidad objetivo de forma completamente sostenible y con flexibilidad metabólica activa."
    },
    "Masa Muscular": {
        st: "Incrementar el volumen de tejido magro primario optimizando la resíntesis de glucógeno y la recuperación neuromuscular.",
        mt: "Superar mesetas de fuerza incrementando las cargas en los vectores principales del entrenamiento de forma progresiva.",
        lt: "Consolidar de masa muscular real y densa, mitigando asimetrías y logrando un balance estético y estructural óptimo."
    },
    "Rendimiento / Calistenia": {
        st: "Dominar la ejecución técnica y control motor de los patrones multiarticulares compuestos básicos corporales.",
        mt: "Alcanzar hitos avanzados de fuerza relativa, optimizando el reclutamiento de unidades motoras en tracciones y empujes.",
        lt: "Dominar cadenas cinemáticas complejas de alta demanda técnica manteniendo estabilidad articular absoluta en cada plano."
    },
    "Salud / Cardio": {
        st: "Reducir la frecuencia cardíaca basal en reposo y optimizar el volumen de pasos y actividad diaria sostenida.",
        mt: "Incrementar el techo de capacidad cardiovascular (VO2 Máx) acelerando los tiempos de recuperación celular post-esfuerzo.",
        lt: "Maximizar la eficiencia del sistema cardiorrespiratorio y consolidar un perfil lipídico y analíticas de salud de élite."
    }
};

// ==========================================
// 🛡️ CAPA DE SEGURIDAD (TOKEN BLINDADO)
// ==========================================
function getSecureHeaders() {
    const token = localStorage.getItem('admin_token'); 
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ==========================================
// 🛠️ CONTROLADORES VISUALES CORE
// ==========================================
function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

function switchTab(tab) {
    const btnM = document.getElementById('tab-btn-metrics');
    const btnG = document.getElementById('tab-btn-goals');
    const pnlM = document.getElementById('panel-metrics');
    const pnlG = document.getElementById('panel-goals');

    btnM.className = "px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap";
    btnG.className = "px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap";
    pnlM.classList.add('hidden'); pnlG.classList.add('hidden');

    if (tab === 'metrics') {
        btnM.className = "px-6 py-3 border-b-2 border-[#FFC300] text-[#FFC300] font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap";
        pnlM.classList.remove('hidden');
    } else {
        btnG.className = "px-6 py-3 border-b-2 border-white text-white font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap";
        pnlG.classList.remove('hidden');
    }
}

function autoFillGlossaryTemplates() {
    const focusSelected = document.getElementById('g-focus').value;
    const template = GOALS_GLOSSARY[focusSelected];
    if (!template) return;

    if(!document.getElementById('g-st-desc').value.trim()) document.getElementById('g-st-desc').value = template.st;
    if(!document.getElementById('g-mt-desc').value.trim()) document.getElementById('g-mt-desc').value = template.mt;
    if(!document.getElementById('g-lt-desc').value.trim()) document.getElementById('g-lt-desc').value = template.lt;
}

// ==========================================
// 📡 ENLACE DE DATOS PROTEGIDO (ENDPOINTS)
// ==========================================
async function loadAthletesSidebar(filterText = '') {
    const container = document.getElementById('athletes-list-container');
    const badge = document.getElementById('users-count-badge');
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
            headers: getSecureHeaders()
        });
        const data = await res.json();
        
        if (data.success) {
            let list = data.users || [];
            const term = filterText.toLowerCase().trim();
            
            if (term) {
                list = list.filter(u => 
                    (u.name || '').toLowerCase().includes(term) || 
                    (u.last_name || '').toLowerCase().includes(term) || 
                    (u.email || '').toLowerCase().includes(term)
                );
            } else {
                list = list.slice(0, 20); 
            }

            badge.textContent = list.length;
            container.innerHTML = list.length === 0 ? `<p class="text-center text-gray-600 font-bold uppercase text-[9px] py-4">Sin Coincidencias</p>` : '';

            list.forEach(u => {
                const item = document.createElement('div');
                const isActive = u.id === activeSelectedUserId;
                
                item.className = `p-3 rounded-xl border transition {{hardware-acceleration}} duration-300 cursor-pointer flex flex-col gap-0.5 select-none ${isActive ? 'bg-[#FFC300]/10 border-[#FFC300]' : 'bg-black/30 border-white/5 hover:border-white/10'}`;
                item.innerHTML = `
                    <span class="font-black text-white uppercase text-[10px] tracking-tight truncate">${u.name} ${u.last_name || ''}</span>
                    <span class="text-[8px] font-mono text-gray-500 truncate">${u.email}</span>
                `;
                
                item.addEventListener('click', () => {
                    activeSelectedUserId = u.id;
                    loadAthletesSidebar(document.getElementById('user-search-input').value);
                    fetchUserProfile(u.id);
                });
                
                container.appendChild(item);
            });
        }
    } catch (e) {
        container.innerHTML = `<p class="text-center text-red-400 font-bold uppercase text-[9px] py-4">Sesión Expirada / Error Central</p>`;
    }
}

async function fetchUserProfile(userId) {
    const workspace = document.getElementById('workspace-container');
    const emptyView = document.getElementById('no-athlete-selected-view');
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/fitness-profile/${userId}`, {
            headers: getSecureHeaders()
        });
        const data = await res.json();
        
        if (data.success) {
            emptyView.classList.add('hidden');
            workspace.classList.remove('hidden');

            // Rellenar métricas antropométricas y mecánicas
            const m = data.metrics || {};
            document.getElementById('m-weight').value = m.weight || '';
            document.getElementById('m-fat').value = m.fat_percent || '';
            document.getElementById('m-muscle').value = m.muscle_percent || '';
            document.getElementById('m-chest').value = m.chest || '';
            document.getElementById('m-waist').value = m.waist || '';
            document.getElementById('m-bicep-l').value = m.bicep_left || '';
            document.getElementById('m-bicep-r').value = m.bicep_right || '';
            document.getElementById('m-hip').value = m.hip || '';
            document.getElementById('m-thigh-l').value = m.thigh_left || '';
            document.getElementById('m-thigh-r').value = m.thigh_right || '';
            document.getElementById('m-push').value = m.rm_push || '';
            document.getElementById('m-pull').value = m.rm_pull || '';
            document.getElementById('m-legs').value = m.rm_legs || '';

            // Rellenar objetivos de macrociclo
            const g = data.goals || {};
            document.getElementById('g-focus').value = g.focus || 'Masa Muscular';
            
            document.getElementById('g-st-desc').value = g.short_term?.description || '';
            document.getElementById('g-st-target').value = g.short_term?.target_value || '';
            document.getElementById('g-st-status').value = g.short_term?.status || 'En progreso';

            document.getElementById('g-mt-desc').value = g.medium_term?.description || '';
            document.getElementById('g-mt-target').value = g.medium_term?.target_value || '';
            document.getElementById('g-mt-status').value = g.medium_term?.status || 'En progreso';

            document.getElementById('g-lt-desc').value = g.long_term?.description || '';
            document.getElementById('g-lt-target').value = g.long_term?.target_value || '';
            document.getElementById('g-lt-status').value = g.long_term?.status || 'En progreso';

            autoFillGlossaryTemplates();
        }
    } catch (e) { 
        showUIFeedback("Fallo de autenticación o lectura.", "error"); 
    }
}

// ==========================================
// 🚀 PROCESAMIENTO DE FORMULARIOS SECURE
// ==========================================
document.getElementById('metrics-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!activeSelectedUserId) return;
    const btn = document.getElementById('btn-submit-metrics');
    
    const payload = {
        weight: document.getElementById('m-weight').value, fat_percent: document.getElementById('m-fat').value,
        muscle_percent: document.getElementById('m-muscle').value, chest: document.getElementById('m-chest').value,
        waist: document.getElementById('m-waist').value, bicep_left: document.getElementById('m-bicep-l').value,
        bicep_right: document.getElementById('m-bicep-r').value, hip: document.getElementById('m-hip').value,
        thigh_left: document.getElementById('m-thigh-l').value, thigh_right: document.getElementById('m-thigh-r').value,
        rm_push: document.getElementById('m-push').value, rm_pull: document.getElementById('m-pull').value,
        rm_legs: document.getElementById('m-legs').value
    };

    btn.disabled = true; btn.textContent = 'ASENTANDO EN LA NUBE...';
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/metrics/${activeSelectedUserId}`, { 
            method: 'POST', 
            headers: getSecureHeaders(), 
            body: JSON.stringify(payload) 
        });
        const data = await res.json();
        if(data.success) showUIFeedback("Telemetría corporal actualizada.");
    } catch (e) { showUIFeedback("Error de red.", "error"); }
    btn.disabled = false; btn.textContent = 'Asentar Registro Biométrico';
});

document.getElementById('goals-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!activeSelectedUserId) return;
    const btn = document.getElementById('btn-submit-goals');

    const payload = {
        focus: document.getElementById('g-focus').value,
        st_desc: document.getElementById('g-st-desc').value, st_target: document.getElementById('g-st-target').value, st_status: document.getElementById('g-st-status').value,
        mt_desc: document.getElementById('g-mt-desc').value, mt_target: document.getElementById('g-mt-target').value, mt_status: document.getElementById('g-mt-status').value,
        lt_desc: document.getElementById('g-lt-desc').value, lt_target: document.getElementById('g-lt-target').value, lt_status: document.getElementById('g-lt-status').value
    };

    btn.disabled = true; btn.textContent = 'INDEXANDO MACROCICLO...';
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/goals/${activeSelectedUserId}`, { 
            method: 'POST', 
            headers: getSecureHeaders(), 
            body: JSON.stringify(payload) 
        });
        const data = await res.json();
        if(data.success) showUIFeedback("Macrociclo de objetivos configurado.");
    } catch (e) { showUIFeedback("Error de red.", "error"); }
    btn.disabled = false; btn.textContent = 'Fijar Objetivos Estratégicos';
});

// ==========================================
// 🏎️ ORQUESTRADOR DE INICIALIZACIÓN (DOM)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    
    // Enlace de navegadores de pestañas duales
    document.getElementById('tab-btn-metrics').addEventListener('click', () => switchTab('metrics'));
    document.getElementById('tab-btn-goals').addEventListener('click', () => switchTab('goals'));
    
    // Escucha del filtro del buscador rápido lateral
    document.getElementById('user-search-input').addEventListener('input', (e) => {
        loadAthletesSidebar(e.target.value);
    });

    // Reset estructural automático de foco SMART
    document.getElementById('g-focus').addEventListener('change', () => {
        document.getElementById('g-st-desc').value = '';
        document.getElementById('g-mt-desc').value = '';
        document.getElementById('g-lt-desc').value = '';
        autoFillGlossaryTemplates();
    });
    
    // Ejecución de la primera consulta controlada
    loadAthletesSidebar();
});
