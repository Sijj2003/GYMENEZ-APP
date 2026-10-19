// ==========================================
// 🎧 MICROSERVICIO: PULSE LIVE CHAT
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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

let activePulseChatId = null;
let messagesUnsubscribe = null;
let chatDocUnsubscribe = null; 
let isPulseAuthDone = false;

window.togglePulseDrawer = function() {
    const drawer = document.getElementById('pulse-drawer');
    if (drawer.classList.contains('translate-x-full')) {
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
        
        // Abrir automáticamente la sesión del usuario activo en el Dossier
        if (window.activeUserId) {
            const userName = document.getElementById('d-name').textContent;
            openPulseChat(window.activeUserId, userName);
        }
    } else {
        drawer.classList.add('translate-x-full');
        drawer.classList.remove('translate-x-0');
        // Cortar la suscripción en vivo ahorra memoria RAM
        if(chatDocUnsubscribe) chatDocUnsubscribe();
        if(messagesUnsubscribe) messagesUnsubscribe();
        activePulseChatId = null;
    }
};

async function openPulseChat(userId, userName) {
    activePulseChatId = userId;
    
    // Autenticar Firebase si es la primera vez que se abre el chat
    if (!isPulseAuthDone) {
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/pulse/token`, { headers: window.getSecureHeaders() });
            const data = await res.json();
            if (res.ok && data.success) {
                await signInWithCustomToken(auth, data.firebase_token);
                isPulseAuthDone = true;
            }
        } catch(e) { console.error("Error autenticando Firebase", e); return; }
    }

    // Configurar Escuchador de Sala (Metadatos)
    if (chatDocUnsubscribe) chatDocUnsubscribe();
    chatDocUnsubscribe = onSnapshot(doc(db, "chats", userId), (docSnap) => {
        const acceptBtn = document.getElementById('btn-accept-chat');
        const statusText = document.getElementById('chat-header-status');
        const chatInput = document.getElementById('admin-chat-input');
        const sendBtn = document.getElementById('admin-send-btn');
        
        document.getElementById('chat-header-name').textContent = userName;

        if (!docSnap.exists()) {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span> Sin Historial`;
            statusText.className = "text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5";
            if(acceptBtn) acceptBtn.classList.add('hidden'); 
            chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Escribe para iniciar canal...";
            return;
        }

        const liveData = docSnap.data();
        if (liveData.unread_admin) setDoc(doc(db, "chats", userId), { unread_admin: false }, { merge: true }).catch(e=>{});

        if (liveData.estado === 'espera') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span> En Espera`;
            statusText.className = "text-[9px] font-bold text-amber-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5";
            if(acceptBtn) acceptBtn.classList.remove('hidden'); 
            chatInput.disabled = true; sendBtn.disabled = true;
            chatInput.placeholder = "Atiende el ticket para responder...";
        } else if (liveData.estado === 'activo') {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span> Sala Activa`;
            statusText.className = "text-[9px] font-bold text-sky-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5";
            if(acceptBtn) acceptBtn.classList.add('hidden'); 
            chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Redactar mensaje...";
        } else {
            statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span> Canal Cerrado`;
            statusText.className = "text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5";
            if(acceptBtn) acceptBtn.classList.add('hidden'); 
            chatInput.disabled = false; sendBtn.disabled = false;
            chatInput.placeholder = "Escribe para reabrir...";
        }
    });

    // Configurar Escuchador de Mensajes (Historial)
    if (messagesUnsubscribe) messagesUnsubscribe();
    messagesUnsubscribe = onSnapshot(query(collection(db, "chats", userId, "mensajes"), orderBy("fecha", "asc")), (snapshot) => {
        const area = document.getElementById('messages-area');
        area.innerHTML = `<div class="absolute inset-0 opacity-[0.02] pointer-events-none" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 20px 20px;"></div>`; 
        
        snapshot.forEach((msgDoc) => {
            const msg = msgDoc.data();
            const isMe = msg.remitente === "admin";
            let tStr = msg.fecha ? msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

            const safeText = msg.texto.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));

            area.insertAdjacentHTML('beforeend', isMe ? `
                <div class="flex justify-end message-bubble relative z-10">
                    <div class="max-w-[85%] bg-white text-black px-4 py-3 rounded-2xl rounded-br-sm shadow-sm">
                        <p class="text-xs font-semibold whitespace-pre-wrap leading-snug">${safeText}</p>
                        <span class="text-[8px] text-gray-500 block text-right mt-1 font-bold">${tStr}</span>
                    </div>
                </div>
            ` : `
                <div class="flex justify-start message-bubble relative z-10">
                    <div class="max-w-[85%] bg-[#12121a] border border-white/10 text-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                        <p class="text-xs font-medium whitespace-pre-wrap leading-snug">${safeText}</p>
                        <span class="text-[8px] text-gray-500 block text-left mt-1 font-bold">${tStr}</span>
                    </div>
                </div>
            `);
        });

        setTimeout(() => area.scrollTop = area.scrollHeight, 50);
    });
}

// Botones de Acción Rápida (Expuestos al DOM global)
window.markAsActive = async function() {
    if (!activePulseChatId) return;
    try {
        await setDoc(doc(db, "chats", activePulseChatId), {
            estado: "activo", actualizado: serverTimestamp(), ultimo_mensaje: "Tú: 🟢 Operador en sala.", unread_user: true
        }, { merge: true });
    } catch(e) {}
};

window.closeCurrentSession = async function() {
    if (!activePulseChatId) return;
    if (!confirm("¿Cerrar el ticket de soporte de este atleta?")) return;
    try {
        await setDoc(doc(db, "chats", activePulseChatId), {
            estado: "cerrado", actualizado: serverTimestamp(), ultimo_mensaje: "Tú: 🔴 Ticket finalizado."
        }, { merge: true });
        window.togglePulseDrawer();
    } catch(e) {}
};

// Envío de Formularios y Enter Key
document.getElementById('admin-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-chat-input');
    const texto = input.value.trim();
    if (!texto || !activePulseChatId) return;

    input.value = ''; input.style.height = 'auto';
    const atName = document.getElementById('chat-header-name').textContent;

    try {
        await addDoc(collection(db, "chats", activePulseChatId, "mensajes"), { texto: texto, remitente: "admin", fecha: serverTimestamp() });
        await setDoc(doc(db, "chats", activePulseChatId), {
            estado: "activo", ultimo_mensaje: "Tú: " + texto, actualizado: serverTimestamp(), atleta_nombre: atName, unread_user: true
        }, { merge: true });
    } catch (e) {}
});

const chatInput = document.getElementById('admin-chat-input');
if (chatInput) {
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('admin-chat-form').dispatchEvent(new Event('submit'));
        }
    });
}
