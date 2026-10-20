// ====================================================================
// ⚙️ CONFIGURACIÓN DE RED Y ESTADO (Zero-Trust)
// ====================================================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allUsersData = [];
let activeUserId = null; 
let targetCertifyUserId = null; 

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
    // Tomamos el token directamente de localStorage para no chocar con el middleware
    const token = localStorage.getItem('gymen_admin_token'); 
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
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

window.switchDossierTab = function(tabName) {
    const tabs = ['identity', 'biolab', 'diet'];
    tabs.forEach(t => {
        const btn = document.getElementById(`d-tab-${t}`) || document.getElementById(`tab-${t}`);
        const content = document.getElementById(`d-content-${t}`);
        if (!btn || !content) return;
        
        if (t === tabName) {
            if(t === 'identity') btn.className = "d-tab-btn active py-3 border-b-2 border-[#FFC300] text-[#FFC300] font-black text-[10px] uppercase tracking-widest transition-colors";
            if(t === 'biolab') btn.className = "d-tab-btn active py-3 border-b-2 border-sky-400 text-sky-400 font-black text-[10px] uppercase tracking-widest transition-colors";
            if(t === 'diet') btn.className = "d-tab-btn active py-3 border-b-2 border-emerald-500 text-emerald-500 font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5";
            
            content.classList.remove('hidden'); 
            content.classList.add('block');
        } else {
            if(t === 'diet') {
                btn.className = "d-tab-btn py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5";
            } else {
                btn.className = "d-tab-btn py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors";
            }
            content.classList.add('hidden'); 
            content.classList.remove('block');
        }
    });
}

function setupTabs() {
    document.querySelectorAll('.d-tab-btn').forEach(btn => {
        if(btn.hasAttribute('data-target')) {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                let name = 'identity';
                if (targetId.includes('biolab')) name = 'biolab';
                if (targetId.includes('diet')) name = 'diet';
                window.switchDossierTab(name);
            });
        }
    });
}

// ==========================================
// 📡 CARGA Y RENDERIZADO DE LA LISTA
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
        document.getElementById('users-list').innerHTML = `<div class="p-4 text-center text-red-500 font-bold text-[10px] uppercase tracking-widest">Error conectando al Servidor</div>`;
    }
}

function renderUsersList(users) {
    const container = document.getElementById('users-list');
    if(!container) return;
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
document.getElementById('search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) return renderUsersList(allUsersData);
        const filtered = allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term));
        renderUsersList(filtered);
    }, 200); 
});

// ==========================================
// 🧮 MOTOR DE BIOMETRÍA
// ==========================================
function autoCalculateBiometrics() {
    const weight = parseFloat(document.getElementById('m-weight')?.value || 0);
    const heightCm = parseFloat(document.getElementById('m-height')?.value || 0);
    let age = parseInt(document.getElementById('m-age')?.value || 0);
    const sex = document.getElementById('f-sex')?.value || 'Otro';
    const fatInput = document.getElementById('m-fat');
    const muscleInput = document.getElementById('m-muscle');

    if (isNaN(age) || age <= 0) {
        const dobVal = document.getElementById('f-dob')?.value;
        if (dobVal) {
            const dob = new Date(dobVal);
            const diff = Date.now() - dob.getTime();
            age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
            if(document.getElementById('m-age')) document.getElementById('m-age').value = age;
        }
    }

    if (weight > 0 && heightCm > 0 && age > 0) {
        const heightM = heightCm / 100; 
        const bmi = weight / (heightM * heightM); 
        const sexFactor = sex === 'Hombre' ? 1 : (sex === 'Mujer' ? 0 : 0.5);
        let fatPercent = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
        
        if (fatPercent < 3) fatPercent = 3;
        if (fatPercent > 65) fatPercent = 65;

        const muscleFactor = sex === 'Hombre' ? 0.52 : (sex === 'Mujer' ? 0.47 : 0.495);
        let musclePercent = (100 - fatPercent) * muscleFactor;

        if(fatInput) fatInput.value = fatPercent.toFixed(1);
        if(muscleInput) muscleInput.value = musclePercent.toFixed(1);
    } else {
        if(fatInput) fatInput.value = '';
        if(muscleInput) muscleInput.value = '';
    }
}

// ==========================================
// 🗂️ DOSSIER 360 (IDENTIDAD + BIOLAB + NUTRICIÓN)
// ==========================================
async function loadUserDossier(userId) {
    activeUserId = userId;
    
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    renderUsersList(searchTerm ? allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(searchTerm)) : allUsersData);

    const user = allUsersData.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('empty-state')?.classList.add('hidden');
    const dossier = document.getElementById('active-dossier');
    dossier?.classList.remove('hidden'); 
    dossier?.classList.add('flex');

    const tabBiolab = document.getElementById('tab-biolab') || document.getElementById('d-tab-biolab');
    const tabDiet = document.getElementById('tab-diet') || document.getElementById('d-tab-diet');
    tabBiolab?.classList.remove('pointer-events-none', 'opacity-50');
    tabDiet?.classList.remove('pointer-events-none', 'opacity-50');

    // 1. LLENAR IDENTIDAD Y HEADERS
    if(document.getElementById('d-name')) {
        document.getElementById('d-name').textContent = user.full_name || 'N/A';
        document.getElementById('d-name').className = `text-3xl lg:text-4xl font-[900] uppercase tracking-tighter leading-none truncate w-full ${user.is_blocked ? 'text-red-500 line-through' : 'text-white'}`;
    }
    if(document.getElementById('d-email')) document.getElementById('d-email').textContent = user.email || 'N/A';
    
    const statusEl = document.getElementById('d-status');
    if(statusEl) {
        statusEl.textContent = user.is_blocked ? 'BLOQUEADO' : 'ACTIVO';
        statusEl.className = `px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest ${user.is_blocked ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`;
    }
    
    const tier = String(user.subscription_level || 'BASICO').toUpperCase();
    const tierEl = document.getElementById('d-tier');
    if(tierEl) {
        tierEl.textContent = tier;
        let tierColorClass = 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
        if(tier === 'PLUS') tierColorClass = 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
        if(tier === 'ULTRA') tierColorClass = 'bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20';
        tierEl.className = `px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest ${tierColorClass}`;
    }

    if(document.getElementById('f-id')) document.getElementById('f-id').value = user.id;
    if(document.getElementById('f-is-edit')) document.getElementById('f-is-edit').value = 'true';
    if(document.getElementById('f-name')) document.getElementById('f-name').value = user.name || '';
    if(document.getElementById('f-lastname')) document.getElementById('f-lastname').value = user.last_name || '';
    
    const emailEl = document.getElementById('f-email');
    if(emailEl) { emailEl.value = user.email || ''; emailEl.disabled = true; }
    
    const passEl = document.getElementById('f-password');
    if(passEl) { passEl.disabled = true; passEl.required = false; passEl.placeholder = "Cambio exclusivo vía OTP Clave"; }
    
    if(document.getElementById('f-tier')) document.getElementById('f-tier').value = tier;
    if(document.getElementById('f-expires')) document.getElementById('f-expires').value = user.subscription_expires_at ? String(user.subscription_expires_at).split('T')[0] : getDefaultExpirationDate();
    if(document.getElementById('f-sex')) document.getElementById('f-sex').value = user.sex || 'Otro';
    if(user.dob && document.getElementById('f-dob')) document.getElementById('f-dob').value = user.dob.split('/').reverse().join('-');
    
    // 🔥 CORRECCIÓN DEL TELÉFONO: Carga directa y limpia
    if(document.getElementById('f-phone-num')) {
        document.getElementById('f-phone-num').value = user.phone_number || '';
    }

    const btnBlock = document.getElementById('btn-block');
    if(btnBlock) {
        btnBlock.textContent = user.is_blocked ? 'Desbloquear' : 'Bloquear';
        btnBlock.className = `flex-1 md:flex-none px-4 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-colors ${user.is_blocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-black' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'}`;
        btnBlock.onclick = () => handleBlockUser(user.id, user.is_blocked);
    }

    if(document.getElementById('btn-certify')) document.getElementById('btn-certify').onclick = () => requestUserCertification(user.id, user.email);

    // 2. LLENAR BIOLAB
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/fitness-profile/${userId}`, { headers: getSecureHeaders() });
        const data = await res.json();
        
        if (data.success) {
            const m = data.metrics || {};
            const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val || ''; };
            
            setVal('m-weight', m.weight); setVal('m-height', m.height); setVal('m-age', m.age || '--');
            
            ['neck','back','thorax','abdomen','waist'].forEach(k => setVal(`m-${k}`, m[k]));
            ['bicep','forearm','femur','tibia'].forEach(k => { setVal(`m-${k}-l`, m[`${k}_left`]); setVal(`m-${k}-r`, m[`${k}_right`]); });
            ['push','pull','legs'].forEach(k => setVal(`m-${k}`, m[`rm_${k}`]));

            setVal('m-allergies', m.allergies); setVal('m-diseases', m.chronic_diseases); setVal('m-medical-notes', m.medical_notes);

            autoCalculateBiometrics();

            const g = data.goals || {};
            setVal('g-focus', g.focus || 'Masa Muscular');
            
            ['st','mt','lt'].forEach(t => { if(document.getElementById(`${t}-goals-container`)) document.getElementById(`${t}-goals-container`).innerHTML = ''; });
            const normalize = (val) => Array.isArray(val) ? val : (val && val.description ? [val] : []);
            
            normalize(g.short_term).forEach(goal => addGoalRow('st-goals-container', goal));
            normalize(g.medium_term).forEach(goal => addGoalRow('mt-goals-container', goal));
            normalize(g.long_term).forEach(goal => addGoalRow('lt-goals-container', goal));
        }
    } catch (e) { console.warn("Error leyendo biometría: ", e); }

    // 3. LLENAR NUTRICIÓN ULTRA
    const dietLocked = document.getElementById('diet-locked');
    const dietEditor = document.getElementById('diet-editor');

    if (tier !== 'ULTRA') {
        dietLocked?.classList.remove('hidden'); dietEditor?.classList.add('hidden');
    } else {
        dietLocked?.classList.add('hidden'); dietEditor?.classList.remove('hidden');
        if(document.getElementById('d-title')) document.getElementById('d-title').value = ""; 
        if(document.getElementById('d-text')) document.getElementById('d-text').value = "";

        try {
            const resDiet = await fetch(`${API_BASE_URL}/api/admin/diet/${userId}`, { headers: getSecureHeaders() });
            const dataDiet = await resDiet.json();
            if (dataDiet.success && dataDiet.has_diet) {
                if(document.getElementById('d-title')) document.getElementById('d-title').value = dataDiet.diet.title || "";
                if(document.getElementById('d-text')) document.getElementById('d-text').value = dataDiet.diet.menu_text || "";
            }
        } catch(e) { console.warn("Error leyendo dieta: ", e); }
    }

    window.switchDossierTab('identity');
}

function openCreateMode() {
    activeUserId = null;
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    renderUsersList(searchTerm ? allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(searchTerm)) : allUsersData);

    document.getElementById('empty-state')?.classList.add('hidden');
    const dossier = document.getElementById('active-dossier');
    dossier?.classList.remove('hidden'); dossier?.classList.add('flex');

    if(document.getElementById('d-name')) {
        document.getElementById('d-name').textContent = "Nuevo Atleta";
        document.getElementById('d-name').className = "text-3xl lg:text-4xl font-[900] uppercase tracking-tighter text-[#FFC300] leading-none";
    }
    if(document.getElementById('d-email')) document.getElementById('d-email').textContent = "Llenar formulario inferior";
    
    if(document.getElementById('d-status')) document.getElementById('d-status').className = "hidden";
    if(document.getElementById('d-tier')) document.getElementById('d-tier').className = "hidden";
    if(document.getElementById('btn-block')) document.getElementById('btn-block').className = "hidden";
    if(document.getElementById('btn-certify')) document.getElementById('btn-certify').className = "hidden";
    if(document.getElementById('btn-open-chat')) document.getElementById('btn-open-chat').className = "hidden";

    document.getElementById('user-form')?.reset();
    if(document.getElementById('f-id')) document.getElementById('f-id').value = '';
    if(document.getElementById('f-is-edit')) document.getElementById('f-is-edit').value = 'false';

    const emailEl = document.getElementById('f-email');
    if(emailEl) { emailEl.disabled = false; emailEl.classList.replace('text-gray-400', 'text-white'); }

    const passEl = document.getElementById('f-password');
    if(passEl) { passEl.disabled = false; passEl.required = true; passEl.placeholder = "Mínimo 6 caracteres"; passEl.classList.replace('text-gray-500', 'text-white'); }

    if(document.getElementById('f-expires')) document.getElementById('f-expires').value = getDefaultExpirationDate();
    
    const tabBiolab = document.getElementById('tab-biolab') || document.getElementById('d-tab-biolab');
    const tabDiet = document.getElementById('tab-diet') || document.getElementById('d-tab-diet');
    tabBiolab?.classList.add('pointer-events-none', 'opacity-50');
    tabDiet?.classList.add('pointer-events-none', 'opacity-50');
    
    window.switchDossierTab('identity');
}

// ==========================================
// 🍎 GESTIÓN DE DIETAS
// ==========================================
async function saveDiet() {
    const title = document.getElementById('d-title')?.value.trim();
    const text = document.getElementById('d-text')?.value.trim();
    const btn = document.getElementById('btn-save-diet');

    if (!title || !text) { showUIFeedback("El título y el menú son obligatorios", "error"); return; }
    if(btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/diet/${activeUserId}`, {
            method: 'POST', headers: getSecureHeaders(), body: JSON.stringify({ title: title, menu_text: text })
        });
        const data = await res.json();
        if (data.success) showUIFeedback("Plan nutricional publicado al atleta.");
        else showUIFeedback("Error al publicar", "error");
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
    
    if(btn) { btn.disabled = false; btn.textContent = 'Publicar en App'; }
}

async function deleteDiet() {
    if (!confirm("⚠️ ¿Revocar plan nutricional del atleta?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/diet/${activeUserId}`, { method: 'DELETE', headers: getSecureHeaders() });
        const data = await res.json();
        if (data.success) { 
            showUIFeedback("Plan nutricional revocado."); 
            if(document.getElementById('d-title')) document.getElementById('d-title').value = ""; 
            if(document.getElementById('d-text')) document.getElementById('d-text').value = "";
        }
    } catch(e) {}
}

// ==========================================
// 🏗️ CREADOR DE FILAS DE OBJETIVOS
// ==========================================
function addGoalRow(containerId, data = null) {
    const container = document.getElementById(containerId);
    if(!container) return;
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
            <select class="goal-metric-key executive-input rounded-lg p-2 text-[10px] font-bold text-white w-full">${metricOptions}</select>
        </div>
        <div class="w-full md:w-[12%]">
            <label class="block text-[8px] text-gray-400 uppercase font-black mb-1">V. Inicial</label>
            <input type="text" class="goal-start executive-input p-2 text-xs font-mono w-full" placeholder="Base" value="${data ? (data.start_value || '') : ''}">
        </div>
        <div class="w-full md:w-[12%]">
            <label class="block text-[8px] text-[#FFC300] uppercase font-black mb-1">Target</label>
            <input type="text" class="goal-target executive-input p-2 text-xs font-mono w-full !text-[#FFC300]" placeholder="Meta" value="${data ? (data.target_value || '') : ''}">
        </div>
        <div class="w-full md:flex-grow">
            <label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Descripción SMART</label>
            <input type="text" class="goal-desc executive-input p-2 text-xs w-full" placeholder="Describe la meta..." value="${data ? (data.description || '') : ''}">
        </div>
        <div class="w-full md:w-[15%]">
            <label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Estatus</label>
            <select class="goal-status executive-input rounded-lg p-2 text-[9px] font-black uppercase ${isDone ? 'text-emerald-400' : 'text-gray-300'} w-full">
                <option value="En progreso" ${!isDone ? 'selected' : ''}>En progreso</option>
                <option value="Cumplido" ${isDone ? 'selected' : ''}>Cumplido</option>
            </select>
        </div>
        <button type="button" class="btn-remove-goal w-full md:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase transition shrink-0">X</button>
    `;

    container.appendChild(row);

    row.querySelector('.btn-remove-goal').addEventListener('click', () => row.remove());
    
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
            if(document.getElementById('otp-input')) document.getElementById('otp-input').value = ''; 
            if(document.getElementById('new-password-input')) document.getElementById('new-password-input').value = '';
            document.getElementById('otp-step-1')?.classList.remove('hidden'); document.getElementById('otp-step-2')?.classList.add('hidden');
            const modal = document.getElementById('otp-modal'); const content = document.getElementById('otp-content');
            modal?.classList.remove('hidden'); modal?.classList.add('flex');
            setTimeout(() => { modal?.classList.remove('opacity-0'); content?.classList.remove('scale-95'); }, 10);
        } else { showUIFeedback(data.error, 'error'); }
    } catch (e) { showUIFeedback("Falla de red.", 'error'); }
}

async function verifyUserCode() {
    const code = document.getElementById('otp-input')?.value.trim();
    if(code.length !== 6) { showUIFeedback("El código debe tener 6 dígitos.", "error"); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/verify-cert`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify({ code: code }) });
        const data = await response.json();
        if(data.success) {
            document.getElementById('otp-step-1')?.classList.add('hidden'); document.getElementById('otp-step-2')?.classList.remove('hidden');
        } else { showUIFeedback("Código inválido o expirado.", 'error'); }
    } catch (e) { showUIFeedback("Error verificando.", 'error'); }
}

async function forcePasswordReset() {
    const newPass = document.getElementById('new-password-input')?.value;
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
    if(!modal) return;
    modal.classList.add('opacity-0'); content?.classList.add('scale-95');
    setTimeout(() => { modal.classList.remove('flex'); modal.classList.add('hidden'); }, 300);
    targetCertifyUserId = null; 
}

// ==========================================
// 🚀 INICIALIZACIÓN BLINDADA Y WIRING DE EVENTOS
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    setupTabs();

    document.getElementById('btn-create-user')?.addEventListener('click', openCreateMode);
    
    document.getElementById('btn-close-dossier')?.addEventListener('click', () => {
        document.getElementById('active-dossier')?.classList.add('hidden');
        document.getElementById('active-dossier')?.classList.remove('flex');
        document.getElementById('empty-state')?.classList.remove('hidden');
    });

    document.getElementById('btn-add-st')?.addEventListener('click', () => addGoalRow('st-goals-container'));
    document.getElementById('btn-add-mt')?.addEventListener('click', () => addGoalRow('mt-goals-container'));
    document.getElementById('btn-add-lt')?.addEventListener('click', () => addGoalRow('lt-goals-container'));

    document.getElementById('btn-save-diet')?.addEventListener('click', saveDiet);
    document.getElementById('btn-delete-diet')?.addEventListener('click', deleteDiet);

    document.getElementById('btn-verify-otp')?.addEventListener('click', verifyUserCode);
    document.getElementById('btn-force-reset')?.addEventListener('click', forcePasswordReset);
    document.getElementById('btn-close-otp')?.addEventListener('click', closeCertifyModal);

    document.getElementById('btn-open-chat')?.addEventListener('click', () => {
        if(!activeUserId) return;
        const userName = document.getElementById('d-name').textContent;
        
        if (window.parent && typeof window.parent.openThread === 'function') {
            window.parent.openThread(activeUserId, userName);
            const pulseWindow = window.parent.document.getElementById('pulse-window');
            if (pulseWindow && !pulseWindow.classList.contains('open')) pulseWindow.classList.add('open');
        } else {
            showUIFeedback("Módulo Pulse no detectado en el entorno padre.", "error");
        }
    });

    // 3. Eventos de Formularios
    document.getElementById('user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('f-submit-btn');
        const isEdit = document.getElementById('f-is-edit').value === 'true';
        const userId = document.getElementById('f-id').value;

        const name = formatToUpperCase(document.getElementById('f-name').value);
        const lastName = formatToUpperCase(document.getElementById('f-lastname').value);
        
        // 🔥 CORRECCIÓN DEL TELÉFONO: Guardado limpio
        const numEl = document.getElementById('f-phone-num');
        const fullPhoneNumber = numEl ? numEl.value.trim() : '';

        const payload = {
            name: name, last_name: lastName, full_name: `${name} ${lastName}`,
            email: document.getElementById('f-email').value, 
            password: document.getElementById('f-password')?.value,
            phone_number: fullPhoneNumber, sex: document.getElementById('f-sex')?.value, 
            subscription_level: document.getElementById('f-tier')?.value,
            subscription_expires_at: document.getElementById('f-expires')?.value,
            dob: formatDateForBackend(document.getElementById('f-dob')?.value)
        };
        
        if (isEdit) { delete payload.email; delete payload.password; }

        if(btn) { btn.disabled = true; btn.textContent = "Guardando..."; }
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
        if(btn) { btn.disabled = false; btn.textContent = "Actualizar Expediente"; }
    });

    document.getElementById('metrics-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!activeUserId) return;
        const btn = document.getElementById('btn-submit-metrics');
        
        const payload = {
            weight: document.getElementById('m-weight')?.value, height: document.getElementById('m-height')?.value,
            fat_percent: document.getElementById('m-fat')?.value, muscle_percent: document.getElementById('m-muscle')?.value,
            neck: document.getElementById('m-neck')?.value, back: document.getElementById('m-back')?.value,
            thorax: document.getElementById('m-thorax')?.value, abdomen: document.getElementById('m-abdomen')?.value,
            bicep_left: document.getElementById('m-bicep-l')?.value, bicep_right: document.getElementById('m-bicep-r')?.value,
            forearm_left: document.getElementById('m-forearm-l')?.value, forearm_right: document.getElementById('m-forearm-r')?.value,
            waist: document.getElementById('m-waist')?.value, femur_left: document.getElementById('m-femur-l')?.value,
            femur_right: document.getElementById('m-femur-r')?.value, tibia_left: document.getElementById('m-tibia-l')?.value,
            tibia_right: document.getElementById('m-tibia-r')?.value, rm_push: document.getElementById('m-push')?.value,
            rm_pull: document.getElementById('m-pull')?.value, rm_legs: document.getElementById('m-legs')?.value,
            allergies: document.getElementById('m-allergies')?.value, chronic_diseases: document.getElementById('m-diseases')?.value,
            medical_notes: document.getElementById('m-medical-notes')?.value
        };

        if(btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/metrics/${activeUserId}`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
            const data = await res.json();
            if(data.success) showUIFeedback("Telemetría corporal actualizada.");
        } catch (e) { showUIFeedback("Error de red.", "error"); }
        if(btn) { btn.disabled = false; btn.textContent = 'Guardar Biometría'; }
    });

    document.getElementById('goals-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!activeUserId) return;
        const btn = document.getElementById('btn-submit-goals');

        const payload = {
            focus: document.getElementById('g-focus')?.value,
            short_term: extractGoalsArray('st-goals-container'),
            medium_term: extractGoalsArray('mt-goals-container'),
            long_term: extractGoalsArray('lt-goals-container')
        };

        if(btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/goals/${activeUserId}`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
            const data = await res.json();
            if(data.success) showUIFeedback("Matriz de objetivos guardada.");
        } catch (e) { showUIFeedback("Error de red.", "error"); }
        if(btn) { btn.disabled = false; btn.textContent = 'Fijar Matriz Estratégica'; }
    });

    // 4. Arrancar Motor de Datos
    fetchAllUsers();
});
