const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let activeSelectedUserId = null;

// ==========================================
// 🧠 DICCIONARIO ALGORÍTMICO DE MÉTRICAS
// Conecta los objetivos con la biometría real
// ==========================================
const MEASURABLE_METRICS = [
    { id: "weight", label: "Peso Corporal Base", unit: "kg" },
    { id: "fat_percent", label: "% Grasa Estimada", unit: "%" },
    { id: "muscle_percent", label: "% Masa Muscular", unit: "%" },
    { id: "waist", label: "Perímetro Cintura", unit: "cm" },
    { id: "rm_push", label: "Potencia: 1RM Empuje", unit: "kg" },
    { id: "rm_pull", label: "Potencia: 1RM Tracción", unit: "kg" },
    { id: "rm_legs", label: "Potencia: 1RM Pierna", unit: "kg" },
    { id: "custom", label: "Hábito Cualitativo / Otro", unit: "" }
];

function getSecureHeaders() {
    const token = localStorage.getItem('admin_token'); 
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

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

// ==========================================
// 🏗️ FÁBRICA DE OBJETIVOS DINÁMICOS
// ==========================================
function addGoalRow(containerId, data = null) {
    const container = document.getElementById(containerId);
    const rowId = `goal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const metricOptions = MEASURABLE_METRICS.map(m => 
        `<option value="${m.id}" ${data && data.metric_key === m.id ? 'selected' : ''}>${m.label}</option>`
    ).join('');

    const isDone = data && data.status === 'Cumplido';
    
    const row = document.createElement('div');
    row.className = 'goal-row flex flex-col xl:flex-row gap-3 p-4 bg-black/50 border border-white/5 rounded-2xl items-end relative transition-all hover:border-white/10';
    row.id = rowId;

    row.innerHTML = `
        <div class="w-full xl:w-1/5">
            <label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Variable Base</label>
            <select class="goal-metric-key bg-black border border-white/10 rounded-lg p-2 text-[10px] font-bold text-white outline-none w-full">
                ${metricOptions}
            </select>
        </div>
        <div class="w-full xl:w-[15%]">
            <label class="block text-[8px] text-[#FFC300] uppercase font-black mb-1 xl:text-center">Valor Target</label>
            <input type="text" class="goal-target gymenez-input !p-2 xl:!text-center !text-[#FFC300]" placeholder="Ej: 75.5" value="${data ? (data.target_value || '') : ''}">
        </div>
        <div class="w-full xl:flex-grow">
            <label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Descripción / Directiva SMART</label>
            <input type="text" class="goal-desc gymenez-input !p-2 !text-xs" placeholder="Describe la meta de forma medible..." value="${data ? (data.description || '') : ''}">
        </div>
        <div class="w-full xl:w-1/6">
            <label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Estatus</label>
            <select class="goal-status bg-black border border-white/10 rounded-lg p-2 text-[10px] font-black uppercase ${isDone ? 'text-emerald-400' : 'text-gray-300'} outline-none w-full">
                <option value="En progreso" ${!isDone ? 'selected' : ''}>En progreso</option>
                <option value="Cumplido" ${isDone ? 'selected' : ''}>Cumplido</option>
            </select>
        </div>
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="w-full xl:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase transition shrink-0">
            Eliminar
        </button>
    `;

    container.appendChild(row);

    // Automatización de Descripciones al seleccionar variables
    const selectEl = row.querySelector('.goal-metric-key');
    const targetEl = row.querySelector('.goal-target');
    const descEl = row.querySelector('.goal-desc');
    const statusEl = row.querySelector('.goal-status');

    const updateDescription = () => {
        const metricKey = selectEl.value;
        const metricObj = MEASURABLE_METRICS.find(m => m.id === metricKey);
        if (metricKey !== 'custom' && targetEl.value.trim() !== '') {
            descEl.value = `Establecer ${metricObj.label.toLowerCase()} en ${targetEl.value} ${metricObj.unit}`.trim();
        }
    };

    statusEl.addEventListener('change', (e) => {
        e.target.className = `goal-status bg-black border border-white/10 rounded-lg p-2 text-[10px] font-black uppercase outline-none w-full ${e.target.value === 'Cumplido' ? 'text-emerald-400' : 'text-gray-300'}`;
    });

    selectEl.addEventListener('change', updateDescription);
    targetEl.addEventListener('input', updateDescription);
}

// Extractor de arreglos para empaquetar JSON
function extractGoalsArray(containerId) {
    const rows = document.querySelectorAll(`#${containerId} .goal-row`);
    return Array.from(rows).map(row => ({
        metric_key: row.querySelector('.goal-metric-key').value,
        target_value: row.querySelector('.goal-target').value,
        description: row.querySelector('.goal-desc').value,
        status: row.querySelector('.goal-status').value
    }));
}

// ==========================================
// 📥 CARGA DE DATOS Y RENDERIZADO
// ==========================================
async function loadAthletesSidebar(filterText = '') {
    const container = document.getElementById('athletes-list-container');
    const badge = document.getElementById('users-count-badge');
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: getSecureHeaders() });
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
                
                item.className = `p-3 rounded-xl border transition duration-300 cursor-pointer flex flex-col gap-0.5 select-none ${isActive ? 'bg-[#FFC300]/10 border-[#FFC300]' : 'bg-black/30 border-white/5 hover:border-white/10'}`;
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
        container.innerHTML = `<p class="text-center text-red-400 font-bold uppercase text-[9px] py-4">Error Central de Red</p>`;
    }
}

async function fetchUserProfile(userId) {
    const workspace = document.getElementById('workspace-container');
    const emptyView = document.getElementById('no-athlete-selected-view');
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/fitness-profile/${userId}`, { headers: getSecureHeaders() });
        const data = await res.json();
        
        if (data.success) {
            emptyView.classList.add('hidden');
            workspace.classList.remove('hidden');

            const m = data.metrics || {};
            // Mapeo Base con edad calculada
            document.getElementById('m-weight').value = m.weight || '';
            document.getElementById('m-height').value = m.height || '';
            document.getElementById('m-age').value = m.age || '--';
            document.getElementById('m-fat').value = m.fat_percent || '';
            document.getElementById('m-muscle').value = m.muscle_percent || '';
            
            // Mapeo Superior
            document.getElementById('m-neck').value = m.neck || '';
            document.getElementById('m-back').value = m.back || '';
            document.getElementById('m-thorax').value = m.thorax || '';
            document.getElementById('m-abdomen').value = m.abdomen || '';
            document.getElementById('m-bicep-l').value = m.bicep_left || '';
            document.getElementById('m-bicep-r').value = m.bicep_right || '';
            document.getElementById('m-forearm-l').value = m.forearm_left || '';
            document.getElementById('m-forearm-r').value = m.forearm_right || '';
            
            // Mapeo Inferior
            document.getElementById('m-waist').value = m.waist || '';
            document.getElementById('m-femur-l').value = m.femur_left || '';
            document.getElementById('m-femur-r').value = m.femur_right || '';
            document.getElementById('m-tibia-l').value = m.tibia_left || '';
            document.getElementById('m-tibia-r').value = m.tibia_right || '';
            
            // Mecánicas (1RM)
            document.getElementById('m-push').value = m.rm_push || '';
            document.getElementById('m-pull').value = m.rm_pull || '';
            document.getElementById('m-legs').value = m.rm_legs || '';

            // Ficha Médica
            document.getElementById('m-allergies').value = m.allergies || '';
            document.getElementById('m-diseases').value = m.chronic_diseases || '';
            document.getElementById('m-medical-notes').value = m.medical_notes || '';

            // Mapeo Dinámico de Objetivos
            const g = data.goals || {};
            document.getElementById('g-focus').value = g.focus || 'Masa Muscular';
            
            // Limpiamos los contenedores
            document.getElementById('st-goals-container').innerHTML = '';
            document.getElementById('mt-goals-container').innerHTML = '';
            document.getElementById('lt-goals-container').innerHTML = '';

            // Renderizamos los arreglos
            const normalize = (val) => Array.isArray(val) ? val : (val && val.description ? [val] : []);
            normalize(g.short_term).forEach(goal => addGoalRow('st-goals-container', goal));
            normalize(g.medium_term).forEach(goal => addGoalRow('mt-goals-container', goal));
            normalize(g.long_term).forEach(goal => addGoalRow('lt-goals-container', goal));
        }
    } catch (e) { 
        showUIFeedback("Error de lectura.", "error"); 
    }
}

// ==========================================
// 🚀 EVENTOS DE FORMULARIO (SUBMITS)
// ==========================================
document.getElementById('metrics-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!activeSelectedUserId) return;
    const btn = document.getElementById('btn-submit-metrics');
    
    const payload = {
        weight: document.getElementById('m-weight').value,
        height: document.getElementById('m-height').value,
        fat_percent: document.getElementById('m-fat').value,
        muscle_percent: document.getElementById('m-muscle').value,
        neck: document.getElementById('m-neck').value,
        back: document.getElementById('m-back').value,
        thorax: document.getElementById('m-thorax').value,
        abdomen: document.getElementById('m-abdomen').value,
        bicep_left: document.getElementById('m-bicep-l').value,
        bicep_right: document.getElementById('m-bicep-r').value,
        forearm_left: document.getElementById('m-forearm-l').value,
        forearm_right: document.getElementById('m-forearm-r').value,
        waist: document.getElementById('m-waist').value,
        femur_left: document.getElementById('m-femur-l').value,
        femur_right: document.getElementById('m-femur-r').value,
        tibia_left: document.getElementById('m-tibia-l').value,
        tibia_right: document.getElementById('m-tibia-r').value,
        rm_push: document.getElementById('m-push').value,
        rm_pull: document.getElementById('m-pull').value,
        rm_legs: document.getElementById('m-legs').value,
        allergies: document.getElementById('m-allergies').value,
        chronic_diseases: document.getElementById('m-diseases').value,
        medical_notes: document.getElementById('m-medical-notes').value
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

    // Ahora enviamos arreglos extraídos de la interfaz
    const payload = {
        focus: document.getElementById('g-focus').value,
        short_term: extractGoalsArray('st-goals-container'),
        medium_term: extractGoalsArray('mt-goals-container'),
        long_term: extractGoalsArray('lt-goals-container')
    };

    btn.disabled = true; btn.textContent = 'INDEXANDO MACROCICLO...';
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/goals/${activeSelectedUserId}`, { 
            method: 'POST', 
            headers: getSecureHeaders(), 
            body: JSON.stringify(payload) 
        });
        const data = await res.json();
        if(data.success) showUIFeedback("Matriz de objetivos algorítmicos guardada.");
    } catch (e) { showUIFeedback("Error de red.", "error"); }
    btn.disabled = false; btn.textContent = 'Fijar Matriz Estratégica';
});

// ==========================================
// 🎯 INICIALIZACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    
    document.getElementById('tab-btn-metrics').addEventListener('click', () => switchTab('metrics'));
    document.getElementById('tab-btn-goals').addEventListener('click', () => switchTab('goals'));
    
    document.getElementById('user-search-input').addEventListener('input', (e) => {
        loadAthletesSidebar(e.target.value);
    });
    
    loadAthletesSidebar();
});
