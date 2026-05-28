// Configuración de API Global
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allRoutines = [];
let allExercises = [];
let allUsers = [];
let allRecovery = [];

// Estado de memoria temporal para el ensamblador de rutinas
let currentRoutineExercises = [];
let currentRoutineUsers = [];

// ==========================================
// 🛠️ UTILIDADES DE UI Y CORRECCIÓN
// ==========================================
function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return alert(message);
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    const content = modal.querySelector('.modal-content');
    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
    } else {
        modal.classList.add('opacity-0'); content.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// ==========================================
// 🎛️ CONTROL DE PESTAÑAS (TRIPLE EJE)
// ==========================================
function switchTab(tab) {
    const btnR = document.getElementById('tab-btn-routines');
    const btnE = document.getElementById('tab-btn-exercises');
    const btnV = document.getElementById('tab-btn-recovery');
    
    const pnlR = document.getElementById('panel-routines');
    const pnlE = document.getElementById('panel-exercises');
    const pnlV = document.getElementById('panel-recovery');

    // Limpieza de estados visuales activos
    [btnR, btnE, btnV].forEach(b => b.className = "px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap");
    [pnlR, pnlE, pnlV].forEach(p => p.classList.add('hidden'));

    if (tab === 'routines') {
        btnR.className = "px-6 py-3 border-b-2 border-[#FFC300] text-[#FFC300] font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap";
        pnlR.classList.remove('hidden');
    } else if (tab === 'exercises') {
        btnE.className = "px-6 py-3 border-b-2 border-white text-white font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap";
        pnlE.classList.remove('hidden');
    } else if (tab === 'recovery') {
        btnV.className = "px-6 py-3 border-b-2 border-sky-400 text-sky-400 font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap";
        pnlV.classList.remove('hidden');
    }
}

// ==========================================
// 📡 SYNC SÍNCRONO CON FIRESTORE CLOUD
// ==========================================
async function fetchAllData() {
    try {
        const [resR, resE, resU, resV] = await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/routines`),
            fetch(`${API_BASE_URL}/api/admin/exercises`),
            fetch(`${API_BASE_URL}/api/admin/users`),
            fetch(`${API_BASE_URL}/api/admin/recovery`)
        ]);

        const dataR = await resR.json();
        const dataE = await resE.json();
        const dataU = await resU.json();
        const dataV = await resV.json();

        allRoutines = dataR.success ? dataR.routines : [];
        allExercises = dataE.success ? dataE.exercises : [];
        allUsers = dataU.success ? dataU.users : [];
        allRecovery = dataV.success ? dataV.protocols : [];

        renderRoutines(allRoutines);
        renderExercises(allExercises);
        renderRecovery(allRecovery);
    } catch (e) {
        showUIFeedback("Error de enlace con el Core del servidor.", "error");
    }
}

// ==========================================
// 🧘 SECCIÓN: RECOVERY ROOM (GLOBAL TIERS)
// ==========================================
function renderRecovery(list) {
    const tbody = document.getElementById('recovery-tbody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="4" class="text-center py-6 text-gray-500">Salón Recovery vacío.</td></tr>` : '';
    
    list.forEach(rec => {
        const tr = tbody.insertRow();
        tr.insertCell().innerHTML = `<span class="font-bold text-white uppercase">${rec.name || 'N/A'}</span>`;
        tr.insertCell().innerHTML = `<span class="truncate block max-w-xs text-[10px] text-gray-400">${rec.description || 'N/A'}</span>`;
        tr.insertCell().innerHTML = rec.link_tutorial ? `<a href="${rec.link_tutorial}" target="_blank" class="text-sky-400 font-bold text-[9px] uppercase hover:underline">Abrir Guía</a>` : `<span class="text-gray-600 text-[9px]">Sin Video</span>`;
        
        const act = tr.insertCell(); act.className = "text-right whitespace-nowrap";
        act.innerHTML = `
            <button onclick='openRecoveryModal(${JSON.stringify(rec).replace(/'/g, "&#39;")})' class="text-[9px] font-black text-sky-400 hover:text-white uppercase tracking-widest mr-3">Editar</button>
            <button onclick="deleteRecovery('${rec.id}', '${rec.name}')" class="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Eliminar</button>
        `;
    });
}

function openRecoveryModal(rec) {
    document.getElementById('recovery-form').reset();
    document.getElementById('rec-id').value = rec.id;
    document.getElementById('rec-is-edit').value = 'true';
    document.getElementById('rec-modal-title').textContent = `Editar Recovery: ${rec.name}`;
    
    document.getElementById('rec-name').value = rec.name;
    document.getElementById('rec-desc').value = rec.description;
    document.getElementById('rec-link').value = rec.link_tutorial || '';
    document.getElementById('rec-image').value = rec.image_url || '';
    
    toggleModal('recovery-modal', true);
}

document.getElementById('recovery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEdit = document.getElementById('rec-is-edit').value === 'true';
    const recId = document.getElementById('rec-id').value;
    const btn = document.getElementById('rec-submit-btn');

    const payload = {
        name: document.getElementById('rec-name').value.trim(),
        description: document.getElementById('rec-desc').value.trim(),
        link_tutorial: document.getElementById('rec-link').value.trim(),
        image_url: document.getElementById('rec-image').value.trim()
    };

    btn.disabled = true; btn.textContent = 'GUARDANDO...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/recovery/${recId}` : `${API_BASE_URL}/api/admin/recovery`;

    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) {
            toggleModal('recovery-modal', false);
            showUIFeedback("Salón Recovery sincronizado.");
            fetchAllData();
        } else showUIFeedback(data.error, 'error');
    } catch (e) { showUIFeedback("Falla de enlace perimetral.", 'error'); }
    btn.disabled = false; btn.textContent = 'Guardar Protocolo';
});

async function deleteRecovery(id, name) {
    if(!confirm(`⚠️ ¿Purgar permanentemente el protocolo global "${name}"?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/recovery/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showUIFeedback("Protocolo eliminado."); fetchAllData(); }
    } catch(e) {}
}

// ==========================================
// 🏋️ SECCIÓN: BASE DE EJERCICIOS (BOT LAYER)
// ==========================================
function renderExercises(list) {
    const tbody = document.getElementById('exercises-tbody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="4" class="text-center py-6 text-gray-500">Catálogo vacío.</td></tr>` : '';
    
    list.forEach(ex => {
        const tr = tbody.insertRow();
        tr.insertCell().innerHTML = `<span class="font-bold text-white uppercase">${ex.name || 'N/A'}</span> <span class="text-[8px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 ml-1 text-gray-400 font-mono">${ex.movement_pattern || 'Aislamiento'}</span>`;
        tr.insertCell().innerHTML = `<span class="truncate block max-w-xs text-[10px] text-gray-400">${ex.description || 'N/A'}</span>`;
        tr.insertCell().innerHTML = ex.link_tutorial ? `<a href="${ex.link_tutorial}" target="_blank" class="text-sky-400 font-bold text-[9px] uppercase hover:underline">Ver Video</a>` : `<span class="text-gray-600 text-[9px]">Sin Video</span>`;
        
        const act = tr.insertCell(); act.className = "text-right whitespace-nowrap";
        act.innerHTML = `
            <button onclick='openExerciseModal(${JSON.stringify(ex).replace(/'/g, "&#39;")})' class="text-[9px] font-black text-white hover:text-[#FFC300] uppercase tracking-widest mr-3">Editar</button>
            <button onclick="deleteExercise('${ex.id}', '${ex.name}')" class="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Eliminar</button>
        `;
    });
}

function openExerciseModal(ex) {
    document.getElementById('exercise-form').reset();
    document.getElementById('ex-id').value = ex.id || '';
    document.getElementById('ex-is-edit').value = 'true';
    document.getElementById('ex-modal-title').textContent = `Ficha Científica: ${ex.name}`;
    
    // Inyección de campos comerciales
    document.getElementById('ex-name').value = ex.name || '';
    document.getElementById('ex-link').value = ex.link_tutorial || '';
    document.getElementById('ex-desc').value = ex.description || '';

    // Inyección de selectores algorítmicos
    document.getElementById('ex-pattern').value = ex.movement_pattern || 'Empuje horizontal';
    document.getElementById('ex-main-muscle').value = ex.main_muscle || 'Pectoral';
    document.getElementById('ex-type').value = ex.type || 'Compuesto';
    document.getElementById('ex-equipment').value = ex.equipment || 'Peso corporal';
    document.getElementById('ex-difficulty').value = ex.difficulty || 'Principiante';
    document.getElementById('ex-tier').value = ex.subscription_tier || 'Básico';
    document.getElementById('ex-fatigue').value = ex.systemic_fatigue || 'Baja';
    document.getElementById('ex-metabolic').value = ex.metabolic_demand || 'Baja';
    
    // Nodos relacionales
    document.getElementById('ex-regression').value = ex.regression_exercise || '';
    document.getElementById('ex-progression').value = ex.progression_exercise || '';

    // Switches booleanos de control de fuerza
    document.getElementById('ex-axial').checked = ex.axial_loading === true;
    document.getElementById('ex-unilateral').checked = ex.is_unilateral === true;

    // Checkboxes indexados de articulaciones (Array)
    const joints = ex.joint_strain || [];
    document.querySelectorAll('input[name="ex_joint"]').forEach(cb => {
        cb.checked = joints.includes(cb.value);
    });
    
    toggleModal('exercise-modal', true);
}

document.getElementById('exercise-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEdit = document.getElementById('ex-is-edit').value === 'true';
    const exId = document.getElementById('ex-id').value;
    const btn = document.getElementById('ex-submit-btn');

    const selectedJoints = Array.from(document.querySelectorAll('input[name="ex_joint"]:checked')).map(cb => cb.value);
    const typeValue = document.getElementById('ex-type').value;

    const payload = {
        name: document.getElementById('ex-name').value.trim(),
        description: document.getElementById('ex-desc').value.trim(),
        link_tutorial: document.getElementById('ex-link').value.trim(),
        movement_pattern: document.getElementById('ex-pattern').value,
        main_muscle: document.getElementById('ex-main-muscle').value,
        type: typeValue,
        equipment: document.getElementById('ex-equipment').value,
        difficulty: document.getElementById('ex-difficulty').value,
        subscription_tier: document.getElementById('ex-tier').value,
        systemic_fatigue: document.getElementById('ex-fatigue').value,
        metabolic_demand: document.getElementById('ex-metabolic').value,
        regression_exercise: document.getElementById('ex-regression').value.trim(),
        progression_exercise: document.getElementById('ex-progression').value.trim(),
        axial_loading: document.getElementById('ex-axial').checked,
        is_unilateral: document.getElementById('ex-unilateral').checked,
        joint_strain: selectedJoints,
        // Inyecta el rango ideal automatizado para evitar saturación de clicks en panel administrador
        ideal_rep_ranges: typeValue === 'Compuesto' ? ["Fuerza (1-5)", "Hipertrofia (6-12)"] : ["Hipertrofia (6-12)", "Resistencia (15+)"]
    };

    btn.disabled = true; btn.textContent = 'PROPAGANDO VARIABLES...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/exercise/${exId}` : `${API_BASE_URL}/api/admin/exercise`;

    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) {
            toggleModal('exercise-modal', false);
            showUIFeedback("Base biomecánica integrada con éxito.");
            fetchAllData();
        } else showUIFeedback(data.error, 'error');
    } catch (e) { showUIFeedback("Error de comunicación perimetral.", 'error'); }
    btn.disabled = false; btn.textContent = 'Guardar Ficha Ejercicio';
});

async function deleteExercise(id, name) {
    if(!confirm(`⚠️ ¿Eliminar permanentemente el ejercicio "${name}"? El bot de entrenamiento se reajustará de forma inmediata.`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/exercise/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showUIFeedback("Ejercicio purgado."); fetchAllData(); }
    } catch(e) {}
}

// ==========================================
// 📋 SECCIÓN: ENSAMBLADOR DE RUTINAS BASE
// ==========================================
function renderRoutines(list) {
    const tbody = document.getElementById('routines-tbody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-gray-500">No hay rutinas ensambladas.</td></tr>` : '';
    
    list.forEach(rt => {
        const tr = tbody.insertRow();
        tr.insertCell().innerHTML = `<span class="font-bold text-white uppercase">${rt.name || 'N/A'}</span>`;
        tr.insertCell().innerHTML = `<span class="text-[9px] uppercase tracking-widest text-[#FFC300]">${(rt.assigned_days||[]).join(', ') || 'Ninguno'}</span>`;
        tr.insertCell().innerHTML = `<span class="font-mono text-gray-400">${(rt.exercises||[]).length} Ejercicios</span>`;
        tr.insertCell().innerHTML = `<span class="font-mono text-emerald-400">${(rt.assigned_users||[]).length} Atletas</span>`;
        
        const act = tr.insertCell(); act.className = "text-right whitespace-nowrap";
        act.innerHTML = `
            <button onclick="openRoutineModal('${rt.id}')" class="text-[9px] font-black text-[#FFC300] hover:text-white uppercase tracking-widest mr-3">Configurar</button>
            <button onclick="deleteRoutine('${rt.id}', '${rt.name}')" class="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Purgar</button>
        `;
    });
}

function openRoutineModal(id) {
    const rt = allRoutines.find(x => x.id === id); if (!rt) return;
    document.getElementById('routine-form').reset();
    document.getElementById('rt-id').value = rt.id;
    document.getElementById('rt-is-edit').value = 'true';
    document.getElementById('rt-modal-title').textContent = `Configurar: ${rt.name}`;
    document.getElementById('rt-name').value = rt.name;
    document.getElementById('rt-desc').value = rt.notes || '';
    
    document.querySelectorAll('input[name="rt_days"]').forEach(cb => {
        cb.checked = (rt.assigned_days||[]).includes(cb.value);
    });

    currentRoutineExercises = [...(rt.exercises || [])];
    currentRoutineUsers = [...(rt.assigned_users || [])];
    renderTransientExercises(); renderAssemblerUsers();
    toggleModal('routine-modal', true);
}

function renderTransientExercises(searchTerm = '') {
    const availableDiv = document.getElementById('rt-available-ex');
    const selectedDiv = document.getElementById('rt-selected-ex');
    availableDiv.innerHTML = ''; const term = searchTerm.toLowerCase();
    
    allExercises.filter(ex => (ex.name||'').toLowerCase().includes(term)).forEach(ex => {
        if (currentRoutineExercises.find(x => x.exercise_id === ex.id)) return;
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-2 rounded bg-black/40 border border-white/5 hover:border-white/20 transition cursor-pointer";
        div.innerHTML = `<span class="text-[10px] font-bold text-gray-300 truncate mr-2">${ex.name}</span><button type="button" onclick="addExerciseToRoutine('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')" class="text-[10px] text-emerald-400 font-black tracking-widest">+</button>`;
        availableDiv.appendChild(div);
    });

    selectedDiv.innerHTML = '';
    currentRoutineExercises.forEach((ex, idx) => {
        const div = document.createElement('div');
        div.className = "p-3 rounded-lg bg-black/40 border border-[#FFC300]/20 space-y-2 relative";
        div.innerHTML = `
            <div class="flex justify-between items-start"><span class="text-[10px] font-black text-[#FFC300] tracking-tighter uppercase leading-tight pr-4">${idx+1}. ${ex.exercise_name}</span><button type="button" onclick="removeExerciseFromRoutine('${ex.exercise_id}')" class="absolute top-2 right-2 text-red-500 hover:text-red-400 font-bold">&times;</button></div>
            <div class="flex gap-2">
                <div class="flex-1"><label class="text-[8px] text-gray-500 uppercase font-bold">Series</label><input type="number" min="1" value="${ex.sets || 4}" onchange="updateExParam('${ex.exercise_id}', 'sets', this.value)" class="w-full bg-black border border-white/10 rounded p-1 text-center text-xs text-white font-black"></div>
                <div class="flex-1"><label class="text-[8px] text-gray-500 uppercase font-bold">Reps</label><input type="number" min="1" value="${ex.repetitions || 10}" onchange="updateExParam('${ex.exercise_id}', 'repetitions', this.value)" class="w-full bg-black border border-white/10 rounded p-1 text-center text-xs text-white font-black"></div>
            </div>`;
        selectedDiv.appendChild(div);
    });
    document.getElementById('rt-count-ex').textContent = currentRoutineExercises.length;
}

function addExerciseToRoutine(id, name) { currentRoutineExercises.push({ exercise_id: id, exercise_name: name, sets: 4, repetitions: 10 }); renderTransientExercises(document.getElementById('rt-search-ex').value); }
function removeExerciseFromRoutine(id) { currentRoutineExercises = currentRoutineExercises.filter(x => x.exercise_id !== id); renderTransientExercises(document.getElementById('rt-search-ex').value); }
function updateExParam(id, field, val) { const ex = currentRoutineExercises.find(x => x.exercise_id === id); if(ex) ex[field] = parseInt(val) || 1; }

function renderAssemblerUsers() {
    const list = document.getElementById('rt-users-list'); list.innerHTML = '';
    allUsers.forEach(u => {
        const isChecked = currentRoutineUsers.includes(u.id); const label = document.createElement('label');
        label.className = `flex items-center gap-2 p-2 rounded cursor-pointer transition border ${isChecked ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-black/20 border-white/5 hover:border-white/20'}`;
        label.innerHTML = `<input type="checkbox" value="${u.id}" class="accent-emerald-500" ${isChecked ? 'checked' : ''} onchange="toggleUserToRoutine('${u.id}')"><span class="text-[10px] font-bold text-gray-300 truncate">${u.name} ${u.last_name || ''}</span>`;
        list.appendChild(label);
    });
}
function toggleUserToRoutine(id) { if(currentRoutineUsers.includes(id)) { currentRoutineUsers = currentRoutineUsers.filter(x => x !== id); } else { currentRoutineUsers.push(id); } renderAssemblerUsers(); }

document.getElementById('routine-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const isEdit = document.getElementById('rt-is-edit').value === 'true'; const rtId = document.getElementById('rt-id').value; const btn = document.getElementById('rt-submit-btn');
    const selectedDays = Array.from(document.querySelectorAll('input[name="rt_days"]:checked')).map(cb => cb.value);

    const payload = {
        name: document.getElementById('rt-name').value.trim(), description: document.getElementById('rt-desc').value.trim(),
        assigned_days: selectedDays, exercises: currentRoutineExercises, assigned_users: currentRoutineUsers
    };

    btn.disabled = true; btn.textContent = 'PROCESANDO...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/routine/${rtId}` : `${API_BASE_URL}/api/admin/routine`;

    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) { toggleModal('routine-modal', false); showUIFeedback("Programa físico de entrenamiento ensamblado."); fetchAllData(); } else showUIFeedback(data.error, 'error');
    } catch (e) { showUIFeedback("Error de red", 'error'); }
    btn.disabled = false; btn.textContent = 'Ensamblar Rutina';
});

async function deleteRoutine(id, name) {
    if(!confirm(`⚠️ ¿Purgar la rutina "${name}"? Todos los atletas perderán acceso instantáneo.`)) return;
    try { const res = await fetch(`${API_BASE_URL}/api/admin/routine/${id}`, { method: 'DELETE' }); const data = await res.json(); if (data.success) { showUIFeedback("Rutina eliminada."); fetchAllData(); } } catch(e) {}
}

// ==========================================
// 🚀 ORQUESTRADOR E INICIALIZACIÓN CORE
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    
    // Listeners del sistema de pestañas nativo
    document.getElementById('tab-btn-routines').addEventListener('click', () => switchTab('routines'));
    document.getElementById('tab-btn-exercises').addEventListener('click', () => switchTab('exercises'));
    document.getElementById('tab-btn-recovery').addEventListener('click', () => switchTab('recovery'));

    // Filtros de búsqueda asíncronos en tiempo real
    document.getElementById('exercise-search').addEventListener('input', e => {
        const v = e.target.value.toLowerCase().trim();
        renderExercises(allExercises.filter(ex => (ex.name||'').toLowerCase().includes(v)));
    });
    document.getElementById('routine-search').addEventListener('input', e => {
        const v = e.target.value.toLowerCase().trim();
        renderRoutines(allRoutines.filter(rt => (rt.name||'').toLowerCase().includes(v)));
    });
    document.getElementById('recovery-search').addEventListener('input', e => {
        const v = e.target.value.toLowerCase().trim();
        renderRecovery(allRecovery.filter(r => (r.name||'').toLowerCase().includes(v)));
    });

    // Enlace del buscador interno del ensamblador
    document.getElementById('rt-search-ex').addEventListener('input', e => renderTransientExercises(e.target.value));

    // Desencadenador del modal de creación de ejercicios limpios
    document.getElementById('add-exercise-btn').addEventListener('click', () => {
        document.getElementById('exercise-form').reset();
        document.getElementById('ex-id').value = '';
        document.getElementById('ex-is-edit').value = 'false';
        document.getElementById('ex-modal-title').textContent = 'Inyectar Ejercicio Científico';
        toggleModal('exercise-modal', true);
    });

    fetchAllData();
});
