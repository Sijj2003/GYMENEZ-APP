const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allRoutines = [];
let allExercises = [];
let allUsers = [];

// Estado temporal para el ensamblador de rutinas
let currentRoutineExercises = [];
let currentRoutineUsers = [];

// ==========================================
// UTILIDADES UI
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
// TABS (Pestañas)
// ==========================================
document.getElementById('tab-btn-routines').addEventListener('click', () => switchTab('routines'));
document.getElementById('tab-btn-exercises').addEventListener('click', () => switchTab('exercises'));

function switchTab(tab) {
    const btnR = document.getElementById('tab-btn-routines');
    const btnE = document.getElementById('tab-btn-exercises');
    const pnlR = document.getElementById('panel-routines');
    const pnlE = document.getElementById('panel-exercises');

    if (tab === 'routines') {
        btnR.className = "px-6 py-3 border-b-2 border-[#FFC300] text-[#FFC300] font-black uppercase tracking-widest text-[10px] transition-colors";
        btnE.className = "px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors";
        pnlR.classList.remove('hidden'); pnlE.classList.add('hidden');
    } else {
        btnE.className = "px-6 py-3 border-b-2 border-white text-white font-black uppercase tracking-widest text-[10px] transition-colors";
        btnR.className = "px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors";
        pnlE.classList.remove('hidden'); pnlR.classList.add('hidden');
    }
}

// ==========================================
// DATA FETCHING (Lectura Inicial)
// ==========================================
async function fetchAllData() {
    try {
        const [resR, resE, resU] = await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/routines`),
            fetch(`${API_BASE_URL}/api/admin/exercises`),
            fetch(`${API_BASE_URL}/api/admin/users`)
        ]);

        const dataR = await resR.json();
        const dataE = await resE.json();
        const dataU = await resU.json();

        allRoutines = dataR.success ? dataR.routines : [];
        allExercises = dataE.success ? dataE.exercises : [];
        allUsers = dataU.success ? dataU.users : [];

        renderRoutines(allRoutines);
        renderExercises(allExercises);
    } catch (e) {
        showUIFeedback("Error de red sincronizando datos físicos.", "error");
    }
}

// ==========================================
// MÓDULO 1: EJERCICIOS
// ==========================================
function renderExercises(list) {
    const tbody = document.getElementById('exercises-tbody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="4" class="text-center py-6 text-gray-500">Catálogo vacío.</td></tr>` : '';
    
    list.forEach(ex => {
        const tr = tbody.insertRow();
        tr.insertCell().textContent = ex.name || 'N/A';
        tr.insertCell().innerHTML = `<span class="truncate block max-w-xs text-[10px] text-gray-400">${ex.description || 'N/A'}</span>`;
        tr.insertCell().innerHTML = ex.link_tutorial ? `<a href="${ex.link_tutorial}" target="_blank" class="text-sky-400 font-bold text-[9px] uppercase hover:underline">Ver Video</a>` : `<span class="text-gray-600 text-[9px]">Sin Video</span>`;
        
        const act = tr.insertCell();
        act.className = "text-right";
        act.innerHTML = `
            <button onclick='openExerciseModal(${JSON.stringify(ex).replace(/'/g, "&#39;")})' class="text-[9px] font-black text-white hover:text-[#FFC300] uppercase tracking-widest mr-3">Editar</button>
            <button onclick="deleteExercise('${ex.id}', '${ex.name}')" class="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Eliminar</button>
        `;
    });
}

document.getElementById('exercise-search').addEventListener('input', e => {
    const v = e.target.value.toLowerCase();
    renderExercises(allExercises.filter(ex => (ex.name||'').toLowerCase().includes(v)));
});

document.getElementById('add-exercise-btn').addEventListener('click', () => {
    document.getElementById('exercise-form').reset();
    document.getElementById('ex-id').value = '';
    document.getElementById('ex-is-edit').value = 'false';
    document.getElementById('ex-modal-title').textContent = 'Crear Ejercicio';
    toggleModal('exercise-modal', true);
});

function openExerciseModal(ex) {
    document.getElementById('exercise-form').reset();
    document.getElementById('ex-id').value = ex.id;
    document.getElementById('ex-is-edit').value = 'true';
    document.getElementById('ex-modal-title').textContent = `Editar: ${ex.name}`;
    
    document.getElementById('ex-name').value = ex.name;
    document.getElementById('ex-desc').value = ex.description;
    document.getElementById('ex-link').value = ex.link_tutorial || '';
    
    toggleModal('exercise-modal', true);
}

document.getElementById('exercise-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEdit = document.getElementById('ex-is-edit').value === 'true';
    const exId = document.getElementById('ex-id').value;
    const btn = document.getElementById('ex-submit-btn');

    const payload = {
        name: document.getElementById('ex-name').value.trim(),
        description: document.getElementById('ex-desc').value.trim(),
        link_tutorial: document.getElementById('ex-link').value.trim()
    };

    btn.disabled = true; btn.textContent = 'PROCESANDO...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/exercise/${exId}` : `${API_BASE_URL}/api/admin/exercise`;

    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) {
            toggleModal('exercise-modal', false);
            showUIFeedback("Base de ejercicios actualizada.");
            fetchAllData();
        } else showUIFeedback(data.error, 'error');
    } catch (e) { showUIFeedback("Error de red", 'error'); }
    btn.disabled = false; btn.textContent = 'Guardar';
});

async function deleteExercise(id, name) {
    if(!confirm(`⚠️ ¿Eliminar permanentemente el ejercicio "${name}"?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/exercise/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showUIFeedback("Ejercicio eliminado."); fetchAllData(); }
    } catch(e) {}
}

// ==========================================
// MÓDULO 2: RUTINAS (ENSAMBLADOR)
// ==========================================
function renderRoutines(list) {
    const tbody = document.getElementById('routines-tbody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-gray-500">No hay rutinas ensambladas.</td></tr>` : '';
    
    list.forEach(rt => {
        const tr = tbody.insertRow();
        tr.insertCell().innerHTML = `<span class="font-bold text-white">${rt.name || 'N/A'}</span>`;
        tr.insertCell().innerHTML = `<span class="text-[9px] uppercase tracking-widest text-[#FFC300]">${(rt.assigned_days||[]).join(', ') || 'Ninguno'}</span>`;
        tr.insertCell().innerHTML = `<span class="font-mono text-gray-400">${(rt.exercises||[]).length} Ejercicios</span>`;
        tr.insertCell().innerHTML = `<span class="font-mono text-emerald-400">${(rt.assigned_users||[]).length} Atletas</span>`;
        
        const act = tr.insertCell();
        act.className = "text-right whitespace-nowrap";
        act.innerHTML = `
            <button onclick="openRoutineModal('${rt.id}')" class="text-[9px] font-black text-[#FFC300] hover:text-white uppercase tracking-widest mr-3">Configurar</button>
            <button onclick="deleteRoutine('${rt.id}', '${rt.name}')" class="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Purgar</button>
        `;
    });
}

document.getElementById('routine-search').addEventListener('input', e => {
    const v = e.target.value.toLowerCase();
    renderRoutines(allRoutines.filter(rt => (rt.name||'').toLowerCase().includes(v)));
});

// ABRIR MODAL RUTINA
document.getElementById('add-routine-btn').addEventListener('click', () => {
    document.getElementById('routine-form').reset();
    document.getElementById('rt-id').value = '';
    document.getElementById('rt-is-edit').value = 'false';
    document.getElementById('rt-modal-title').textContent = 'Ensamblar Nueva Rutina';
    
    currentRoutineExercises = [];
    currentRoutineUsers = [];
    
    renderAssemblerExercises();
    renderAssemblerUsers();
    toggleModal('routine-modal', true);
});

function openRoutineModal(id) {
    const rt = allRoutines.find(x => x.id === id);
    if (!rt) return;

    document.getElementById('routine-form').reset();
    document.getElementById('rt-id').value = rt.id;
    document.getElementById('rt-is-edit').value = 'true';
    document.getElementById('rt-modal-title').textContent = `Configurar: ${rt.name}`;
    
    document.getElementById('rt-name').value = rt.name;
    document.getElementById('rt-desc').value = rt.notes || '';
    
    document.querySelectorAll('input[name="rt_days"]').forEach(cb => {
        if ((rt.assigned_days||[]).includes(cb.value)) cb.checked = true;
    });

    currentRoutineExercises = [...(rt.exercises || [])];
    currentRoutineUsers = [...(rt.assigned_users || [])];

    renderAssemblerExercises();
    renderAssemblerUsers();
    toggleModal('routine-modal', true);
}

// LOGICA INTERNA DEL ENSAMBLADOR DE EJERCICIOS
function renderAssemblerExercises(searchTerm = '') {
    const availableDiv = document.getElementById('rt-available-ex');
    const selectedDiv = document.getElementById('rt-selected-ex');
    
    // RENDER DISPONIBLES
    availableDiv.innerHTML = '';
    const term = searchTerm.toLowerCase();
    const filtered = allExercises.filter(ex => (ex.name||'').toLowerCase().includes(term));
    
    filtered.forEach(ex => {
        const isAdded = currentRoutineExercises.find(x => x.exercise_id === ex.id);
        if (isAdded) return; // Si ya está añadido, no lo mostramos en disponibles

        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-2 rounded bg-black/40 border border-white/5 hover:border-white/20 transition cursor-pointer";
        div.innerHTML = `
            <span class="text-[10px] font-bold text-gray-300 truncate mr-2">${ex.name}</span>
            <button type="button" onclick="addExerciseToRoutine('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')" class="text-[10px] text-emerald-400 font-black tracking-widest">+</button>
        `;
        availableDiv.appendChild(div);
    });

    // RENDER SELECCIONADOS
    selectedDiv.innerHTML = '';
    currentRoutineExercises.forEach((ex, idx) => {
        const div = document.createElement('div');
        div.className = "p-3 rounded-lg bg-black/40 border border-[#FFC300]/20 space-y-2 relative";
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="text-[10px] font-black text-[#FFC300] tracking-tighter uppercase leading-tight pr-4">${idx+1}. ${ex.exercise_name}</span>
                <button type="button" onclick="removeExerciseFromRoutine('${ex.exercise_id}')" class="absolute top-2 right-2 text-red-500 hover:text-red-400 font-bold">&times;</button>
            </div>
            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="text-[8px] text-gray-500 uppercase font-bold">Series</label>
                    <input type="number" min="1" value="${ex.sets || 4}" onchange="updateExParam('${ex.exercise_id}', 'sets', this.value)" class="w-full bg-black border border-white/10 rounded p-1 text-center text-xs text-white">
                </div>
                <div class="flex-1">
                    <label class="text-[8px] text-gray-500 uppercase font-bold">Reps</label>
                    <input type="number" min="1" value="${ex.repetitions || 10}" onchange="updateExParam('${ex.exercise_id}', 'repetitions', this.value)" class="w-full bg-black border border-white/10 rounded p-1 text-center text-xs text-white">
                </div>
            </div>
        `;
        selectedDiv.appendChild(div);
    });

    document.getElementById('rt-count-ex').textContent = currentRoutineExercises.length;
}

document.getElementById('rt-search-ex').addEventListener('input', e => renderAssemblerExercises(e.target.value));

function addExerciseToRoutine(id, name) {
    currentRoutineExercises.push({ exercise_id: id, exercise_name: name, sets: 4, repetitions: 10 });
    renderAssemblerExercises(document.getElementById('rt-search-ex').value);
}
function removeExerciseFromRoutine(id) {
    currentRoutineExercises = currentRoutineExercises.filter(x => x.exercise_id !== id);
    renderAssemblerExercises(document.getElementById('rt-search-ex').value);
}
function updateExParam(id, field, val) {
    const ex = currentRoutineExercises.find(x => x.exercise_id === id);
    if(ex) ex[field] = parseInt(val) || 1;
}

// LOGICA INTERNA DEL ENSAMBLADOR DE USUARIOS
function renderAssemblerUsers() {
    const list = document.getElementById('rt-users-list');
    list.innerHTML = '';
    
    allUsers.forEach(u => {
        const isChecked = currentRoutineUsers.includes(u.id);
        const label = document.createElement('label');
        label.className = `flex items-center gap-2 p-2 rounded cursor-pointer transition border ${isChecked ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-black/20 border-white/5 hover:border-white/20'}`;
        label.innerHTML = `
            <input type="checkbox" value="${u.id}" class="accent-emerald-500" ${isChecked ? 'checked' : ''} onchange="toggleUserToRoutine('${u.id}')">
            <span class="text-[10px] font-bold text-gray-300 truncate">${u.name} ${u.last_name || ''}</span>
        `;
        list.appendChild(label);
    });
}

function toggleUserToRoutine(id) {
    if(currentRoutineUsers.includes(id)) {
        currentRoutineUsers = currentRoutineUsers.filter(x => x !== id);
    } else {
        currentRoutineUsers.push(id);
    }
    renderAssemblerUsers();
}

// GUARDAR RUTINA
document.getElementById('routine-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEdit = document.getElementById('rt-is-edit').value === 'true';
    const rtId = document.getElementById('rt-id').value;
    const btn = document.getElementById('rt-submit-btn');

    const selectedDays = Array.from(document.querySelectorAll('input[name="rt_days"]:checked')).map(cb => cb.value);

    const payload = {
        name: document.getElementById('rt-name').value.trim(),
        description: document.getElementById('rt-desc').value.trim(),
        assigned_days: selectedDays,
        exercises: currentRoutineExercises,
        assigned_users: currentRoutineUsers
    };

    btn.disabled = true; btn.textContent = 'PROCESANDO...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/routine/${rtId}` : `${API_BASE_URL}/api/admin/routine`;

    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) {
            toggleModal('routine-modal', false);
            showUIFeedback("Rutina ensamblada y asignada exitosamente.");
            fetchAllData(); // Recarga todo para actualizar tablas
        } else showUIFeedback(data.error, 'error');
    } catch (e) { showUIFeedback("Error de red", 'error'); }
    
    btn.disabled = false; btn.textContent = 'Ensamblar Rutina';
});

async function deleteRoutine(id, name) {
    if(!confirm(`⚠️ ¿Purgar permanentemente la rutina "${name}"? Todos los atletas perderán acceso a ella.`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/routine/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showUIFeedback("Rutina eliminada."); fetchAllData(); }
    } catch(e) {}
}

window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    fetchAllData();
});
