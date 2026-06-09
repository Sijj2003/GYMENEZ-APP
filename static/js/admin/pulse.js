import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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
let messagesUnsubscribe = null;
let chatDocUnsubscribe = null; 
let searchTerm = ''; // 🔥 Buscador
let lastMessageCount = 0; // 🔥 Memoria para sonidos

// 🎵 SINTETIZADOR DE AUDIO PREMIUM (Sin archivos externos)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playUISound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'receive') { // Tono suave y elegante de iMessage/Slack
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) { window.location.href = '/apps/admin/login.html'; return; }
    
    // Conectar el buscador
    document.getElementById('admin-chat-search').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase().trim();
        listenToAllChats(); // Re-renderizar lista
    });

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            document.getElementById('pulse-loader').style.opacity = '0';
            setTimeout(() => document.getElementById('pulse-loader').classList.add('hidden'), 500);
            listenToAllChats();
        }
    } catch (e) { alert("Falla de red."); }
});

let globalChatsMemory = [];

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

        if (hasNewUnread) playUISound('receive'); // 🎵 Sonido si hay un ticket en rojo
        renderSidebar();
    });
}

function renderSidebar() {
    const container = document.getElementById('chats-list-container');
    container.innerHTML = '';
    let found = false;

    globalChatsMemory.forEach((chatData) => {
        // Lógica del filtro y buscador
        if (chatData.estado !== currentFilter) return;
        if (searchTerm && !(chatData.atleta_nombre || '').toLowerCase().includes(searchTerm)) return;

        found = true;
        const isUnread = chatData.unread_admin ? `<div class="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></div>` : ``;
        const isActive = activeChatUserId === chatData.id ? 'active' : '';
        const timeString = chatData.actualizado ? chatData.actualizado.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

        const item = document.createElement('div');
        item.className = `chat-list-item p-3 rounded-xl cursor-pointer hover:bg-white/5 flex justify-between items-center ${isActive}`;
        item.onclick = () => openChatWindow(chatData.id);

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

    if (!found) {
        container.innerHTML = `<div class="p-6 text-center text-gray-600 font-bold uppercase tracking-widest text-[9px]">Sin resultados.</div>`;
    }
}

window.filterChats = function(status) {
    currentFilter = status;
    const tabE = document.getElementById('tab-espera');
    const tabA = document.getElementById('tab-activo');
    if(status === 'espera') {
        tabE.className = "flex-1 py-1.5 bg-amber-500/10 text-amber-500 rounded text-[9px] font-bold uppercase transition-all";
        tabA.className = "flex-1 py-1.5 text-gray-500 hover:text-white rounded text-[9px] font-bold uppercase transition-all";
    } else {
        tabA.className = "flex-1 py-1.5 bg-sky-500/10 text-sky-400 rounded text-[9px] font-bold uppercase transition-all";
        tabE.className = "flex-1 py-1.5 text-gray-500 hover:text-white rounded text-[9px] font-bold uppercase transition-all";
    }
    renderSidebar();
}

function openChatWindow(userId) {
    activeChatUserId = userId;
    document.getElementById('empty-chat-state').classList.add('hidden');
    document.getElementById('active-chat-container').classList.remove('hidden');
    document.getElementById('active-chat-container').classList.add('flex');
    
    if (chatDocUnsubscribe) chatDocUnsubscribe();

    chatDocUnsubscribe = onSnapshot(doc(db, "chats", userId), (docSnap) => {
        if (!docSnap.exists()) return;
        const liveChatData = docSnap.data();

        document.getElementById('current-chat-name').textContent = liveChatData.atleta_nombre || 'Atleta';
        const acceptBtn = document.getElementById('btn-accept-chat');
        const statusText = document.getElementById('current-chat-status');
        const chatInput = document.getElementById('admin-chat-input');
        const sendBtn = document.getElementById('admin-send-btn');

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
            chatInput.placeholder = "iMessage (Seguro)...";
        } else {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span> Desconectado`;
            statusText.className = "text-gray-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
            acceptBtn.classList.add('hidden');
            chatInput.disabled = true; sendBtn.disabled = true;
            chatInput.placeholder = "Canal cerrado.";
        }
    });

    updateDoc(doc(db, "chats", userId), { unread_admin: false }).catch(e=>{});

    if (messagesUnsubscribe) messagesUnsubscribe();
    
    const msgsRef = collection(db, "chats", userId, "mensajes");
    const q = query(msgsRef, orderBy("fecha", "asc"));

    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const area = document.getElementById('messages-area');
        area.innerHTML = ''; 
        let currentCount = 0;

        snapshot.forEach((msgDoc) => {
            currentCount++;
            const msg = msgDoc.data();
            const isMe = msg.remitente === "admin";
            let timeString = "";
            if (msg.fecha) timeString = msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // 🔥 Burbujas estilo iMessage
            const msgHTML = isMe ? `
                <div class="flex justify-end message-bubble">
                    <div class="max-w-[70%] bg-sky-600 text-white px-4 py-2.5 rounded-[20px] rounded-br-[4px] shadow-sm">
                        <p class="text-[13px] font-medium whitespace-pre-wrap leading-snug">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-sky-200 block text-right mt-1 font-bold">${timeString}</span>
                    </div>
                </div>
            ` : `
                <div class="flex justify-start message-bubble">
                    <div class="max-w-[70%] bg-[#1c1c1e] border border-white/5 text-gray-100 px-4 py-2.5 rounded-[20px] rounded-bl-[4px] shadow-sm">
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

window.markAsActive = async function() {
    if (!activeChatUserId) return;
    try {
        await updateDoc(doc(db, "chats", activeChatUserId), {
            estado: "activo", actualizado: serverTimestamp(), ultimo_mensaje: "🟢 Operador en sala."
        });
    } catch(e) {}
}

window.closeCurrentSession = async function() {
    if (!activeChatUserId) return;
    if (!confirm("¿Archivar este ticket?")) return;
    try {
        await updateDoc(doc(db, "chats", activeChatUserId), {
            estado: "cerrado", actualizado: serverTimestamp(), ultimo_mensaje: "🔴 Ticket cerrado."
        });
        activeChatUserId = null;
        if(messagesUnsubscribe) messagesUnsubscribe();
        if(chatDocUnsubscribe) chatDocUnsubscribe(); 
        document.getElementById('empty-chat-state').classList.remove('hidden');
        document.getElementById('active-chat-container').classList.add('hidden');
        document.getElementById('active-chat-container').classList.remove('flex');
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
        await updateDoc(doc(db, "chats", activeChatUserId), {
            ultimo_mensaje: "Tú: " + texto, actualizado: serverTimestamp()
        });
    } catch (e) {}
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
