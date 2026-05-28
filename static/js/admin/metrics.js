const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

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

    // Solo se autocompleta si el campo de texto está vacío para no machacar datos del admin
    if(!document.getElementById('g-st-desc').value.trim()) document.getElementById('g-st-desc').value = template.st;
    if(!document.getElementById('g-mt-desc').value.trim()) document.getElementById('g-mt-desc').value = template.mt;
    if(!document.getElementById('g-lt-desc').value.trim()) document.getElementById('g-lt-desc').value = template.lt;
}

// ==========================================
// 📡 ENLACE DE DATOS CON ENDPOINTS
// ==========================================
async function loadUsersDropdown() {
    const selector = document.getElementById('user-selector');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/users`);
        const data = await res.json();
        if (data.success) {
            data.users.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id; opt.textContent = `${u.name} ${u.last_name || ''} (${u.email})`;
                selector.appendChild(opt);
            });
        }
    } catch (e) { console.error("Error cargando atletas."); }
}

async function fetchUserProfile(userId) {
    if (!userId) {
        document.getElementById('workspace-container').classList.add('hidden');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/fitness-profile/${userId}`);
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('workspace-container').classList.remove('hidden');
            document.getElementById('last-sync-tag').textContent = "Expediente Sincronizado";

            // Rellenar métricas actuales
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

            // Rellenar objetivos macrociclo
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

            // Si las descripciones de objetivos están vacías, aplicamos el glosario automático de inmediato
            autoFillGlossaryTemplates();
        }
    } catch (e) { showUIFeedback("Error de lectura biométrica.", "error"); }
}

// Envíos de Formulario (Form Submits)
document.getElementById('metrics-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('user-selector').value;
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

    btn.disabled = true; btn.textContent = 'ASENTANDO...';
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/metrics/${userId}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const data = await res.json();
        if(data.success) showUIFeedback("Telemetría corporal actualizada.");
    } catch (e) { showUIFeedback("Error de red.", "error"); }
    btn.disabled = false; btn.textContent = 'Asentar Registro Biométrico';
});

document.getElementById('goals-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('user-selector').value;
    const btn = document.getElementById('btn-submit-goals');

    const payload = {
        focus: document.getElementById('g-focus').value,
        st_desc: document.getElementById('g-st-desc').value, st_target: document.getElementById('g-st-target').value, st_status: document.getElementById('g-st-status').value,
        mt_desc: document.getElementById('g-mt-desc').value, mt_target: document.getElementById('g-mt-target').value, mt_status: document.getElementById('g-mt-status').value,
        lt_desc: document.getElementById('g-lt-desc').value, lt_target: document.getElementById('g-lt-target').value, lt_status: document.getElementById('g-lt-status').value
    };

    btn.disabled = true; btn.textContent = 'INDEXANDO...';
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/goals/${userId}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const data = await res.json();
        if(data.success) showUIFeedback("Macrociclo de objetivos configurado.");
    } catch (e) { showUIFeedback("Error de red.", "error"); }
    btn.disabled = false; btn.textContent = 'Fijar Objetivos Estratégicos';
});

// ==========================================
// 🚀 INICIALIZACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    
    // Listeners del ecosistema
    document.getElementById('tab-btn-metrics').addEventListener('click', () => switchTab('metrics'));
    document.getElementById('tab-btn-goals').addEventListener('click', () => switchTab('goals'));
    document.getElementById('g-focus').addEventListener('change', () => {
        // Al alterar el foco, forzamos un reset limpio de descripciones para que entren las nuevas plantillas
        document.getElementById('g-st-desc').value = '';
        document.getElementById('g-mt-desc').value = '';
        document.getElementById('g-lt-desc').value = '';
        autoFillGlossaryTemplates();
    });
    
    document.getElementById('user-selector').addEventListener('change', (e) => fetchUserProfile(e.target.value));

    // Arranque
    loadUsersDropdown();
});
