import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

const firebaseConfig = {
  apiKey: "AIzaSyCzUol2mfmhZdtBeOQCZ9AfccE3UyoyTWw",
  authDomain: "gymenez-pulse.firebaseapp.com",
  projectId: "gymenez-pulse",
  storageBucket: "gymenez-pulse.firebasestorage.app",
  messagingSenderId: "1068954624936",
  appId: "1:1068954624936:web:233c93beab502c999cb39d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentFilter = 'espera'; // 'espera' o 'activo'
let activeChatUserId = null;
let messagesUnsubscribe = null;

// ==========================================
// 1. CONEXIÓN INICIAL DEL ADMIN
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) { window.location.href = '/apps/admin/login.html'; return; }

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            document.getElementById('pulse-loader').style.opacity = '0';
            setTimeout(() => document.getElementById('pulse-loader').classList.add('hidden'), 500);
            
            listenToAllChats();
        } else {
            alert("Error obteniendo pase de seguridad Pulse.");
        }
    } catch (e) {
        alert("Falla de red con el Servidor Core.");
    }
});

// ==========================================
// 2. ESCUCHAR TODOS LOS RADARES (CHATS)
// ==========================================
function listenToAllChats() {
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, orderBy("actualizado", "desc")); // Los más recientes primero

    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('chats-list-container');
        container.innerHTML = '';
        
        let found = false;

        snapshot.forEach((docSnap) => {
            const chatData = docSnap.data();
            const userId = docSnap.id;

            // Solo mostrar si coincide con el filtro y no está cerrado o inactivo
            if (chatData.estado === currentFilter) {
                found = true;
                
                // Si el mensaje lo envió el atleta, marcamos notificación
                const isUnread = chatData.unread_admin ? `<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1"></span>` : ``;
                
                const isActive = activeChatUserId === userId ? 'active' : '';
                const timeString = chatData.actualizado ? chatData.actualizado.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

                const item = document.createElement('div');
                item.className = `chat-list-item p-4 border-b border-white/5 cursor-pointer hover:bg-white/[0.02] flex justify-between ${isActive}`;
                item.onclick = () => openChatWindow(userId, chatData);

                item.innerHTML = `
                    <div class="flex-grow pr-2 overflow-hidden">
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="text-xs font-black text-white uppercase truncate">${chatData.atleta_nombre || 'Atleta'}</h4>
                            <span class="text-[8px] font-mono text-gray-500 ml-2 shrink-0">${timeString}</span>
                        </div>
                        <p class="text-[10px] text-gray-400 truncate">${chatData.ultimo_mensaje || 'Sin mensajes'}</p>
                    </div>
                    <div class="flex flex-col items-end">
                        ${isUnread}
                    </div>
                `;
                container.appendChild(item);
            }
        });

        if (!found) {
            container.innerHTML = `<div class="p-6 text-center text-gray-600 font-bold uppercase tracking-widest text-[9px]">No hay radares en esta bandeja.</div>`;
        }
    });
}

// Expuesto al HTML para cambiar de pestaña (En espera / Activos)
window.filterChats = function(status) {
    currentFilter = status;
    listenToAllChats();
}

// ==========================================
// 3. ABRIR VENTANA DE CHAT
// ==========================================
function openChatWindow(userId, chatData) {
    activeChatUserId = userId;
    
    // UI Updates
    document.getElementById('empty-chat-state').classList.add('hidden');
    document.getElementById('active-chat-container').classList.remove('hidden');
    document.getElementById('active-chat-container').classList.add('flex');
    
    document.getElementById('current-chat-name').textContent = chatData.atleta_nombre || 'Atleta';
    
    // Estado del Header y Botón "Aceptar"
    const acceptBtn = document.getElementById('btn-accept-chat');
    const statusText = document.getElementById('current-chat-status');
    const chatInput = document.getElementById('admin-chat-input');
    const sendBtn = document.getElementById('admin-send-btn');

    if (chatData.estado === 'espera') {
        statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Esperando Aprobación`;
        statusText.className = "text-amber-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
        acceptBtn.classList.remove('hidden');
        chatInput.disabled = true;
        sendBtn.disabled = true;
        chatInput.placeholder = "Acepta la solicitud para escribir...";
    } else {
        statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sesión Activa`;
        statusText.className = "text-emerald-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5";
        acceptBtn.classList.add('hidden');
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.placeholder = "Escribe al atleta...";
    }

    // Limpiar notificaciones de "No leídos" en Firebase
    updateDoc(doc(db, "chats", userId), { unread_admin: false }).catch(e=>{});

    // Rematricular Escuchador de Mensajes
    if (messagesUnsubscribe) messagesUnsubscribe();
    
    const msgsRef = collection(db, "chats", userId, "mensajes");
    const q = query(msgsRef, orderBy("fecha", "asc"));

    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const area = document.getElementById('messages-area');
        area.innerHTML = ''; // Limpiamos

        snapshot.forEach((msgDoc) => {
            const msg = msgDoc.data();
            const isMe = msg.remitente === "admin";
            
            let timeString = "--:--";
            if (msg.fecha) timeString = msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const msgHTML = isMe ? `
                <div class="flex justify-end mb-3">
                    <div class="max-w-[75%] bg-sky-600 text-white p-3 rounded-2xl rounded-tr-sm shadow-md">
                        <p class="text-xs font-medium whitespace-pre-wrap break-words leading-relaxed">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-sky-200 block text-right mt-1 font-mono font-bold">${timeString}</span>
                    </div>
                </div>
            ` : `
                <div class="flex justify-start mb-3">
                    <div class="max-w-[75%] bg-white/10 border border-white/5 text-gray-200 p-3 rounded-2xl rounded-tl-sm shadow-md">
                        <p class="text-xs font-medium whitespace-pre-wrap break-words leading-relaxed">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-gray-500 block text-right mt-1 font-mono font-bold">${timeString}</span>
                    </div>
                </div>
            `;
            area.insertAdjacentHTML('beforeend', msgHTML);
        });

        // Scroll al fondo
        setTimeout(() => area.scrollTop = area.scrollHeight, 50);
    });

    // Repintar lista para el highlight
    listenToAllChats();
}

// ==========================================
// 4. ACCIONES DEL ADMIN
// ==========================================
window.markAsActive = async function() {
    if (!activeChatUserId) return;
    try {
        await updateDoc(doc(db, "chats", activeChatUserId), {
            estado: "activo",
            actualizado: serverTimestamp(),
            ultimo_mensaje: "🟢 El administrador se ha unido al chat."
        });
        // La UI se actualizará automáticamente gracias al listener
    } catch(e) { alert("Error al aceptar el chat."); }
}

window.closeCurrentSession = async function() {
    if (!activeChatUserId) return;
    if (!confirm("¿Deseas dar por terminada y cerrada esta sesión de soporte?")) return;
    
    try {
        await updateDoc(doc(db, "chats", activeChatUserId), {
            estado: "cerrado",
            actualizado: serverTimestamp(),
            ultimo_mensaje: "🔴 Sesión finalizada por el Administrador."
        });
        
        // Limpiar UI
        activeChatUserId = null;
        if(messagesUnsubscribe) messagesUnsubscribe();
        document.getElementById('empty-chat-state').classList.remove('hidden');
        document.getElementById('active-chat-container').classList.add('hidden');
        document.getElementById('active-chat-container').classList.remove('flex');

    } catch(e) { alert("Error cerrando sesión."); }
}

// ==========================================
// 5. ENVÍO DE MENSAJES
// ==========================================
document.getElementById('admin-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-chat-input');
    const texto = input.value.trim();
    if (!texto || !activeChatUserId) return;

    input.value = '';
    input.style.height = 'auto';

    try {
        // 1. Guardar mensaje
        await addDoc(collection(db, "chats", activeChatUserId, "mensajes"), {
            texto: texto,
            remitente: "admin",
            fecha: serverTimestamp()
        });
        
        // 2. Actualizar último mensaje (Pero NO marcamos unread_admin porque lo envia el admin)
        await updateDoc(doc(db, "chats", activeChatUserId), {
            ultimo_mensaje: "Tú: " + texto,
            actualizado: serverTimestamp()
        });
    } catch (e) {
        console.error("Fallo al enviar mensaje:", e);
    }
});

// Enviar con Enter
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
