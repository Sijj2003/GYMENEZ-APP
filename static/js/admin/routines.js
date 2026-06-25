// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Memoria RAM
let allRoutines = [], allExercises = [], allUsers = [], allRecovery = [];
let activeTab = 'routines'; // 'routines', 'exercises', 'recovery'
let currentRoutineExercises = [], currentRoutineUsers = [];

// Constantes UI
const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const JOINTS = ['Hombro', 'Codo', 'Muñeca', 'Columna', 'Cadera', 'Rodilla'];

function getSecureHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymen_admin_token')}` };
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

// ==========================================
// 📡 CARGA INICIAL (BATCH FETCH)
// ==========================================
async function fetchAllData() {
    try {
        const headers = getSecureHeaders();
        const [resR, resE, resU, resV] = await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/routines`, { headers }),
            fetch(`${API_BASE_URL}/api/admin/exercises`, { headers }),
            fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
            fetch(`${API_BASE_URL}/api/admin/recovery`, { headers })
        ]);

        const [dataR, dataE, dataU, dataV] = await Promise.all([resR.json(), resE.json(), resU.json(), resV.json()]);

        allRoutines = dataR.success ? dataR.routines : [];
        allExercises = dataE.success ? dataE.exercises : [];
        allUsers = dataU.success ? dataU.users : [];
        allRecovery = dataV.success ? dataV.protocols : [];

        // Generar elementos UI estáticos
        generateDayChips();
        generateJointCheckboxes();
        
        // Refrescar lista actual
        refreshActiveList();
    } catch (e) { showUIFeedback("Error de enlace con el Core.", "error"); }
}

// ==========================================
// 🎛️ CONTROL DE PESTAÑAS Y LISTAS (IZQUIERDA)
// ==========================================
function switchInventoryTab(tab) {
    activeTab = tab;
    document.getElementById('search-inventory').value = ''; // Limpiar buscador
    
    // UI Pestañas
    ['routines', 'exercises', 'recovery'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(t === tab) {
            btn.className = "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg bg-white/10 text-white shadow transition-all";
        } else {
            btn.className = "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg text-gray-500 hover:text-white transition-all";
        }
    });

    hideAllWorkspaces();
    refreshActiveList();
}

function refreshActiveList(searchTerm = '') {
    const term = searchTerm.toLowerCase().trim();
    const container = document.getElementById('inventory-list');
    container.innerHTML = '';

    let list = [];
    if (activeTab === 'routines') list = allRoutines.filter(x => (x.name||'').toLowerCase().includes(term));
    if (activeTab === 'exercises') list = allExercises.filter(x => (x.name||'').toLowerCase().includes(term));
    if (activeTab === 'recovery') list = allRecovery.filter(x => (x.name||'').toLowerCase().includes(term));

    if (list.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 font-bold uppercase tracking-widest text-[9px]">Sin resultados.</div>`;
        return;
    }

    list.forEach(item => {
        const div = document.createElement('div');
        div.className = `p-3 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/10 cursor-pointer transition-all duration-200 flex justify-between items-center`;
        
        if (activeTab === 'routines') {
            div.innerHTML = `
                <div class="flex-1 min-w-0"><p class="text-[10px] font-black uppercase text-white truncate">${item.name}</p><p class="text-[8px] text-[#FFC300] uppercase font-bold truncate">${(item.assigned_days||[]).join(', ') || 'Sin días'}</p></div>
                <div class="text-[8px] text-gray-500 font-mono text-right ml-2">${(item.exercises||[]).length} Ej<br>${(item.assigned_users||[]).length} Usr</div>
            `;
            div.onclick = () => loadRoutineWorkspace(item.id);
        } else if (activeTab === 'exercises') {
            div.innerHTML = `
                <div class="flex-1 min-w-0"><p class="text-[10px] font-black uppercase text-white truncate">${item.name}</p><p class="text-[8px] text-emerald-400 uppercase font-bold truncate">${item.main_muscle}</p></div>
                <div class="text-[8px] text-gray-500 font-mono text-right ml-2">${item.type}</div>
            `;
            div.onclick = () => loadExerciseWorkspace(item.id);
        } else {
            div.innerHTML = `
                <div class="flex-1 min-w-0"><p class="text-[10px] font-black uppercase text-white truncate">${item.name}</p></div>
            `;
            div.onclick = () => loadRecoveryWorkspace(item.id);
        }
        container.appendChild(div);
    });
}

let searchTimeout;
document.getElementById('search-inventory').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => refreshActiveList(e.target.value), 200);
});

// ==========================================
// 🖥️ CONTROL DE LIENZOS DE TRABAJO (DERECHA)
// ==========================================
function hideAllWorkspaces() {
    document.getElementById('ws-empty').classList.add('hidden');
    document.getElementById('ws-routine').classList.add('hidden'); document.getElementById('ws-routine').classList.remove('flex');
    document.getElementById('ws-exercise').classList.add('hidden'); document.getElementById('ws-exercise').classList.remove('flex');
    document.getElementById('ws-recovery').classList.add('hidden'); document.getElementById('ws-recovery').classList.remove('flex');
}

function openCreateWorkspace() {
    hideAllWorkspaces();
    if (activeTab === 'routines') {
        document.getElementById('ws-routine').classList.remove('hidden'); document.getElementById('ws-routine').classList.add('flex');
        document.getElementById('rt-header-title').textContent = "Nueva Rutina";
        document.getElementById('rt-header-title').className = "text-2xl font-black uppercase tracking-tighter text-[#FFC300]";
        document.getElementById('rt-btn-delete').classList.add('hidden');
        document.getElementById('rt-id').value = '';
        document.getElementById('rt-is-edit').value = 'false';
        document.getElementById('rt-name').value = '';
        document.getElementById('rt-desc').value = '';
        document.querySelectorAll('input[name="rt_days"]').forEach(cb => cb.checked = false);
        currentRoutineExercises = []; currentRoutineUsers = [];
        renderAssemblerLists();
    } else if (activeTab === 'exercises') {
        document.getElementById('ws-exercise').classList.remove('hidden'); document.getElementById('ws-exercise').classList.add('flex');
        document.getElementById('ex-header-title').textContent = "Nuevo Ejercicio";
        document.getElementById('ex-header-title').className = "text-2xl font-black uppercase tracking-tighter text-emerald-400";
        document.getElementById('ex-btn-delete').classList.add('hidden');
        document.getElementById('ex-form').reset();
        document.getElementById('ex-id').value = '';
        document.getElementById('ex-is-edit').value = 'false';
        document.querySelectorAll('input[name="ex_joint"]').forEach(cb => cb.checked = false);
    } else {
        document.getElementById('ws-recovery').classList.remove('hidden'); document.getElementById('ws-recovery').classList.add('flex');
        document.getElementById('rec-header-title').textContent = "Nuevo Protocolo";
        document.getElementById('rec-header-title').className = "text-2xl font-black uppercase tracking-tighter text-sky-400";
        document.getElementById('rec-btn-delete').classList.add('hidden');
        document.getElementById('rec-form').reset();
        document.getElementById('rec-id').value = '';
        document.getElementById('rec-is-edit').value = 'false';
    }
}

// ==========================================
// 🏋️‍♂️ LÓGICA: RUTINAS
// ==========================================
function generateDayChips() {
    const container = document.getElementById('rt-days-container');
    container.innerHTML = DAYS_OF_WEEK.map(d => `
        <label class="day-chip cursor-pointer relative">
            <input type="checkbox" name="rt_days" value="${d}" class="peer sr-only">
            <div class="px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-bold uppercase text-gray-500 hover:text-white hover:border-white/30 transition-all">${d}</div>
        </label>
    `).join('');
}

function loadRoutineWorkspace(id) {
    const rt = allRoutines.find(x => x.id === id); if (!rt) return;
    hideAllWorkspaces();
    document.getElementById('ws-routine').classList.remove('hidden'); document.getElementById('ws-routine').classList.add('flex');
    
    document.getElementById('rt-header-title').textContent = rt.name;
    document.getElementById('rt-header-title').className = "text-2xl font-black uppercase tracking-tighter text-white";
    document.getElementById('rt-btn-delete').classList.remove('hidden');
    
    document.getElementById('rt-id').value = rt.id;
    document.getElementById('rt-is-edit').value = 'true';
    document.getElementById('rt-name').value = rt.name;
    document.getElementById('rt-desc').value = rt.notes || '';
    
    document.querySelectorAll('input[name="rt_days"]').forEach(cb => { cb.checked = (rt.assigned_days||[]).includes(cb.value); });

    currentRoutineExercises = [...(rt.exercises || [])];
    currentRoutineUsers = [...(rt.assigned_users || [])];
    renderAssemblerLists();
}

function renderAssemblerLists(searchUser = '', searchEx = '') {
    // Renderear Usuarios
    const uTerm = searchUser.toLowerCase();
    const uFiltered = allUsers.filter(u => (u.full_name||'').toLowerCase().includes(uTerm));
    document.getElementById('rt-users-count').textContent = currentRoutineUsers.length;
    document.getElementById('rt-users-list').innerHTML = uFiltered.map(u => {
        const isChecked = currentRoutineUsers.includes(u.id);
        return `
        <label class="flex items-center gap-2 p-2 rounded cursor-pointer transition border ${isChecked ? 'bg-sky-500/10 border-sky-500/30' : 'bg-black/20 border-transparent hover:bg-white/5'}">
            <input type="checkbox" value="${u.id}" class="accent-sky-500 w-3 h-3" ${isChecked ? 'checked' : ''} onchange="toggleUserToRoutine('${u.id}')">
            <span class="text-[9px] font-bold ${isChecked ? 'text-sky-400' : 'text-gray-300'} uppercase truncate">${u.full_name}</span>
        </label>`;
    }).join('');

    // Renderear Ejercicios Disponibles y Seleccionados
    const eTerm = searchEx.toLowerCase();
    const eFiltered = allExercises.filter(ex => (ex.name||'').toLowerCase().includes(eTerm) && !currentRoutineExercises.some(x => x.exercise_id === ex.id));
    
    document.getElementById('rt-ex-count').textContent = currentRoutineExercises.length;
    
    document.getElementById('rt-available-ex').innerHTML = eFiltered.map(ex => `
        <div class="flex justify-between items-center p-2 rounded bg-black/40 border border-transparent hover:bg-white/5 cursor-pointer group">
            <span class="text-[9px] font-bold text-gray-400 group-hover:text-white uppercase truncate">${ex.name}</span>
            <button type="button" onclick="addEx('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')" class="text-[10px] text-emerald-400 font-black px-2 hover:bg-emerald-500/20 rounded">+</button>
        </div>
    `).join('');

    document.getElementById('rt-selected-ex').innerHTML = currentRoutineExercises.map((ex, idx) => `
        <div class="p-2 rounded bg-[#FFC300]/5 border border-[#FFC300]/20 relative">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[9px] font-black text-[#FFC300] uppercase pr-4">${idx+1}. ${ex.exercise_name}</span>
                <button type="button" onclick="remEx('${ex.exercise_id}')" class="text-red-500 hover:text-red-400 font-black text-xs leading-none">&times;</button>
            </div>
            <div class="flex gap-1">
                <input type="number" min="1" value="${ex.sets||4}" onchange="updEx('${ex.exercise_id}','sets',this.value)" class="w-1/2 bg-black border border-[#FFC300]/30 rounded text-[9px] text-center text-white p-1">
                <input type="number" min="1" value="${ex.repetitions||10}" onchange="updEx('${ex.exercise_id}','repetitions',this.value)" class="w-1/2 bg-black border border-[#FFC300]/30 rounded text-[9px] text-center text-white p-1">
            </div>
        </div>
    `).join('');
}

document.getElementById('rt-user-search').addEventListener('input', e => renderAssemblerLists(e.target.value, document.getElementById('rt-ex-search').value));
document.getElementById('rt-ex-search').addEventListener('input', e => renderAssemblerLists(document.getElementById('rt-user-search').value, e.target.value));

function toggleUserToRoutine(id) { currentRoutineUsers.includes(id) ? currentRoutineUsers = currentRoutineUsers.filter(x => x !== id) : currentRoutineUsers.push(id); renderAssemblerLists(); }
function addEx(id, name) { currentRoutineExercises.push({ exercise_id: id, exercise_name: name, sets: 4, repetitions: 10 }); renderAssemblerLists(document.getElementById('rt-user-search').value, document.getElementById('rt-ex-search').value); }
function remEx(id) { currentRoutineExercises = currentRoutineExercises.filter(x => x.exercise_id !== id); renderAssemblerLists(document.getElementById('rt-user-search').value, document.getElementById('rt-ex-search').value); }
function updEx(id, f, v) { const ex = currentRoutineExercises.find(x => x.exercise_id === id); if(ex) ex[f] = parseInt(v) || 1; }

async function saveRoutine() {
    const isEdit = document.getElementById('rt-is-edit').value === 'true'; 
    const rtId = document.getElementById('rt-id').value; 
    const btn = document.getElementById('rt-btn-save');
    const selectedDays = Array.from(document.querySelectorAll('input[name="rt_days"]:checked')).map(cb => cb.value);

    const payload = {
        name: document.getElementById('rt-name').value, description: document.getElementById('rt-desc').value,
        assigned_days: selectedDays, exercises: currentRoutineExercises, assigned_users: currentRoutineUsers
    };

    btn.disabled = true; btn.textContent = '...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/routine/${rtId}` : `${API_BASE_URL}/api/admin/routine`;

    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) { showUIFeedback("Rutina ensamblada."); await fetchAllData(); } else showUIFeedback(data.error, 'error');
    } catch (e) { showUIFeedback("Falla de red.", 'error'); }
    btn.disabled = false; btn.textContent = 'Ensamblar';
}

async function deleteCurrentRoutine() {
    const id = document.getElementById('rt-id').value;
    if(!confirm('¿Eliminar definitivamente este programa?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/routine/${id}`, { method: 'DELETE', headers: getSecureHeaders() });
        if((await res.json()).success) { showUIFeedback("Purgada."); hideAllWorkspaces(); fetchAllData(); }
    } catch(e){}
}

// ==========================================
// 🧬 LÓGICA: EJERCICIOS
// ==========================================
function generateJointCheckboxes() {
    document.getElementById('ex-joints-container').innerHTML = JOINTS.map(j => `
        <label class="flex items-center gap-1.5 cursor-pointer bg-black/50 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/20 transition">
            <input type="checkbox" name="ex_joint" value="${j}" class="accent-cyan-500 w-3 h-3"><span class="text-[9px] font-bold text-gray-400 uppercase">${j}</span>
        </label>
    `).join('');
}

function loadExerciseWorkspace(id) {
    const ex = allExercises.find(x => x.id === id); if (!ex) return;
    hideAllWorkspaces();
    document.getElementById('ws-exercise').classList.remove('hidden'); document.getElementById('ws-exercise').classList.add('flex');
    
    document.getElementById('ex-header-title').textContent = ex.name;
    document.getElementById('ex-header-title').className = "text-2xl font-black uppercase tracking-tighter text-white";
    document.getElementById('ex-btn-delete').classList.remove('hidden');
    
    document.getElementById('ex-id').value = ex.id;
    document.getElementById('ex-is-edit').value = 'true';
    document.getElementById('ex-name').value = ex.name;
    document.getElementById('ex-link').value = ex.link_tutorial || '';
    document.getElementById('ex-desc').value = ex.description || '';
    document.getElementById('ex-main-muscle').value = ex.main_muscle || '';
    document.getElementById('ex-pattern').value = ex.movement_pattern || 'Empuje horizontal';
    document.getElementById('ex-type').value = ex.type || 'Compuesto';
    document.getElementById('ex-equipment').value = ex.equipment || '';
    document.getElementById('ex-difficulty').value = ex.difficulty || 'Principiante';
    document.getElementById('ex-fatigue').value = ex.systemic_fatigue || 'Baja';
    document.getElementById('ex-tier').value = ex.subscription_tier || 'Básico';
    document.getElementById('ex-axial').checked = ex.axial_loading === true;
    document.getElementById('ex-unilateral').checked = ex.is_unilateral === true;
    
    const joints = ex.joint_strain || [];
    document.querySelectorAll('input[name="ex_joint"]').forEach(cb => cb.checked = joints.includes(cb.value));
}

async function saveExercise() {
    const isEdit = document.getElementById('ex-is-edit').value === 'true';
    const exId = document.getElementById('ex-id').value;
    const btn = document.getElementById('ex-btn-save');
    const selectedJoints = Array.from(document.querySelectorAll('input[name="ex_joint"]:checked')).map(cb => cb.value);

    const payload = {
        name: document.getElementById('ex-name').value, description: document.getElementById('ex-desc').value,
        link_tutorial: document.getElementById('ex-link').value, movement_pattern: document.getElementById('ex-pattern').value,
        main_muscle: document.getElementById('ex-main-muscle').value, type: document.getElementById('ex-type').value,
        equipment: document.getElementById('ex-equipment').value, difficulty: document.getElementById('ex-difficulty').value,
        subscription_tier: document.getElementById('ex-tier').value, systemic_fatigue: document.getElementById('ex-fatigue').value,
        axial_loading: document.getElementById('ex-axial').checked, is_unilateral: document.getElementById('ex-unilateral').checked,
        joint_strain: selectedJoints
    };

    btn.disabled = true; btn.textContent = '...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/exercise/${exId}` : `${API_BASE_URL}/api/admin/exercise`;

    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) { showUIFeedback("Ciencia actualizada."); await fetchAllData(); } else showUIFeedback(data.error, 'error');
    } catch (e) { showUIFeedback("Error", 'error'); }
    btn.disabled = false; btn.textContent = 'Registrar Ficha';
}

async function deleteCurrentExercise() {
    const id = document.getElementById('ex-id').value;
    if(!confirm('¿Eliminar ciencia biomécanica?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/exercise/${id}`, { method: 'DELETE', headers: getSecureHeaders() });
        if((await res.json()).success) { showUIFeedback("Purgado."); hideAllWorkspaces(); fetchAllData(); }
    } catch(e){}
}

// ==========================================
// 🧘 LÓGICA: RECOVERY
// ==========================================
function loadRecoveryWorkspace(id) {
    const rec = allRecovery.find(x => x.id === id); if (!rec) return;
    hideAllWorkspaces();
    document.getElementById('ws-recovery').classList.remove('hidden'); document.getElementById('ws-recovery').classList.add('flex');
    
    document.getElementById('rec-header-title').textContent = rec.name;
    document.getElementById('rec-header-title').className = "text-2xl font-black uppercase tracking-tighter text-white";
    document.getElementById('rec-btn-delete').classList.remove('hidden');
    
    document.getElementById('rec-id').value = rec.id;
    document.getElementById('rec-is-edit').value = 'true';
    document.getElementById('rec-name').value = rec.name;
    document.getElementById('rec-desc').value = rec.description || '';
    document.getElementById('rec-link').value = rec.link_tutorial || '';
}

async function saveRecovery() {
    const isEdit = document.getElementById('rec-is-edit').value === 'true';
    const recId = document.getElementById('rec-id').value;
    const btn = document.getElementById('rec-btn-save');

    const payload = {
        name: document.getElementById('rec-name').value, description: document.getElementById('rec-desc').value,
        link_tutorial: document.getElementById('rec-link').value
    };

    btn.disabled = true; btn.textContent = '...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/recovery/${recId}` : `${API_BASE_URL}/api/admin/recovery`;

    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        if ((await res.json()).success) { showUIFeedback("Protocolo guardado."); await fetchAllData(); }
    } catch (e) { showUIFeedback("Error", 'error'); }
    btn.disabled = false; btn.textContent = 'Habilitar Protocolo';
}

async function deleteCurrentRecovery() {
    const id = document.getElementById('rec-id').value;
    if(!confirm('¿Eliminar protocolo global?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/recovery/${id}`, { method: 'DELETE', headers: getSecureHeaders() });
        if((await res.json()).success) { showUIFeedback("Purgado."); hideAllWorkspaces(); fetchAllData(); }
    } catch(e){}
}

// INICIALIZAR
window.addEventListener('DOMContentLoaded', fetchAllData);
