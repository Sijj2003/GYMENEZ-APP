// Configuración de API
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Estado en RAM
let allUsersData = [];
let activeUserId = null; 
let targetCertifyUserId = null; 

// ==========================================
// 🧠 DICCIONARIO ALGORÍTMICO DE MÉTRICAS (Desde Metrics.js)
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

// ==========================================
// 📢 UTILIDADES UI
// ==========================================
function getSecureHeaders() {
    const token = localStorage.getItem('gymen_admin_token'); 
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

function formatToUpperCase(str) { return str ? str.toUpperCase().trim() : ''; }
function formatDateForBackend(dVal) {
    if (!dVal) return '';
    const parts = dVal.split('-'); 
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dVal;
}
function getDefaultExpirationDate() {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
}

// 🎛️ Control de Pestañas del Dossier 360
function switchDossierTab(tabName) {
    const btnId = document.getElementById('d-tab-identity');
    const btnBio = document.getElementById('d-tab-biolab');
    const contentId = document.getElementById('d-content-identity');
    const contentBio = document.getElementById('d-content-biolab');

    // Reset styles
    btnId.className = "py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors";
    btnBio.className = "py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors";
    contentId.classList.add('hidden'); contentId.classList.remove('block');
    contentBio.classList.add('hidden'); contentBio.classList.remove('block');

    if (tabName === 'identity') {
        btnId.className = "py-3 border-b-2 border-[#FFC300] text-[#FFC300] font-black text-[10px] uppercase tracking-widest transition-colors";
        contentId.classList.remove('hidden'); contentId.classList.add('block');
    } else if (tabName === 'biolab') {
        btnBio.className = "py-3 border-b-2 border-sky-400 text-sky-400 font-black text-[10px] uppercase tracking-widest transition-colors";
        contentBio.classList.remove('hidden'); contentBio.classList.add('block');
    }
}

// ==========================================
// 📡 CARGA Y RENDERIZADO DE LA LISTA (RAM)
// ==========================================
async function fetchAllUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: getSecureHeaders() });
        const data = await response.json();
        
        if (response.ok && data.success) {
            allUsersData = data.users; 
            renderUsersList(allUsersData);
        } else throw new Error(data.error);
    } catch (error) {
        document.getElementById('users-list').innerHTML = `<div class="p-4 text-center text-red-500 font-bold text-[10px] uppercase tracking-widest">Error conectando al Core</div>`;
    }
}

function renderUsersList(users) {
    const container = document.getElementById('users-list');
    container.innerHTML = ''; 

    if (users.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">No hay coincidencias.</div>`;
        return;
    }

    users.forEach(user => {
        const item = document.createElement('div');
        const isActive = activeUserId === user.id;
        const isBlocked = user.is_blocked;
        const tier = user.subscription_level || 'BASICO';
        
        let tierColor = 'text-gray-500 border-gray-500/30';
        if(tier === 'PLUS') tierColor = 'text-sky-400 border-sky-500/30';
        if(tier === 'ULTRA') tierColor = 'text-[#FFC300] border-[#FFC300]/30';

        item.className = `p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-1 ${isActive ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`;
        item.onclick = () => loadUserDossier(user.id);

        item.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="font-black text-[11px] uppercase tracking-tight truncate ${isBlocked ? 'text-red-400 line-through' : 'text-white'}">${user.full_name || 'N/A'}</span>
                <span class="px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest ${tierColor}">${tier}</span>
            </div>
            <span class="text-[9px] font-mono text-gray-500 truncate">${user.email}</span>
        `;
        container.appendChild(item);
    });
}

let searchTimeout;
document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) return renderUsersList(allUsersData);
        const filtered = allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term));
        renderUsersList(filtered);
    }, 200); 
});

// ==========================================
// 🗂️ DOSSIER 360 (IDENTIDAD + BIOLAB)
// ==========================================
async function loadUserDossier(userId) {
    activeUserId = userId;
    // Refrescar estilo activo
    renderUsersList(document.getElementById('search-input').value ? allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(document.getElementById('search-input').value.toLowerCase().trim())) : allUsersData);

    const user = allUsersData.find(u => u.id === userId);
    if (!user) return;

    // Mostrar panel
    document.getElementById('empty-state').classList.add('hidden');
    const dossier = document.getElementById('active-dossier');
    dossier.classList.remove('hidden'); dossier.classList.add('flex');

    // 1. LLENAR IDENTIDAD
    document.getElementById('d-name').textContent = user.full_name || 'N/A';
    document.getElementById('d-name').className = `text-3xl font-black uppercase tracking-tighter ${user.is_blocked ? 'text-red-500 line-through' : 'text-white'}`;
    document.getElementById('d-email').textContent = user.email || 'N/A';
    
    const statusEl = document.getElementById('d-status');
    statusEl.textContent = user.is_blocked ? 'BLOQUEADO' : 'ACTIVO';
    statusEl.className = `px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${user.is_blocked ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`;
    
    const tierEl = document.getElementById('d-tier');
    tierEl.textContent = user.subscription_level || 'BASICO';
    let tierColorClass = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    if(user.subscription_level === 'PLUS') tierColorClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if(user.subscription_level === 'ULTRA') tierColorClass = 'bg-[#FFC300]/10 text-[#FFC300] border-[#FFC300]/20';
    tierEl.className = `px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${tierColorClass}`;

    document.getElementById('f-id').value = user.id;
    document.getElementById('f-is-edit').value = 'true';
    document.getElementById('f-name').value = user.name || '';
    document.getElementById('f-lastname').value = user.last_name || '';
    
    const emailEl = document.getElementById('f-email');
    emailEl.value = user.email || ''; emailEl.disabled = true; 
    
    const passEl = document.getElementById('f-password');
    passEl.disabled = true; passEl.required = false; passEl.placeholder = "Cambio exclusivo vía OTP Clave";
    
    document.getElementById('f-tier').value = user.subscription_level || 'BASICO';
    document.getElementById('f-expires').value = user.subscription_expires_at ? String(user.subscription_expires_at).split('T')[0] : getDefaultExpirationDate();
    document.getElementById('f-sex').value = user.sex || 'Otro';
    if(user.dob) document.getElementById('f-dob').value = user.dob.split('/').reverse().join('-');

    if (user.phone_number && user.phone_number.includes('-')) {
        const [prefix, number] = user.phone_number.split('-');
        document.getElementById('f-phone-pre').value = prefix || '0414';
        document.getElementById('f-phone-num').value = number || '';
    } else {
        document.getElementById('f-phone-num').value = user.phone_number || '';
    }

    const btnBlock = document.getElementById('btn-block');
    btnBlock.textContent = user.is_blocked ? 'Desbloquear' : 'Bloquear';
    btnBlock.className = `px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-colors ${user.is_blocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-black' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'}`;
    btnBlock.onclick = () => handleBlockUser(user.id, user.is_blocked);

    const btnCertify = document.getElementById('btn-certify');
    btnCertify.onclick = () => requestUserCertification(user.id, user.email);

    // 2. LLENAR BIOLAB (Petición Silenciosa al Backend)
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/fitness-profile/${userId}`, { headers: getSecureHeaders() });
        const data = await res.json();
        
        if (data.success) {
            const m = data.metrics || {};
            document.getElementById('m-weight').value = m.weight || '';
            document.getElementById('m-height').value = m.height || '';
            document.getElementById('m-age').value = m.age || '--';
            document.getElementById('m-fat').value = m.fat_percent || '';
            document.getElementById('m-muscle').value = m.muscle_percent || '';
            
            document.getElementById('m-neck').value = m.neck || '';
            document.getElementById('m-back').value = m.back || '';
            document.getElementById('m-thorax').value = m.thorax || '';
            document.getElementById('m-abdomen').value = m.abdomen || '';
            document.getElementById('m-bicep-l').value = m.bicep_left || '';
            document.getElementById('m-bicep-r').value = m.bicep_right || '';
            document.getElementById('m-forearm-l').value = m.forearm_left || '';
            document.getElementById('m-forearm-r').value = m.forearm_right || '';
            
            document.getElementById('m-waist').value = m.waist || '';
            document.getElementById('m-femur-l').value = m.femur_left || '';
            document.getElementById('m-femur-r').value = m.femur_right || '';
            document.getElementById('m-tibia-l').value = m.tibia_left || '';
            document.getElementById('m-tibia-r').value = m.tibia_right || '';
            
            document.getElementById('m-push').value = m.rm_push || '';
            document.getElementById('m-pull').value = m.rm_pull || '';
            document.getElementById('m-legs').value = m.rm_legs || '';

            document.getElementById('m-allergies').value = m.allergies || '';
            document.getElementById('m-diseases').value = m.chronic_diseases || '';
            document.getElementById('m-medical-notes').value = m.medical_notes || '';

            // Objetivos
            const g = data.goals || {};
            document.getElementById('g-focus').value = g.focus || 'Masa Muscular';
            
            document.getElementById('st-goals-container').innerHTML = '';
            document.getElementById('mt-goals-container').innerHTML = '';
            document.getElementById('lt-goals-container').innerHTML = '';

            const normalize = (val) => Array.isArray(val) ? val : (val && val.description ? [val] : []);
            normalize(g.short_term).forEach(goal => addGoalRow('st-goals-container', goal));
            normalize(g.medium_term).forEach(goal => addGoalRow('mt-goals-container', goal));
            normalize(g.long_term).forEach(goal => addGoalRow('lt-goals-container', goal));
        }
    } catch (e) { console.warn("Error leyendo biometría: ", e); }
}

function openCreateMode() {
    activeUserId = null;
    renderUsersList(document.getElementById('search-input').value ? allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(document.getElementById('search-input').value.toLowerCase().trim())) : allUsersData);

    document.getElementById('empty-state').classList.add('hidden');
    const dossier = document.getElementById('active-dossier');
    dossier.classList.remove('hidden'); dossier.classList.add('flex');

    document.getElementById('d-name').textContent = "Nuevo Atleta";
    document.getElementById('d-name').className = "text-3xl font-black uppercase tracking-tighter text-[#FFC300]";
    document.getElementById('d-email').textContent = "Llenar formulario inferior";
    document.getElementById('d-status').className = "hidden";
    document.getElementById('d-tier').className = "hidden";
    document.getElementById('btn-block').className = "hidden";
    document.getElementById('btn-certify').className = "hidden";

    document.getElementById('user-form').reset();
    document.getElementById('f-id').value = '';
    document.getElementById('f-is-edit').value = 'false';

    const emailEl = document.getElementById('f-email');
    emailEl.disabled = false; emailEl.classList.replace('text-gray-400', 'text-white');

    const passEl = document.getElementById('f-password');
    passEl.disabled = false; passEl.required = true; passEl.placeholder = "Mínimo 6 caracteres"; passEl.classList.replace('text-gray-500', 'text-white');

    document.getElementById('f-expires').value = getDefaultExpirationDate();
    
    // Forzamos a la pestaña de identidad, porque no tiene biometría aún
    switchDossierTab('identity');
}

// ==========================================
// 🏗️ CREADOR DE FILAS DE OBJETIVOS
// ==========================================
function addGoalRow(containerId, data = null) {
    const container = document.getElementById(containerId);
    const rowId = `goal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const metricOptions = MEASURABLE_METRICS.map(m => 
        `<option value="${m.id}" ${data && data.metric_key === m.id ? 'selected' : ''}>${m.label}</option>`
    ).join('');

    const isDone = data && data.status === 'Cumplido';
    const row = document.createElement('div');
    row.className = 'goal-row flex flex-col md:flex-row gap-3 p-4 bg-black/40 border border-white/5 rounded-2xl items-end relative transition-all hover:border-white/10';
    row.id = rowId;

    row.innerHTML = `
        <div class="w-full md:w-1/5">
            <label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Variable Base</label>
            <select class="goal-metric-key glass-input rounded-lg p-2 text-[10px] font-bold text-white w-full">
                ${metricOptions}
            </select>
        </div>
        <div class="w-full md:w-[12%]">
            <label class="block text-[8px] text-gray-400 uppercase font-black mb-1">V. Inicial</label>
            <input type="text" class="goal-start glass-input p-2 text-xs font-mono w-full" placeholder="Base" value="${data ? (data.start_value || '') : ''}">
        </div>
        <div class="w-full md:w-[12%]">
            <label class="block text-[8px] text-[#FFC300] uppercase font-black mb-1">Target</label>
            <input type="text" class="goal-target glass-input p-2 text-xs font-mono w-full !text-[#FFC300]" placeholder="Meta" value="${data ? (data.target_value || '') : ''}">
        </div>
        <div class="w-full md:flex-grow">
            <label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Descripción SMART</label>
            <input type="text" class="goal-desc glass-input p-2 text-xs w-full" placeholder="Describe la meta..." value="${data ? (data.description || '') : ''}">
        </div>
        <div class="w-full md:w-[15%]">
            <label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Estatus</label>
            <select class="goal-status glass-input rounded-lg p-2 text-[9px] font-black uppercase ${isDone ? 'text-emerald-400' : 'text-gray-300'} w-full">
                <option value="En progreso" ${!isDone ? 'selected' : ''}>En progreso</option>
                <option value="Cumplido" ${isDone ? 'selected' : ''}>Cumplido</option>
            </select>
        </div>
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="w-full md:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase transition shrink-0">
            X
        </button>
    `;

    container.appendChild(row);

    const selectEl = row.querySelector('.goal-metric-key');
    const startEl = row.querySelector('.goal-start');
    const targetEl = row.querySelector('.goal-target');
    const descEl = row.querySelector('.goal-desc');
    const statusEl = row.querySelector('.goal-status');

    const updateDescription = () => {
        const metricKey = selectEl.value;
        const metricObj = MEASURABLE_METRICS.find(m => m.id === metricKey);
        if (metricKey !== 'custom' && targetEl.value.trim() !== '') {
            let startText = startEl.value.trim() !== '' ? ` (desde ${startEl.value})` : '';
            descEl.value = `Establecer ${metricObj.label.toLowerCase()} en ${targetEl.value} ${metricObj.unit}${startText}`.trim();
        }
    };

    statusEl.addEventListener('change', (e) => {
        e.target.classList.remove('text-emerald-400', 'text-gray-300');
        e.target.classList.add(e.target.value === 'Cumplido' ? 'text-emerald-400' : 'text-gray-300');
    });

    selectEl.addEventListener('change', updateDescription);
    startEl.addEventListener('input', updateDescription);
    targetEl.addEventListener('input', updateDescription);
}

function extractGoalsArray(containerId) {
    const rows = document.querySelectorAll(`#${containerId} .goal-row`);
    return Array.from(rows).map(row => ({
        metric_key: row.querySelector('.goal-metric-key').value,
        start_value: row.querySelector('.goal-start').value,
        target_value: row.querySelector('.goal-target').value,
        description: row.querySelector('.goal-desc').value,
        status: row.querySelector('.goal-status').value
    }));
}

// ==========================================
// 💾 GESTIÓN DE GUARDADO (IDENTIDAD, MÉTRICAS, METAS)
// ==========================================

// Guardar Identidad
document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('f-submit-btn');
    const isEdit = document.getElementById('f-is-edit').value === 'true';
    const userId = document.getElementById('f-id').value;

    const name = formatToUpperCase(document.getElementById('f-name').value);
    const lastName = formatToUpperCase(document.getElementById('f-lastname').value);
    const fullPhoneNumber = document.getElementById('f-phone-pre').value + '-' + document.getElementById('f-phone-num').value.replace(/\D/g, '');

    const payload = {
        name: name, last_name: lastName, full_name: `${name} ${lastName}`,
        email: document.getElementById('f-email').value, 
        password: document.getElementById('f-password').value,
        phone_number: fullPhoneNumber, sex: document.getElementById('f-sex').value, 
        subscription_level: document.getElementById('f-tier').value,
        subscription_expires_at: document.getElementById('f-expires').value,
        dob: formatDateForBackend(document.getElementById('f-dob').value)
    };
    
    if (isEdit) { delete payload.email; delete payload.password; }

    btn.disabled = true; btn.textContent = "Guardando...";
    const url = isEdit ? `${API_BASE_URL}/api/admin/user/${userId}` : `${API_BASE_URL}/api/admin/user`;
    
    try {
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showUIFeedback(`Expediente actualizado exitosamente.`, 'success');
            await fetchAllUsers();
            if (!isEdit) {
                const newU = allUsersData.find(u => u.email === payload.email);
                if (newU) loadUserDossier(newU.id);
            } else { loadUserDossier(userId); }
        } else { showUIFeedback(data.error || "Fallo en la base de datos.", "error"); }
    } catch (err) { showUIFeedback("Falla de conexión de red.", "error"); }
    btn.disabled = false; btn.textContent = "Guardar Cambios";
});

// Guardar Biometría
document.getElementById('metrics-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!activeUserId) return;
    const btn = document.getElementById('btn-submit-metrics');
    
    const payload = {
        weight: document.getElementById('m-weight').value, height: document.getElementById('m-height').value,
        fat_percent: document.getElementById('m-fat').value, muscle_percent: document.getElementById('m-muscle').value,
        neck: document.getElementById('m-neck').value, back: document.getElementById('m-back').value,
        thorax: document.getElementById('m-thorax').value, abdomen: document.getElementById('m-abdomen').value,
        bicep_left: document.getElementById('m-bicep-l').value, bicep_right: document.getElementById('m-bicep-r').value,
        forearm_left: document.getElementById('m-forearm-l').value, forearm_right: document.getElementById('m-forearm-r').value,
        waist: document.getElementById('m-waist').value, femur_left: document.getElementById('m-femur-l').value,
        femur_right: document.getElementById('m-femur-r').value, tibia_left: document.getElementById('m-tibia-l').value,
        tibia_right: document.getElementById('m-tibia-r').value, rm_push: document.getElementById('m-push').value,
        rm_pull: document.getElementById('m-pull').value, rm_legs: document.getElementById('m-legs').value,
        allergies: document.getElementById('m-allergies').value, chronic_diseases: document.getElementById('m-diseases').value,
        medical_notes: document.getElementById('m-medical-notes').value
    };

    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/metrics/${activeUserId}`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        const data = await res.json();
        if(data.success) showUIFeedback("Telemetría corporal actualizada.");
    } catch (e) { showUIFeedback("Error de red.", "error"); }
    btn.disabled = false; btn.textContent = 'Guardar Biometría';
});

// Guardar Metas SMART
document.getElementById('goals-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!activeUserId) return;
    const btn = document.getElementById('btn-submit-goals');

    const payload = {
        focus: document.getElementById('g-focus').value,
        short_term: extractGoalsArray('st-goals-container'),
        medium_term: extractGoalsArray('mt-goals-container'),
        long_term: extractGoalsArray('lt-goals-container')
    };

    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/goals/${activeUserId}`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        const data = await res.json();
        if(data.success) showUIFeedback("Matriz de objetivos guardada.");
    } catch (e) { showUIFeedback("Error de red.", "error"); }
    btn.disabled = false; btn.textContent = 'Fijar Matriz Estratégica';
});

// ==========================================
// 🛡️ BLOQUEO DE ACCESOS Y OTP
// ==========================================
async function handleBlockUser(userId, isBlocked) {
    const newState = !isBlocked;
    if (!confirm(`¿Ejecutar orden de ${newState ? 'BLOQUEAR' : 'DESBLOQUEAR'} para este expediente?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/block/${userId}`, { method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ is_blocked: newState }) });
        const data = await response.json();
        if (response.ok && data.success) { showUIFeedback(`Permisos actualizados.`, 'success'); await fetchAllUsers(); loadUserDossier(userId); }
    } catch (err) { showUIFeedback(`Error al procesar el bloqueo.`, 'error'); }
}

async function requestUserCertification(userId, email) {
    if(!confirm(`Se despachará un código OTP de seguridad al correo: ${email}. ¿Desea proceder?`)) return;
    showUIFeedback("Enviando PIN al atleta...", "success");
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${userId}/request-cert`, { method: 'POST', headers: getSecureHeaders() });
        const data = await response.json();
        if(data.success) {
            targetCertifyUserId = userId;
            document.getElementById('otp-input').value = ''; document.getElementById('new-password-input').value = '';
            document.getElementById('otp-step-1').classList.remove('hidden'); document.getElementById('otp-step-2').classList.add('hidden');
            const modal = document.getElementById('otp-modal'); const content = document.getElementById('otp-content');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
        } else { showUIFeedback(data.error, 'error'); }
    } catch (e) { showUIFeedback("Falla de red.", 'error'); }
}

async function verifyUserCode() {
    const code = document.getElementById('otp-input').value.trim();
    if(code.length !== 6) { showUIFeedback("El código debe tener 6 dígitos.", "error"); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/verify-cert`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify({ code: code }) });
        const data = await response.json();
        if(data.success) {
            document.getElementById('otp-step-1').classList.add('hidden'); document.getElementById('otp-step-2').classList.remove('hidden');
        } else { showUIFeedback("Código inválido o expirado.", 'error'); }
    } catch (e) { showUIFeedback("Error verificando.", 'error'); }
}

async function forcePasswordReset() {
    const newPass = document.getElementById('new-password-input').value;
    if(newPass.length < 6) { showUIFeedback("La contraseña debe tener mínimo 6 caracteres.", "error"); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/force-password`, { method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ new_password: newPass }) });
        const data = await response.json();
        if(data.success) { showUIFeedback("Contraseña forzada con éxito."); closeCertifyModal(); } 
        else { showUIFeedback(data.error, 'error'); }
    } catch (e) { showUIFeedback("Error de red.", 'error'); }
}

function closeCertifyModal() { 
    const modal = document.getElementById('otp-modal'); const content = document.getElementById('otp-content');
    modal.classList.add('opacity-0'); content.classList.add('scale-95');
    setTimeout(() => { modal.classList.remove('flex'); modal.classList.add('hidden'); }, 300);
    targetCertifyUserId = null; 
}

// ==========================================
// 🧮 MOTOR DE BIOMETRÍA AUTOMATIZADA
// ==========================================
function autoCalculateBiometrics() {
    const weight = parseFloat(document.getElementById('m-weight').value);
    const heightCm = parseFloat(document.getElementById('m-height').value);
    let age = parseInt(document.getElementById('m-age').value);
    const sex = document.getElementById('f-sex').value;

    const fatInput = document.getElementById('m-fat');
    const muscleInput = document.getElementById('m-muscle');

    // Si la edad está vacía, intentamos calcularla dinámicamente desde la fecha de nacimiento
    if (isNaN(age) || age <= 0) {
        const dobVal = document.getElementById('f-dob').value;
        if (dobVal) {
            const dob = new Date(dobVal);
            const diff = Date.now() - dob.getTime();
            age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
            document.getElementById('m-age').value = age;
        }
    }

    // 🌟 Condición: Si tenemos los 3 pilares, calculamos. Si falta alguno, dejamos en blanco.
    if (weight > 0 && heightCm > 0 && age > 0) {
        const heightM = heightCm / 100; // Convertir a metros
        const bmi = weight / (heightM * heightM); // Índice de Masa Corporal
        
        // Factor de sexo para la fórmula
        const sexFactor = sex === 'Hombre' ? 1 : (sex === 'Mujer' ? 0 : 0.5);

        // 1. Cálculo de % Grasa (Fórmula de Deurenberg et al.)
        let fatPercent = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
        
        // Ajuste de límites biológicos
        if (fatPercent < 3) fatPercent = 3;
        if (fatPercent > 65) fatPercent = 65;

        // 2. Estimación de % Músculo (Masa Muscular Esquelética aprox.)
        const muscleFactor = sex === 'Hombre' ? 0.52 : (sex === 'Mujer' ? 0.47 : 0.495);
        let musclePercent = (100 - fatPercent) * muscleFactor;

        // Imprimir resultados en el frontend redondeados a 1 decimal
        fatInput.value = fatPercent.toFixed(1);
        muscleInput.value = musclePercent.toFixed(1);
    } else {
        // Limpiar si faltan datos
        fatInput.value = '';
        muscleInput.value = '';
    }
}

// ==========================================
// 🚀 INICIALIZACIÓN BLINDADA
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const otpInput = document.getElementById('otp-input');
    if (otpInput) { otpInput.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); }); }
    fetchAllUsers();
});

}

    // 2. Escuchadores de Biometría Automatizada (NUEVO)
    document.getElementById('m-weight').addEventListener('input', autoCalculateBiometrics);
    document.getElementById('m-height').addEventListener('input', autoCalculateBiometrics);
    document.getElementById('f-sex').addEventListener('change', autoCalculateBiometrics);
    
    // Si cambias el nacimiento, actualiza la edad y recalcula todo
    document.getElementById('f-dob').addEventListener('input', () => {
        document.getElementById('m-age').value = ''; // Forzamos recálculo
        autoCalculateBiometrics();
    });

    // 3. Arrancar la extracción de datos
    fetchAllUsers();
});
