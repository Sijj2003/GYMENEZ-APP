// ====================================================================
// NÚCLEO DE MENSAJERÍA - GYMENEZ PULSE (FIREBASE V10 MODULAR)
// ====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// CONFIGURACIÓN CENTRAL
// ==========================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Credenciales Oficiales del Proyecto GYMENEZ PULSE
const firebaseConfig = {
  apiKey: "AIzaSyCzUol2mfmhZdtBeOQCZ9AfccE3UyoyTWw",
  authDomain: "gymenez-pulse.firebaseapp.com",
  projectId: "gymenez-pulse",
  storageBucket: "gymenez-pulse.firebasestorage.app",
  messagingSenderId: "1068954624936",
  appId: "1:1068954624936:web:233c93beab502c999cb39d",
  measurementId: "G-0D3WLFF45P"
};

// Inicialización de Servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables Globales de Estado Operativo
let currentUserId = null;
let currentChatStatus = "inactivo"; 
// Estados posibles: "inactivo", "espera", "activo", "cerrado"

// Mapeo de UI
const ui = {
    overlay: document.getElementById('chat-request-overlay'),
    inputArea: document.getElementById('chat-input-area'),
    statusText: document.getElementById('chat-status-text'),
    btnRequest: document.getElementById('btn-request-support'),
    reqMsg: document.getElementById('request-status-msg'),
    messagesArea: document.getElementById('chat-messages-area'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input')
};

// ==========================================
// 1. PUENTE CRIPTOGRÁFICO CON PYTHONANYWHERE
// ==========================================
async function authenticateWithFirebase() {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token');
    const sessionStr = localStorage.getItem('userSession');
    
    if (!token || !sessionStr) {
        window.location.href = '/apps/start/login.html';
        return false;
    }

    const session = JSON.parse(sessionStr);
    currentUserId = session.id || session._id;

    try {
        // Solicitud del Custom Token al servidor central de Gymenez
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            // Autenticación silenciosa en Firebase
            await signInWithCustomToken(auth, data.firebase_token);
            console.log("🔒 Enlace seguro con el motor de Firebase establecido.");
            return true;
        } else {
            throw new Error(data.error || "No se pudo emitir el Pase VIP.");
        }
    } catch (error) {
        console.error("Fallo el puente de seguridad:", error);
        ui.reqMsg.textContent = "Error de enlace criptográfico con el servidor.";
        ui.btnRequest.disabled = true;
        ui.btnRequest.classList.add('opacity-50');
        return false;
    }
}

// ==========================================
// 2. EL SEMÁFORO (Escucha de Estados de Sala)
// ==========================================
function listenToChatStatus() {
    const chatDocRef = doc(db, "chats", currentUserId);

    onSnapshot(chatDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentChatStatus = data.estado || "inactivo";
        } else {
            currentChatStatus = "inactivo";
        }
        updateUIBasedOnStatus();
    });
}

function updateUIBasedOnStatus() {
    if (currentChatStatus === "inactivo" || currentChatStatus === "cerrado") {
        ui.overlay.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
        ui.inputArea.classList.add('hidden');
        ui.btnRequest.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg> Solicitar Asistencia`;
        ui.btnRequest.disabled = false;
        ui.btnRequest.classList.remove('opacity-50', 'cursor-not-allowed');
        ui.reqMsg.textContent = currentChatStatus === "cerrado" 
            ? "Sesión finalizada por el administrador. Inicia una nueva si lo necesitas." 
            : "Para iniciar una conversación, solicita una sesión segura.";
        
        ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block mr-1"></span> Inactivo`;
    } 
    else if (currentChatStatus === "espera") {
        ui.overlay.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
        ui.inputArea.classList.add('hidden');
        ui.btnRequest.innerHTML = `<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Buscando entrenador...`;
        ui.btnRequest.disabled = true;
        ui.btnRequest.classList.add('opacity-50', 'cursor-not-allowed');
        ui.reqMsg.textContent = "Tu solicitud está en la cola de prioridad. Mantén la pantalla abierta.";
        
        ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block mr-1 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span> En Espera`;
    } 
    else if (currentChatStatus === "activo") {
        ui.overlay.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
        ui.inputArea.classList.remove('hidden');
        
        ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block mr-1 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span> En Línea`;
        
        scrollToBottom();
    }
}

// Acción del Botón "Solicitar Asistencia"
ui.btnRequest.addEventListener('click', async () => {
    if (!currentUserId) return;
    
    // Cambiar botón temporalmente a estado de carga local
    ui.btnRequest.innerHTML = `<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Conectando...`;
    ui.btnRequest.disabled = true;

    try {
        const session = JSON.parse(localStorage.getItem('userSession'));
        const nombreAtleta = `${session.name || 'Atleta'} ${session.last_name || ''}`.trim();
        
        const chatDocRef = doc(db, "chats", currentUserId);
        
        // Escribe en Firebase que el atleta solicitó asistencia
        await setDoc(chatDocRef, {
            estado: "espera",
            actualizado: serverTimestamp(),
            atleta_nombre: nombreAtleta,
            ultimo_mensaje: "🔴 Solicitó asistencia"
        }, { merge: true });
        
        // No es necesario actualizar la UI manualmente; el onSnapshot lo hará al detectar el cambio
    } catch (e) {
        console.error("Error al solicitar sesión:", e);
        ui.reqMsg.textContent = "Error al intentar contactar al servidor.";
        ui.btnRequest.innerHTML = "Reintentar";
        ui.btnRequest.disabled = false;
    }
});

// ==========================================
// 3. MOTOR DE MENSAJERÍA (Burbujas de Chat)
// ==========================================
function listenToMessages() {
    const messagesRef = collection(db, "chats", currentUserId, "mensajes");
    const q = query(messagesRef, orderBy("fecha", "asc"));

    onSnapshot(q, (snapshot) => {
        // Almacenar el mensaje de bienvenida del sistema fijo que está en el HTML
        const systemMessages = Array.from(ui.messagesArea.children).slice(0, 2).map(el => el.outerHTML).join('');
        ui.messagesArea.innerHTML = systemMessages;

        snapshot.forEach((doc) => {
            renderMessage(doc.data());
        });
        scrollToBottom();
    });
}

function renderMessage(msg) {
    const isMe = msg.remitente === "atleta";
    
    let timeString = "--:--";
    if (msg.fecha) {
        const date = msg.fecha.toDate();
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const msgHTML = isMe ? `
        <div class="flex justify-end fade-in-up mb-3">
            <div class="max-w-[85%] sm:max-w-[70%] bg-[#FFC300] text-black p-3 rounded-2xl rounded-tr-sm shadow-[0_5px_15px_rgba(255,195,0,0.15)]">
                <p class="text-xs sm:text-sm font-black whitespace-pre-wrap break-words leading-snug">${escapeHTML(msg.texto)}</p>
                <span class="text-[8px] text-yellow-900 block text-right mt-1.5 font-mono font-bold">${timeString}</span>
            </div>
        </div>
    ` : `
        <div class="flex justify-start fade-in-up mb-3">
            <div class="max-w-[85%] sm:max-w-[70%] bg-white/10 border border-white/5 text-gray-200 p-3 rounded-2xl rounded-tl-sm shadow-md">
                <p class="text-xs sm:text-sm font-medium whitespace-pre-wrap break-words leading-relaxed">${escapeHTML(msg.texto)}</p>
                <span class="text-[8px] text-gray-500 block text-right mt-1.5 font-mono font-bold">${timeString}</span>
            </div>
        </div>
    `;

    ui.messagesArea.insertAdjacentHTML('beforeend', msgHTML);
}

// Acción: Enviar Mensaje
ui.chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = ui.chatInput.value.trim();
    if (!texto || !currentUserId || currentChatStatus !== "activo") return;

    // Resetear caja de texto (estética tipo WhatsApp)
    ui.chatInput.value = '';
    ui.chatInput.style.height = 'auto';

    try {
        const messagesRef = collection(db, "chats", currentUserId, "mensajes");
        
        // 1. Guardar el mensaje en la subcolección
        await addDoc(messagesRef, {
            texto: texto,
            remitente: "atleta",
            fecha: serverTimestamp()
        });
        
        // 2. Actualizar la "hora de última actividad" para que el Admin lo vea de primero en su lista
        await setDoc(doc(db, "chats", currentUserId), {
            ultimo_mensaje: texto,
            actualizado: serverTimestamp(),
            unread_admin: true // Indicador para que le suene al administrador
        }, { merge: true });
        
    } catch (e) {
        console.error("Fallo al enviar mensaje:", e);
    }
});

// Enviar con "Enter" (Shift+Enter hace salto de línea)
ui.chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ui.chatForm.dispatchEvent(new Event('submit'));
    }
});

// ==========================================
// 4. FUNCIONES UTILITARIAS
// ==========================================
function scrollToBottom() {
    setTimeout(() => {
        ui.messagesArea.scrollTop = ui.messagesArea.scrollHeight;
    }, 100);
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ==========================================
// 🚀 INICIALIZACIÓN DEL SISTEMA
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const spinner = document.getElementById('loading-spinner');
    
    // Quitar cortina oscura general del body
    document.body.classList.add('loaded');

    // Autenticar con PythonAnywhere + Firebase
    const isAuthenticated = await authenticateWithFirebase();
    
    // Apagar spinner
    if (spinner) spinner.classList.add('hidden');

    if (isAuthenticated) {
        listenToChatStatus();
        listenToMessages();
    }
});
