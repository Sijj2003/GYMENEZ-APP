import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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

let currentFilter = 'espera'; 
let activeChatUserId = null;
let activeChatUserName = 'Atleta';
let messagesUnsubscribe = null;
let chatDocUnsubscribe = null; 
let searchTerm = ''; 
let lastMessageCount = 0; 
let globalChatsMemory = [];
let allSystemUsers = [];

// 🎵 SINTETIZADOR DE AUDIO UI (Bloop/Ding)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playUISound(type) {
    try {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        if (type === 'receive') { 
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.2);
        }
    } catch(e) {}
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

// Permitir funciones en el scope global (porque type="module" encapsula todo)
window.filterChats = filterChats;
window.openChatWindow = openChatWindow;
window.closeMobileWorkspace = closeMobileWorkspace;
window.markAsActive = markAsActive;
window.closeCurrentSession = closeCurrentSession;

// ==========================================
// 🚀 INICIO Y AUTENTICACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return; // Middleware lo echará
    
    // Autoresize del input text
    const chatInput = document.getElementById('admin-chat-input');
    if(chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if(this.scrollHeight > 120) { this.style.overflowY = 'auto'; this.style.height = '120px'; } 
            else { this.style.overflowY = 'hidden'; }
        });
    }

    document.getElementById('admin-chat-search').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase().trim();
        renderSidebar(); 
    });

    // Carga de directorio de atletas para pestañas
    fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => { if(data.success) allSystemUsers = data.users; })
        .catch(e => console.error("Error directorio", e));

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            document.getElementById('chats-list-container').innerHTML = ''; // Quitar loader local
            
            // Encender Radares
            listenToAllChats();

            // 🔥 REDIRECCIÓN PREMIUM DESDE EL RADAR FLOTANTE
            const pendingOpenId = localStorage.getItem('gymen_pending_open_id');
            const pendingOpenName = localStorage.getItem('gymen_pending_open_name');
            if (pendingOpenId) {
                localStorage.removeItem('gymen_pending_open_id');
                localStorage.removeItem('gymen_pending_open_name');
                setTimeout(() => openChatWindow(pendingOpenId, pendingOpenName), 600); 
            }
        }
    } catch (e) { showUIFeedback("Falla de red.", "error"); }
});

// ==========================================
// 📡 RADARES Y LISTAS
// ==========================================
function listenToAllChats() {
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, orderBy("actualizado", "desc")); 

    onSnapshot(q, (snapshot) => {
        globalChatsMemory = [];
        let hasNewUnread = false;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            globalChatsMemory.push({ id: docSnap.id, ...data });
            if (data.unread_admin) hasNewUnread = true;
        });

        if (hasNewUnread) playUISound('receive'); 
        renderSidebar();
    }, (error) => console.warn("Escuchador silenciado."));
}

function renderSidebar() {
    const container = document.getElementById('chats-list-container');
    container.innerHTML = '';
    let found = false;

    if (currentFilter === 'directorio' || searchTerm !== '') {
        allSystemUsers.forEach(u => {
            const fullName = `${u.name} ${u.last_name || ''}`.trim();
            if (searchTerm && !fullName.toLowerCase().includes(searchTerm)) return;

            found = true;
            const existingChat = globalChatsMemory.find(c => c.id === u.id);
            const isUnread = (existingChat && existingChat.unread_admin) ? `<div class="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></div>` : ``;
            const isActive = activeChatUserId === u.id;
            
            let timeString = '';
            let lastMsg = 'Abrir canal de comunicación';

            if (existingChat) {
                timeString = existingChat.actualizado ? existingChat.actualizado.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                lastMsg = existingChat.ultimo_mensaje || '';
            }

            const item = document.createElement('div');
            item.className = `p-3 rounded-xl cursor-pointer transition-all duration-200 flex justify-between items-center ${isActive ? 'bg-white/10 border border-sky-500/50' : 'bg-transparent border border-transparent hover:bg-white/5'}`;
            item.onclick = () => openChatWindow(u.id, fullName);

            item.innerHTML = `
                <div class="flex-grow pr-2 overflow-hidden">
                    <div class="flex justify-between items-start mb-0.5">
                        <h4 class="text-[11px] font-black ${existingChat ? 'text-white' : 'text-gray-400'} uppercase truncate">${fullName}</h4>
                        <span class="text-[9px] font-bold text-gray-600 ml-2 shrink-0">${timeString || 'NUEVO'}</span>
                    </div>
                    <p class="text-[10px] text-gray-500 font-medium truncate">${lastMsg}</p>
                </div>
                <div class="flex flex-col items-end shrink-0 pl-2">${isUnread}</div>
            `;
            container.appendChild(item);
        });
    } else {
        globalChatsMemory.forEach((chatData) => {
            if (chatData.estado !== currentFilter) return;

            found = true;
            const isUnread = chatData.unread_admin ? `<div class="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></div>` : ``;
            const isActive = activeChatUserId === chatData.id;
            const timeString = chatData.actualizado ? chatData.actualizado.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

            const item = document.createElement('div');
            item.className = `p-3 rounded-xl cursor-pointer transition-all duration-200 flex justify-between items-center ${isActive ? 'bg-white/10 border border-sky-500/50' : 'bg-transparent border border-transparent hover:bg-white/5'}`;
            item.onclick = () => openChatWindow(chatData.id, chatData.atleta_nombre);

            item.innerHTML = `
                <div class="flex-grow pr-2 overflow-hidden">
                    <div class="flex justify-between items-start mb-0.5">
                        <h4 class="text-[11px] font-black text-white uppercase truncate">${chatData.atleta_nombre || 'Atleta'}</h4>
                        <span class="text-[9px] font-bold text-gray-600 ml-2 shrink-0">${timeString}</span>
                    </div>
                    <p class="text-[10px] text-gray-500 font-medium truncate">${chatData.ultimo_mensaje || ''}</p>
                </div>
                <div class="flex flex-col items-end shrink-0 pl-2">${isUnread}</div>
            `;
            container.appendChild(item);
        });
    }

    if (!found) {
        container.innerHTML = `<div class="p-6 text-center text-gray-600 font-bold uppercase tracking-widest text-[9px]">Sin resultados.</div>`;
    }
}

function filterChats(status) {
    currentFilter = status;
    searchTerm = '';
    document.getElementById('admin-chat-search').value = '';

    const tabs = {
        'espera': document.getElementById('tab-espera'),
        'activo': document.getElementById('tab-activo'),
        'directorio': document.getElementById('tab-directorio')
    };

    Object.values(tabs).forEach(t => {
        if(t) t.className = "cat-filter flex-1 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white text-[8px] font-black uppercase tracking-widest transition-all text-center shrink-0";
    });

    if(status === 'espera' && tabs['espera']) {
        tabs['espera'].className = "cat-filter flex-1 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest transition-all text-center shrink-0";
    } else if(status === 'activo' && tabs['activo']) {
        tabs['activo'].className = "cat-filter flex-1 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[8px] font-black uppercase tracking-widest transition-all text-center shrink-0";
    } else if(status === 'directorio' && tabs['directorio']) {
        tabs['directorio'].className = "cat-filter flex-1 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[8px] font-black uppercase tracking-widest transition-all text-center shrink-0";
    }
    renderSidebar();
}

// ==========================================
// 🖥️ WORKSPACE (DERECHA Y MÓVIL)
// ==========================================
function closeMobileWorkspace() {
    const invPanel = document.getElementById('inventory-panel');
    const wsPanel = document.getElementById('workspace-panel');
    
    // Reactivar Sidebar en Móvil
    invPanel.classList.remove('hidden');
    invPanel.classList.add('flex');
    
    // Esconder Chat en Móvil
    wsPanel.classList.remove('flex');
    wsPanel.classList.add('hidden', 'md:flex');
    
    activeChatUserId = null;
    renderSidebar(); // Quita el highlight
}

function openChatWindow(userId, userName) {
    activeChatUserId = userId;
    activeChatUserName = userName || 'Atleta';
    
    // UI Móvil Responsive Split-View
    const invPanel = document.getElementById('inventory-panel');
    const wsPanel = document.getElementById('workspace-panel');
    
    if (window.innerWidth < 768) {
        invPanel.classList.remove('flex');
        invPanel.classList.add('hidden');
        wsPanel.classList.remove('hidden');
        wsPanel.classList.add('flex');
    }

    document.getElementById('ws-empty').classList.add('hidden');
    document.getElementById('ws-chat').classList.remove('hidden');
    document.getElementById('ws-chat').classList.add('flex');
    
    if (chatDocUnsubscribe) chatDocUnsubscribe();

    chatDocUnsubscribe = onSnapshot(doc(db, "chats", userId), (docSnap) => {
        const acceptBtn = document.getElementById('btn-accept-chat');
        const statusText = document.getElementById('current-chat-status');
        const chatInput = document.getElementById('admin-chat-input');
        const sendBtn = document.getElementById('admin-send-btn');
        
        document.getElementById('current-chat-name').textContent = activeChatUserName;

        if (!docSnap.exists()) {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block mr-1"></span> Sin Historial`;
            statusText.className = "text-gray-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
            acceptBtn.classList.add('hidden');
            chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Escribe para abrir un nuevo canal...";
            return;
        }

        const liveChatData = docSnap.data();

        if (liveChatData.estado === 'espera') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> En Cola de Espera`;
            statusText.className = "text-amber-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
            acceptBtn.classList.remove('hidden');
            chatInput.disabled = true; sendBtn.disabled = true;
            chatInput.placeholder = "Sala bloqueada hasta intervención...";
        } else if (liveChatData.estado === 'activo') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Conexión Establecida`;
            statusText.className = "text-emerald-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
            acceptBtn.classList.add('hidden'); 
            chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Pulse Message...";
        } else {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span> Canal Cerrado`;
            statusText.className = "text-gray-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
            acceptBtn.classList.add('hidden');
            chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Escribe para reabrir el canal...";
        }
    }, (error) => console.warn("Escuchador de sala silenciado."));

    setDoc(doc(db, "chats", userId), { unread_admin: false }, { merge: true }).catch(e=>{});

    if (messagesUnsubscribe) messagesUnsubscribe();
    
    const msgsRef = collection(db, "chats", userId, "mensajes");
    const q = query(msgsRef, orderBy("fecha", "asc"));

    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const area = document.getElementById('messages-area');
        // Mantener la retícula de fondo en el HTML
        const bgGrid = `<div class="absolute inset-0 opacity-[0.02] pointer-events-none" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 20px 20px;"></div>`;
        area.innerHTML = bgGrid; 
        
        let currentCount = 0;

        snapshot.forEach((msgDoc) => {
            currentCount++;
            const msg = msgDoc.data();
            const isMe = msg.remitente === "admin";
            let timeString = "";
            if (msg.fecha) timeString = msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const msgHTML = isMe ? `
                <div class="flex justify-end message-bubble relative z-10">
                    <div class="max-w-[85%] md:max-w-[70%] bg-sky-600 text-white px-4 py-2.5 rounded-[20px] rounded-br-[4px] shadow-md border border-sky-500/50">
                        <p class="text-[13px] font-medium whitespace-pre-wrap leading-snug">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-sky-200 block text-right mt-1 font-bold">${timeString}</span>
                    </div>
                </div>
            ` : `
                <div class="flex justify-start message-bubble relative z-10">
                    <div class="max-w-[85%] md:max-w-[70%] bg-[#1c1c1e]/90 backdrop-blur-md border border-white/10 text-gray-100 px-4 py-2.5 rounded-[20px] rounded-bl-[4px] shadow-sm">
                        <p class="text-[13px] font-medium whitespace-pre-wrap leading-snug">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-gray-500 block text-left mt-1 font-bold">${timeString}</span>
                    </div>
                </div>
            `;
            area.insertAdjacentHTML('beforeend', msgHTML);
        });

        if (currentCount > lastMessageCount) { playUISound('receive'); }
        lastMessageCount = currentCount;

        setTimeout(() => area.scrollTop = area.scrollHeight, 50);
    });
    
    renderSidebar();
}

async function markAsActive() {
    if (!activeChatUserId) return;
    try {
        await setDoc(doc(db, "chats", activeChatUserId), {
            estado: "activo", 
            actualizado: serverTimestamp(), 
            ultimo_mensaje: "🟢 Operador en sala.",
            atleta_nombre: activeChatUserName,
            unread_user: true
        }, { merge: true });
    } catch(e) {}
}

async function closeCurrentSession() {
    if (!activeChatUserId) return;
    if (!confirm("¿Cerrar el canal? El historial de mensajes se mantendrá guardado.")) return;
    
    const targetId = activeChatUserId;
    
    if(messagesUnsubscribe) messagesUnsubscribe();
    if(chatDocUnsubscribe) chatDocUnsubscribe(); 
    
    document.getElementById('ws-empty').classList.remove('hidden');
    document.getElementById('ws-chat').classList.add('hidden');
    document.getElementById('ws-chat').classList.remove('flex');
    
    activeChatUserId = null;
    renderSidebar();

    try {
        await setDoc(doc(db, "chats", targetId), {
            estado: "cerrado", 
            actualizado: serverTimestamp(), 
            ultimo_mensaje: "🔴 Canal cerrado."
        }, { merge: true });
    } catch(e) {}
}

document.getElementById('admin-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-chat-input');
    const texto = input.value.trim();
    if (!texto || !activeChatUserId) return;

    input.value = ''; input.style.height = 'auto';

    try {
        await addDoc(collection(db, "chats", activeChatUserId, "mensajes"), {
            texto: texto, remitente: "admin", fecha: serverTimestamp()
        });
        
        await setDoc(doc(db, "chats", activeChatUserId), {
            estado: "activo",
            ultimo_mensaje: "Tú: " + texto, 
            actualizado: serverTimestamp(),
            atleta_nombre: activeChatUserName,
            unread_user: true
        }, { merge: true });
    } catch (e) { console.error(e); }
});

document.getElementById('admin-chat-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('admin-chat-form').dispatchEvent(new Event('submit'));
    }
});

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
