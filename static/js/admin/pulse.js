// ====================================================================
// NÚCLEO DE ASISTENCIA CORE - GYMENEZ PULSE ADMIN (FIREBASE V12 MODULAR)
// ====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// Configuración de Endpoints adaptativos
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// CONFIGURACIÓN OFICIAL: Proyecto GYMENEZAPP
const firebaseConfig = {
  apiKey: "AIzaSyC7ESvLhYTydAn_ZjHVSkebTC-BhvnbzIw",
  authDomain: "gymenezapp.firebaseapp.com",
  projectId: "gymenezapp",
  storageBucket: "gymenezapp.firebasestorage.app",
  messagingSenderId: "257686887231",
  appId: "1:257686887231:web:ca6c5ccabe33a1625b918a"
};

// Inicialización de servicios globales de Google
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentFilter = 'espera'; // Filtro de bandeja de entrada: 'espera' o 'activo'
let activeChatUserId = null;   // ID del atleta con la transmisión abierta
let messagesUnsubscribe = null;// Memoria del limpiador de eventos de mensajes
let chatDocUnsubscribe = null; // 🔥 NUEVO: Memoria del limpiador de estado de la sala en vivo

// ==========================================
// 1. CONEXIÓN INICIAL DE SEGURIDAD (ADMIN)
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) { window.location.href = '/apps/admin/login.html'; return; }

    try {
        // Solicitamos el Pase VIP firmado al Servidor Core de PythonAnywhere de forma explícita
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            // Apagar cortina de carga visual de la consola
            document.getElementById('pulse-loader').style.opacity = '0';
            setTimeout(() => document.getElementById('pulse-loader').classList.add('hidden'), 500);
            
            // Encender radares globales de la bandeja lateral
            listenToAllChats();
        } else {
            alert("Error crítico emitiendo pasaporte digital Pulse Admin.");
        }
    } catch (e) {
        alert("Falla de communication perimetral con el Servidor Core.");
    }
});

// ==========================================
// 2. MONITOREAR BANDEJA DE ENTRADA (RADARES)
// ==========================================
function listenToAllChats() {
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, orderBy("actualizado", "desc")); 

    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('chats-list-container');
        container.innerHTML = '';
        
        let found = false;

        snapshot.forEach((docSnap) => {
            const chatData = docSnap.data();
            const userId = docSnap.id;

            if (chatData.estado === currentFilter) {
                found = true;
                
                const isUnread = chatData.unread_admin ? `<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1 shadow-[0_0_10px_#ef4444]"></span>` : ``;
                const isActive = activeChatUserId === userId ? 'active' : '';
                const timeString = chatData.actualizado ? chatData.actualizado.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

                const item = document.createElement('div');
                item.className = `chat-list-item p-4 border-b border-white/5 cursor-pointer hover:bg-white/[0.02] flex justify-between ${isActive}`;
                item.onclick = () => openChatWindow(userId);

                item.innerHTML = `
                    <div class="flex-grow pr-2 overflow-hidden">
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="text-xs font-black text-white uppercase truncate">${chatData.atleta_nombre || 'Atleta Anónimo'}</h4>
                            <span class="text-[8px] font-mono text-gray-500 ml-2 shrink-0">${timeString}</span>
                        </div>
                        <p class="text-[10px] text-gray-400 truncate">${chatData.ultimo_mensaje || 'Sin transmisión de texto'}</p>
                    </div>
                    <div class="flex flex-col items-end">
                        ${isUnread}
                    </div>
                `;
                container.appendChild(item);
            }
        });

        if (!found) {
            container.innerHTML = `<div class="p-6 text-center text-gray-600 font-bold uppercase tracking-widest text-[9px]">Bandeja vacía en esta frecuencia.</div>`;
        }
    });
}

window.filterChats = function(status) {
    currentFilter = status;
    listenToAllChats();
}

// ==========================================
// 3. APERTURA DE CANAL EN TIEMPO REAL REELÉCTRICO
// ==========================================
function openChatWindow(userId) {
    activeChatUserId = userId;
    
    // Control estructural inmediato de layouts
    document.getElementById('empty-chat-state').classList.add('hidden');
    document.getElementById('active-chat-container').classList.remove('hidden');
    document.getElementById('active-chat-container').classList.add('flex');
    
    // 🔥 CORRECCIÓN CRÍTICA: Apagar escuchador del documento previo si existía
    if (chatDocUnsubscribe) chatDocUnsubscribe();

    // 🔥 ENLACE DE SEMÁFORO EN VIVO: Escuchamos los cambios del estado de la sala en tiempo real
    chatDocUnsubscribe = onSnapshot(doc(db, "chats", userId), (docSnap) => {
        if (!docSnap.exists()) return;
        const liveChatData = docSnap.data();

        document.getElementById('current-chat-name').textContent = liveChatData.atleta_nombre || 'Atleta';
        
        const acceptBtn = document.getElementById('btn-accept-chat');
        const statusText = document.getElementById('current-chat-status');
        const chatInput = document.getElementById('admin-chat-input');
        const sendBtn = document.getElementById('admin-send-btn');

        if (liveChatData.estado === 'espera') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Esperando Aprobación`;
            statusText.className = "text-amber-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
            acceptBtn.classList.remove('hidden');
            chatInput.disabled = true;
            sendBtn.disabled = true;
            chatInput.placeholder = "Acepta la solicitud para abrir transmisión...";
        } 
        else if (liveChatData.estado === 'activo') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Transmisión Activa`;
            statusText.className = "text-emerald-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
            acceptBtn.classList.add('hidden'); // Se esconde al instante sin recargar
            chatInput.disabled = false;        // Se habilita al instante
            sendBtn.disabled = false;
            chatInput.placeholder = "Escribe un mensaje al atleta...";
        } 
        else if (liveChatData.estado === 'cerrado') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block mr-1"></span> Canal Cerrado`;
            statusText.className = "text-gray-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
            acceptBtn.classList.add('hidden');
            chatInput.disabled = true;
            sendBtn.disabled = true;
            chatInput.placeholder = "Esta sesión de chat ha sido finalizada.";
        }
    });

    // Purgar marcador de no leídos en Firebase
    updateDoc(doc(db, "chats", userId), { unread_admin: false }).catch(e=>{});

    // Rematricular el recolector de burbujas en tiempo real
    if (messagesUnsubscribe) messagesUnsubscribe();
    
    const msgsRef = collection(db, "chats", userId, "mensajes");
    const q = query(msgsRef, orderBy("fecha", "asc"));

    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const area = document.getElementById('messages-area');
        area.innerHTML = ''; 

        snapshot.forEach((msgDoc) => {
            const msg = msgDoc.data();
            const isMe = msg.remitente === "admin";
            
            let timeString = "--:--";
            if (msg.fecha) timeString = msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const msgHTML = isMe ? `
                <div class="flex justify-end mb-3">
                    <div class="max-w-[75%] bg-sky-600 text-white p-3 rounded-2xl rounded-tr-sm shadow-md border border-sky-500/10">
                        <p class="text-xs font-medium whitespace-pre-wrap break-words leading-relaxed">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-sky-200 block text-right mt-1 font-mono font-bold">${timeString}</span>
                    </div>
                </div>
            ` : `
                <div class="flex justify-start mb-3">
                    <div class="max-w-[75%] bg-white/5 border border-white/5 text-gray-200 p-3 rounded-2xl rounded-tl-sm shadow-md">
                        <p class="text-xs font-medium whitespace-pre-wrap break-words leading-relaxed">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-gray-500 block text-right mt-1 font-mono font-bold">${timeString}</span>
                    </div>
                </div>
            `;
            area.insertAdjacentHTML('beforeend', msgHTML);
        });

        setTimeout(() => area.scrollTop = area.scrollHeight, 50);
    });
}

// ==========================================
// 4. ACCIONES OPERATIVAS DE CONTROL TÁCTICO
// ==========================================
window.markAsActive = async function() {
    if (!activeChatUserId) return;
    try {
        await updateDoc(doc(db, "chats", activeChatUserId), {
            estado: "activo",
            actualizado: serverTimestamp(),
            ultimo_mensaje: "🟢 Servidor Central se ha unido a la sesión."
        });
    } catch(e) { alert("Error de enlace al autorizar la sala."); }
}

window.closeCurrentSession = async function() {
    if (!activeChatUserId) return;
    if (!confirm("¿Cerrar permanentemente este canal y archivar ticket?")) return;
    
    try {
        await updateDoc(doc(db, "chats", activeChatUserId), {
            estado: "cerrado",
            actualizado: serverTimestamp(),
            ultimo_mensaje: "🔴 Sesión dada por terminada."
        });
        
        // Purgar UI local y apagar los escuchadores activos
        activeChatUserId = null;
        if(messagesUnsubscribe) messagesUnsubscribe();
        if(chatDocUnsubscribe) chatDocUnsubscribe(); // Apagamos el escuchador del documento

        document.getElementById('empty-chat-state').classList.remove('hidden');
        document.getElementById('active-chat-container').classList.add('hidden');
        document.getElementById('active-chat-container').classList.remove('flex');

    } catch(e) { alert("Error de desvinculación."); }
}

// ==========================================
// 5. PIPELINE INYECTOR DE MENSAJES (SUBMIT)
// ==========================================
document.getElementById('admin-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-chat-input');
    const texto = input.value.trim();
    if (!texto || !activeChatUserId) return;

    input.value = '';
    input.style.height = 'auto';

    try {
        await addDoc(collection(db, "chats", activeChatUserId, "mensajes"), {
            texto: texto,
            remitente: "admin",
            fecha: serverTimestamp()
        });
        
        await updateDoc(doc(db, "chats", activeChatUserId), {
            ultimo_mensaje: "Tú: " + texto,
            actualizado: serverTimestamp()
        });
    } catch (e) {
        console.error("Fallo inyectando paquete de datos:", e);
    }
});

document.getElementById('admin-chat-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('admin-chat-form').dispatchEvent(new Event('submit'));
    }
});

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
