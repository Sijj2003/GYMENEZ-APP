import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// ==========================================
// CONFIGURACIÓN DE NÚCLEO
// ==========================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

const firebaseConfig = {
    apiKey: "AIzaSyC7ESvLhYTydAn_ZjHVSkebTC-BhvnbzIw",
    authDomain: "gymenezapp.firebaseapp.com",
    projectId: "gymenezapp",
    storageBucket: "gymenezapp.firebasestorage.app",
    messagingSenderId: "257686887231",
    appId: "1:257686887231:web:ca6c5ccabe33a1625b918a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Estado Global (RAM)
let allUsersData = [];
let pulseChatsMemory = []; 
let activeUserId = null;
let activeChatId = null; // ID del atleta con el que estamos chateando
let targetCertifyUserId = null; 

let messagesUnsubscribe = null;
let chatDocUnsubscribe = null; 
let lastMessageCount = 0; 
let audioCtx = null;

// ==========================================
// DICCIONARIO SMART GOALS
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
// UTILIDADES UI Y SISTEMA
// ==========================================
function getSecureHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymen_admin_token')}` };
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl text-[10px] font-bold shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md w-max max-w-[90vw] ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

function playUISound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.2);
    } catch(e) {}
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// ==========================================
// ARRANQUE PRINCIPAL
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener Token Backend
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return;

    // 2. Autoresize Input Chat
    const chatInput = document.getElementById('admin-chat-input');
    if(chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';
            if(this.scrollHeight > 120) { this.style.overflowY = 'auto'; this.style.height = '120px'; } 
            else { this.style.overflowY = 'hidden'; }
        });
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('admin-chat-form').dispatchEvent(new Event('submit')); }
        });
    }

    // 3. Listeners Globales UI
    document.getElementById('search-input').addEventListener('input', (e) => {
        renderUsersList(e.target.value);
    });

    document.getElementById('m-weight').addEventListener('input', autoCalculateBiometrics);
    document.getElementById('m-height').addEventListener('input', autoCalculateBiometrics);
    document.getElementById('f-sex').addEventListener('change', autoCalculateBiometrics);
    document.getElementById('f-dob').addEventListener('input', () => { document.getElementById('m-age').value = ''; autoCalculateBiometrics(); });

    // 4. Descargar Data e Iniciar Radares
    await fetchAllUsers();
    initPulseRadar();
});

// ==========================================
// 🛰️ DIRECTORIO Y RADARES PULSE
// ==========================================
async function fetchAllUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: getSecureHeaders() });
        const data = await response.json();
        if (response.ok && data.success) {
            allUsersData = data.users; 
            renderUsersList();
        }
    } catch (error) { showUIFeedback("Error de red conectando al Directorio", "error"); }
}

async function initPulseRadar() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: getSecureHeaders() });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            const chatsRef = collection(db, "chats");
            const q = query(chatsRef, orderBy("actualizado", "desc")); 

            onSnapshot(q, (snapshot) => {
                pulseChatsMemory = [];
                let hasNewUnread = false;

                snapshot.forEach((docSnap) => {
                    const cData = docSnap.data();
                    pulseChatsMemory.push({ id: docSnap.id, ...cData });
                    
                    const isFromAdmin = (cData.ultimo_mensaje || "").startsWith("Tú: ");
                    if (cData.unread_admin && !isFromAdmin && docSnap.id !== activeChatId) {
                        hasNewUnread = true;
                    }
                });

                if (hasNewUnread) playUISound(); 
                renderUsersList(document.getElementById('search-input').value);
            });
        }
    } catch (e) { console.warn("Radares de Firebase inactivos."); }
}

function renderUsersList(searchTerm = '') {
    const container = document.getElementById('users-list');
    container.innerHTML = ''; 
    const term = searchTerm.toLowerCase().trim();

    let filtered = allUsersData;
    if (term) {
        filtered = allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-gray-500 font-bold uppercase tracking-widest text-[9px]">Sin Coincidencias</div>`;
        return;
    }

    filtered.forEach(user => {
        const item = document.createElement('div');
        const isActive = activeUserId === user.id;
        const tier = user.subscription_level || 'BASICO';
        
        let tierColor = 'text-gray-500 border-gray-500/30';
        if(tier === 'PLUS') tierColor = 'text-sky-400 border-sky-500/30';
        if(tier === 'ULTRA') tierColor = 'text-[#FFC300] border-[#FFC300]/30';

        // Lógica del Radar para encender la luz
        const chatData = pulseChatsMemory.find(c => c.id === user.id);
        let radarDot = '';
        if (chatData) {
            if (chatData.estado === 'espera') radarDot = `<div class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse"></div>`;
            else if (chatData.unread_admin && !(chatData.ultimo_mensaje || "").startsWith("Tú: ")) radarDot = `<div class="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"></div>`;
        }

        item.className = `p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-1.5 ${isActive ? 'bg-white/10 border-white/20' : 'bg-[#0a0a0f] border-transparent hover:bg-white/5'}`;
        item.onclick = () => loadUserDossier(user.id);

        item.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-2 truncate">
                    ${radarDot}
                    <span class="font-[900] text-xs uppercase tracking-tight truncate ${user.is_blocked ? 'text-red-500 line-through' : 'text-white'}">${user.full_name || 'Atleta'}</span>
                </div>
                <span class="px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest ${tierColor}">${tier}</span>
            </div>
            <span class="text-[9px] font-mono text-gray-500 truncate ml-${radarDot ? '4.5' : '0'}">${user.email}</span>
        `;
        container.appendChild(item);
    });
}

// ==========================================
// 📂 OMNI-DOSSIER (CONTROL CENTRAL)
// ==========================================
window.switchDossierTab = function(tabName) {
    const tabs = ['identity', 'biolab', 'diet'];
    tabs.forEach(t => {
        const btn = document.getElementById(`d-tab-${t}`);
        const content = document.getElementById(`d-content-${t}`);
        if (t === tabName) {
            if(t === 'identity') btn.className = "py-4 border-b-2 border-[#FFC300] text-[#FFC300] font-[900] text-[10px] uppercase tracking-[0.15em] transition-colors relative";
            if(t === 'biolab') btn.className = "py-4 border-b-2 border-white text-white font-[900] text-[10px] uppercase tracking-[0.15em] transition-colors relative";
            if(t === 'diet') btn.className = "py-4 border-b-2 border-emerald-400 text-emerald-400 font-[900] text-[10px] uppercase tracking-[0.15em] transition-colors flex items-center gap-1.5 relative";
            content.classList.remove('hidden'); content.classList.add('block');
        } else {
            btn.className = `py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-300 font-[900] text-[10px] uppercase tracking-[0.15em] transition-colors ${t==='diet'?'flex items-center gap-1.5':''}`;
            content.classList.add('hidden'); content.classList.remove('block');
        }
    });
}

async function loadUserDossier(userId) {
    activeUserId = userId;
    renderUsersList(document.getElementById('search-input').value); // Refresca resaltado

    const user = allUsersData.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('active-dossier').classList.remove('hidden'); 
    document.getElementById('active-dossier').classList.add('flex');

    // Desbloquear pestañas de UI
    document.getElementById('d-tab-biolab').classList.remove('pointer-events-none', 'opacity-50');
    document.getElementById('d-tab-diet').classList.remove('pointer-events-none', 'opacity-50');

    // 1. IDENTIDAD
    document.getElementById('d-name').textContent = user.full_name || 'Atleta';
    document.getElementById('d-name').className = `text-4xl font-[900] uppercase tracking-tighter leading-none ${user.is_blocked ? 'text-red-500 line-through' : 'text-white'}`;
    document.getElementById('d-email').textContent = user.email || 'N/A';
    
    document.getElementById('d-status').textContent = user.is_blocked ? 'BLOQUEADO' : 'ACTIVO';
    document.getElementById('d-status').className = `px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest border ${user.is_blocked ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`;
    
    const tier = String(user.subscription_level || 'BASICO').toUpperCase();
    document.getElementById('d-tier').textContent = tier;
    let tierColor = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    if(tier === 'PLUS') tierColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if(tier === 'ULTRA') tierColor = 'bg-[#FFC300]/10 text-[#FFC300] border-[#FFC300]/20 shadow-[0_0_10px_rgba(255,195,0,0.1)]';
    document.getElementById('d-tier').className = `px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest border ${tierColor}`;

    // Formularios Identity
    document.getElementById('f-id').value = user.id;
    document.getElementById('f-is-edit').value = 'true';
    document.getElementById('f-name').value = user.name || '';
    document.getElementById('f-lastname').value = user.last_name || '';
    document.getElementById('f-email').value = user.email || ''; 
    document.getElementById('f-email').disabled = true; 
    document.getElementById('f-password').disabled = true; 
    document.getElementById('f-password').required = false; 
    
    document.getElementById('f-tier').value = tier;
    document.getElementById('f-expires').value = user.subscription_expires_at ? String(user.subscription_expires_at).split('T')[0] : getDefaultExpirationDate();
    document.getElementById('f-sex').value = user.sex || 'Otro';
    if(user.dob) document.getElementById('f-dob').value = user.dob.split('/').reverse().join('-');
    
    if (user.phone_number && user.phone_number.includes('-')) {
        document.getElementById('f-phone-num').value = user.phone_number;
    } else {
        document.getElementById('f-phone-num').value = user.phone_number || '';
    }

    // Botones Header
    const btnBlock = document.getElementById('btn-block');
    btnBlock.textContent = user.is_blocked ? 'Desbloquear' : 'Bloquear';
    btnBlock.className = `px-4 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-colors ${user.is_blocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-black' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'}`;
    btnBlock.onclick = () => handleBlockUser(user.id, user.is_blocked);

    document.getElementById('btn-certify').onclick = () => requestUserCertification(user.id, user.email);

    // Actualiza evento del botón de chat para este usuario específico
    document.getElementById('btn-open-chat').onclick = () => {
        openPulseChat(user.id, user.full_name || 'Atleta');
    };

    // 2. BIOLAB (Métricas + Metas)
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/fitness-profile/${userId}`, { headers: getSecureHeaders() });
        const data = await res.json();
        
        if (data.success) {
            const m = data.metrics || {};
            document.getElementById('m-weight').value = m.weight || '';
            document.getElementById('m-height').value = m.height || '';
            document.getElementById('m-age').value = m.age || '--';
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

            autoCalculateBiometrics();

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

    // 3. NUTRICIÓN ULTRA
    if (tier !== 'ULTRA') {
        document.getElementById('diet-locked').classList.remove('hidden');
        document.getElementById('diet-editor').classList.add('hidden');
    } else {
        document.getElementById('diet-locked').classList.add('hidden');
        document.getElementById('diet-editor').classList.remove('hidden');
        document.getElementById('d-title').value = ""; document.getElementById('d-text').value = "";
        try {
            const resDiet = await fetch(`${API_BASE_URL}/api/admin/diet/${userId}`, { headers: getSecureHeaders() });
            const dataDiet = await resDiet.json();
            if (dataDiet.success && dataDiet.has_diet) {
                document.getElementById('d-title').value = dataDiet.diet.title || "";
                document.getElementById('d-text').value = dataDiet.diet.menu_text || "";
            }
        } catch(e) {}
    }

    switchDossierTab('identity');
}

window.openCreateMode = function() {
    activeUserId = null;
    renderUsersList(document.getElementById('search-input').value);

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('active-dossier').classList.remove('hidden'); document.getElementById('active-dossier').classList.add('flex');

    document.getElementById('d-name').textContent = "Nuevo Atleta";
    document.getElementById('d-email').textContent = "Completa el formulario";
    document.getElementById('d-status').className = "hidden";
    document.getElementById('d-tier').className = "hidden";
    document.getElementById('btn-open-chat').className = "hidden";
    document.getElementById('btn-block').className = "hidden";
    document.getElementById('btn-certify').className = "hidden";

    document.getElementById('user-form').reset();
    document.getElementById('f-id').value = '';
    document.getElementById('f-is-edit').value = 'false';
    document.getElementById('f-email').disabled = false;
    document.getElementById('f-password').disabled = false; document.getElementById('f-password').required = true;
    document.getElementById('f-expires').value = getDefaultExpirationDate();
    
    document.getElementById('d-tab-biolab').classList.add('pointer-events-none', 'opacity-50');
    document.getElementById('d-tab-diet').classList.add('pointer-events-none', 'opacity-50');
    switchDossierTab('identity');
}

function autoCalculateBiometrics() {
    const weight = parseFloat(document.getElementById('m-weight').value);
    const heightCm = parseFloat(document.getElementById('m-height').value);
    let age = parseInt(document.getElementById('m-age').value);
    const sex = document.getElementById('f-sex').value;

    const fatInput = document.getElementById('m-fat');
    const muscleInput = document.getElementById('m-muscle');

    if (isNaN(age) || age <= 0) {
        const dobVal = document.getElementById('f-dob').value;
        if (dobVal) {
            const dob = new Date(dobVal);
            const diff = Date.now() - dob.getTime();
            age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
            document.getElementById('m-age').value = age;
        }
    }

    if (weight > 0 && heightCm > 0 && age > 0) {
        const bmi = weight / ((heightCm/100) * (heightCm/100)); 
        const sexFactor = sex === 'Hombre' ? 1 : (sex === 'Mujer' ? 0 : 0.5);
        let fatPercent = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
        if (fatPercent < 3) fatPercent = 3; if (fatPercent > 65) fatPercent = 65;
        const muscleFactor = sex === 'Hombre' ? 0.52 : (sex === 'Mujer' ? 0.47 : 0.495);
        
        fatInput.value = fatPercent.toFixed(1);
        muscleInput.value = ((100 - fatPercent) * muscleFactor).toFixed(1);
    } else {
        fatInput.value = ''; muscleInput.value = '';
    }
}

function getDefaultExpirationDate() {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
}

// ==========================================
// 💬 PULSE SLIDE-OVER (CHAT INTEGRADO)
// ==========================================
window.togglePulseDrawer = function() {
    const drawer = document.getElementById('pulse-drawer');
    if (drawer.classList.contains('translate-x-full')) {
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
    } else {
        drawer.classList.add('translate-x-full');
        drawer.classList.remove('translate-x-0');
        // Si lo cerramos, opcionalmente cortamos la conexión de chat para ahorrar RAM
        if(chatDocUnsubscribe) chatDocUnsubscribe();
        if(messagesUnsubscribe) messagesUnsubscribe();
        activeChatId = null;
    }
}

window.openPulseChat = function(userId, userName) {
    // 1. Abrir Drawer
    const drawer = document.getElementById('pulse-drawer');
    drawer.classList.remove('translate-x-full');
    drawer.classList.add('translate-x-0');
    
    activeChatId = userId;
    
    // 2. Setup Firebase Listeners
    if (chatDocUnsubscribe) chatDocUnsubscribe();
    chatDocUnsubscribe = onSnapshot(doc(db, "chats", userId), (docSnap) => {
        const acceptBtn = document.getElementById('btn-accept-chat');
        const statusText = document.getElementById('chat-header-status');
        const chatInput = document.getElementById('admin-chat-input');
        const sendBtn = document.getElementById('admin-send-btn');
        
        document.getElementById('chat-header-name').textContent = userName;

        if (!docSnap.exists()) {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span> Sin Historial`;
            statusText.className = "text-gray-500 text-[9px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5";
            acceptBtn.classList.add('hidden'); chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Escribe para iniciar...";
            return;
        }

        const liveData = docSnap.data();
        if (liveData.unread_admin) setDoc(doc(db, "chats", userId), { unread_admin: false }, { merge: true }).catch(e=>{});

        if (liveData.estado === 'espera') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Ticket en Espera`;
            statusText.className = "text-amber-400 text-[9px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5";
            acceptBtn.classList.remove('hidden'); chatInput.disabled = true; sendBtn.disabled = true;
            chatInput.placeholder = "Sala bloqueada. Atiende el ticket...";
        } else if (liveData.estado === 'activo') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span> Sala Activa`;
            statusText.className = "text-sky-400 text-[9px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5";
            acceptBtn.classList.add('hidden'); chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Redactar mensaje...";
        } else {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span> Sesión Cerrada`;
            statusText.className = "text-gray-500 text-[9px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5";
            acceptBtn.classList.add('hidden'); chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Escribe para reabrir...";
        }
    });

    setDoc(doc(db, "chats", userId), { unread_admin: false }, { merge: true }).catch(e=>{});

    if (messagesUnsubscribe) messagesUnsubscribe();
    messagesUnsubscribe = onSnapshot(query(collection(db, "chats", userId, "mensajes"), orderBy("fecha", "asc")), (snapshot) => {
        const area = document.getElementById('messages-area');
        area.innerHTML = `<div class="absolute inset-0 opacity-[0.02] pointer-events-none" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 20px 20px;"></div>`; 
        
        let currentCount = 0;
        snapshot.forEach((msgDoc) => {
            currentCount++;
            const msg = msgDoc.data();
            const isMe = msg.remitente === "admin";
            let tStr = msg.fecha ? msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

            area.insertAdjacentHTML('beforeend', isMe ? `
                <div class="flex justify-end message-bubble relative z-10">
                    <div class="max-w-[85%] bg-white text-black px-4 py-3 rounded-[1rem] rounded-br-[4px] shadow-sm">
                        <p class="text-xs font-semibold whitespace-pre-wrap leading-snug">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-gray-500 block text-right mt-1 font-bold">${tStr}</span>
                    </div>
                </div>
            ` : `
                <div class="flex justify-start message-bubble relative z-10">
                    <div class="max-w-[85%] bg-[#12121a] border border-white/10 text-gray-200 px-4 py-3 rounded-[1rem] rounded-bl-[4px] shadow-sm">
                        <p class="text-xs font-medium whitespace-pre-wrap leading-snug">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-gray-500 block text-left mt-1 font-bold">${tStr}</span>
                    </div>
                </div>
            `);
        });

        if (currentCount > lastMessageCount) playUISound();
        lastMessageCount = currentCount;
        setTimeout(() => area.scrollTop = area.scrollHeight, 50);
    });
}

window.markAsActive = async function() {
    if (!activeChatId) return;
    try {
        await setDoc(doc(db, "chats", activeChatId), {
            estado: "activo", actualizado: serverTimestamp(), ultimo_mensaje: "Tú: 🟢 Operador en sala.", unread_user: true
        }, { merge: true });
    } catch(e) {}
}

window.closeCurrentSession = async function() {
    if (!activeChatId) return;
    if (!confirm("¿Cerrar el canal? El historial se mantendrá guardado.")) return;
    try {
        await setDoc(doc(db, "chats", activeChatId), {
            estado: "cerrado", actualizado: serverTimestamp(), ultimo_mensaje: "Tú: 🔴 Canal cerrado."
        }, { merge: true });
        window.togglePulseDrawer();
    } catch(e) {}
}

document.getElementById('admin-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-chat-input');
    const texto = input.value.trim();
    if (!texto || !activeChatId) return;

    input.value = ''; input.style.height = 'auto';
    const atName = document.getElementById('chat-header-name').textContent;

    try {
        await addDoc(collection(db, "chats", activeChatId, "mensajes"), { texto: texto, remitente: "admin", fecha: serverTimestamp() });
        await setDoc(doc(db, "chats", activeChatId), {
            estado: "activo", ultimo_mensaje: "Tú: " + texto, actualizado: serverTimestamp(), atleta_nombre: atName, unread_user: true
        }, { merge: true });
    } catch (e) {}
});

// ==========================================
// 💾 GUARDADO DE EXPEDIENTE (BOTONES OMNI)
// ==========================================
document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('f-submit-btn');
    const isEdit = document.getElementById('f-is-edit').value === 'true';
    const userId = document.getElementById('f-id').value;

    const payload = {
        name: document.getElementById('f-name').value.toUpperCase().trim(),
        last_name: document.getElementById('f-lastname').value.toUpperCase().trim(),
        full_name: `${document.getElementById('f-name').value} ${document.getElementById('f-lastname').value}`.toUpperCase().trim(),
        email: document.getElementById('f-email').value, 
        password: document.getElementById('f-password').value,
        phone_number: document.getElementById('f-phone-num').value, 
        sex: document.getElementById('f-sex').value, 
        subscription_level: document.getElementById('f-tier').value,
        subscription_expires_at: document.getElementById('f-expires').value,
        dob: document.getElementById('f-dob').value ? document.getElementById('f-dob').value.split('-').reverse().join('/') : ''
    };
    if (isEdit) { delete payload.email; delete payload.password; }

    btn.disabled = true; btn.textContent = "...";
    try {
        const res = await fetch(isEdit ? `${API_BASE_URL}/api/admin/user/${userId}` : `${API_BASE_URL}/api/admin/user`, { method: isEdit ? 'PUT' : 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok && data.success) { showUIFeedback(`Expediente actualizado.`, 'success'); await fetchAllUsers(); loadUserDossier(isEdit ? userId : allUsersData.find(u => u.email === payload.email).id); } 
        else { showUIFeedback(data.error, "error"); }
    } catch (err) { showUIFeedback("Falla de red.", "error"); }
    btn.disabled = false; btn.textContent = "Actualizar Expediente";
});

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

    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/metrics/${activeUserId}`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        if((await res.json()).success) showUIFeedback("Telemetría actualizada.");
    } catch (e) {}
    btn.disabled = false;
});

document.getElementById('goals-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!activeUserId) return;
    
    const payload = {
        focus: document.getElementById('g-focus').value,
        short_term: Array.from(document.querySelectorAll('#st-goals-container .goal-row')).map(r => ({ metric_key: r.querySelector('.g-key').value, start_value: r.querySelector('.g-st').value, target_value: r.querySelector('.g-tg').value, description: r.querySelector('.g-ds').value, status: r.querySelector('.g-stt').value })),
        medium_term: Array.from(document.querySelectorAll('#mt-goals-container .goal-row')).map(r => ({ metric_key: r.querySelector('.g-key').value, start_value: r.querySelector('.g-st').value, target_value: r.querySelector('.g-tg').value, description: r.querySelector('.g-ds').value, status: r.querySelector('.g-stt').value })),
        long_term: Array.from(document.querySelectorAll('#lt-goals-container .goal-row')).map(r => ({ metric_key: r.querySelector('.g-key').value, start_value: r.querySelector('.g-st').value, target_value: r.querySelector('.g-tg').value, description: r.querySelector('.g-ds').value, status: r.querySelector('.g-stt').value }))
    };

    document.getElementById('btn-submit-goals').disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/goals/${activeUserId}`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        if((await res.json()).success) showUIFeedback("Matriz SMART guardada.");
    } catch (e) {}
    document.getElementById('btn-submit-goals').disabled = false;
});

window.addGoalRow = function(containerId, data = null) {
    const row = document.createElement('div');
    row.className = 'goal-row flex flex-col md:flex-row gap-3 p-4 bg-[#12121a] border border-white/5 rounded-xl items-end relative';
    row.innerHTML = `
        <div class="w-full md:w-1/5"><label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Variable</label>
            <select class="g-key executive-input p-2 rounded-lg text-[10px] w-full">${MEASURABLE_METRICS.map(m => `<option value="${m.id}" ${data && data.metric_key === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
        </div>
        <div class="w-full md:w-[12%]"><label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Inicio</label><input type="text" class="g-st executive-input p-2 text-xs font-mono w-full" value="${data?data.start_value||'':''}"></div>
        <div class="w-full md:w-[12%]"><label class="block text-[8px] text-[#FFC300] uppercase font-black mb-1">Target</label><input type="text" class="g-tg executive-input p-2 text-xs font-mono w-full !border-[#FFC300]/30 !text-[#FFC300]" value="${data?data.target_value||'':''}"></div>
        <div class="w-full md:flex-grow"><label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Directiva</label><input type="text" class="g-ds executive-input p-2 text-xs w-full" value="${data?data.description||'':''}"></div>
        <div class="w-full md:w-[15%]"><label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Estado</label>
            <select class="g-stt executive-input p-2 rounded-lg text-[9px] font-black uppercase w-full ${data && data.status==='Cumplido'?'text-emerald-400':'text-gray-300'}"><option value="En progreso" ${data && data.status!=='Cumplido'?'selected':''}>En progreso</option><option value="Cumplido" ${data && data.status==='Cumplido'?'selected':''}>Cumplido</option></select>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="w-full md:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase shrink-0">X</button>
    `;
    document.getElementById(containerId).appendChild(row);
}

// ==========================================
// 🛡️ SEGURIDAD Y OTP
// ==========================================
window.handleBlockUser = async function(userId, isBlocked) {
    if (!confirm(`¿Ejecutar orden de ${!isBlocked ? 'BLOQUEAR' : 'DESBLOQUEAR'} para este expediente?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/user/block/${userId}`, { method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ is_blocked: !isBlocked }) });
        if ((await res.json()).success) { showUIFeedback("Estado alterado."); await fetchAllUsers(); loadUserDossier(userId); }
    } catch (e) {}
}

window.requestUserCertification = async function(userId, email) {
    if(!confirm(`Se enviará un PIN de seguridad al correo: ${email}. ¿Desea proceder?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/user/${userId}/request-cert`, { method: 'POST', headers: getSecureHeaders() });
        if((await res.json()).success) {
            targetCertifyUserId = userId;
            document.getElementById('otp-step-1').classList.remove('hidden'); document.getElementById('otp-step-2').classList.add('hidden');
            const modal = document.getElementById('otp-modal'); const content = document.getElementById('otp-content');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
        }
    } catch (e) { showUIFeedback("Error enviando PIN.", "error"); }
}

window.verifyUserCode = async function() {
    const code = document.getElementById('otp-input').value.trim();
    if(code.length !== 6) return showUIFeedback("Código de 6 dígitos.", "error");
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/verify-cert`, { method: 'POST', headers: getSecureHeaders(), body: JSON.stringify({ code: code }) });
        if((await res.json()).success) {
            document.getElementById('otp-step-1').classList.add('hidden'); document.getElementById('otp-step-2').classList.remove('hidden');
        } else showUIFeedback("Código inválido.", "error");
    } catch (e) {}
}

window.forcePasswordReset = async function() {
    const newPass = document.getElementById('new-password-input').value;
    if(newPass.length < 6) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/force-password`, { method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ new_password: newPass }) });
        if((await res.json()).success) { showUIFeedback("Contraseña forzada."); window.closeCertifyModal(); }
    } catch (e) {}
}

window.closeCertifyModal = function() { 
    document.getElementById('otp-modal').classList.add('opacity-0'); document.getElementById('otp-content').classList.add('scale-95');
    setTimeout(() => { document.getElementById('otp-modal').classList.add('hidden'); document.getElementById('otp-modal').classList.remove('flex'); }, 300);
}
