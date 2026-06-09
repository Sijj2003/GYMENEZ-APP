import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, query, orderBy, limitToLast, addDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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

let currentUserId = null;
let currentChatStatus = "inactivo"; 
let lastMessageCount = 0;
let messagesUnsubscribe = null;
let ui = {}; // Memoria de selectores perezosos

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
        
        if (type === 'send') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'receive') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.2);
        }
    } catch(e) {}
}

async function authenticateWithFirebase() {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token');
    const sessionStr = localStorage.getItem('userSession');
    if (!token || !sessionStr) { window.location.href = '/apps/start/login.html'; return false; }

    currentUserId = JSON.parse(sessionStr).id || JSON.parse(sessionStr)._id;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            return true;
        }
    } catch (error) { return false; }
}

function listenToChatStatus() {
    onSnapshot(doc(db, "chats", currentUserId), (docSnap) => {
        const oldStatus = currentChatStatus;
        if (docSnap.exists()) {
            currentChatStatus = docSnap.data().estado;
            if (docSnap.data().unread_user) {
                setDoc(doc(db, "chats", currentUserId), { unread_user: false }, { merge: true }).catch(e=>{});
            }
        } else {
            currentChatStatus = "inactivo";
        }
        
        updateUIBasedOnStatus();

        if (oldStatus !== currentChatStatus) {
            listenToMessages();
        }
    });
}

function updateUIBasedOnStatus() {
    const badgeText = document.getElementById('system-badge-text');

    if (currentChatStatus === "inactivo" || currentChatStatus === "cerrado") {
        if (ui.overlay) ui.overlay.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
        if (ui.inputArea) ui.inputArea.classList.add('hidden');
        if (ui.actionBarClosed) ui.actionBarClosed.classList.add('hidden'); // 🔥 Oculto mientras la cortina difuminada está activa
        if (ui.btnRequest) { ui.btnRequest.textContent = "Abrir Ticket Seguro"; ui.btnRequest.disabled = false; }
        if (ui.reqMsg) ui.reqMsg.textContent = currentChatStatus === "cerrado" ? "Tu preparador ha cerrado el ticket de asistencia." : "La línea está cerrada. Solicita un ticket para abrir comunicación.";
        if (ui.statusText) ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 bg-gray-500 rounded-full"></span> Línea en Reposo`;
        if (badgeText) badgeText.textContent = "Últimos 30 Mensajes (Lectura)";
    } 
    else if (currentChatStatus === "espera") {
        if (ui.overlay) ui.overlay.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
        if (ui.inputArea) ui.inputArea.classList.add('hidden');
        if (ui.actionBarClosed) ui.actionBarClosed.classList.add('hidden'); // Oculto en espera
        if (ui.btnRequest) { ui.btnRequest.textContent = "Ubicando Preparador..."; ui.btnRequest.disabled = true; }
        if (ui.reqMsg) ui.reqMsg.textContent = "Ticket emitido. Mantén esta pantalla abierta.";
        if (ui.statusText) ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> En Espera`;
        if (badgeText) badgeText.textContent = "Historial Limitado (Cola de Espera)";
    } 
    else if (currentChatStatus === "activo") {
        if (ui.overlay) ui.overlay.classList.add('opacity-0', 'pointer-events-none', 'hidden');
        if (ui.inputArea) ui.inputArea.classList.remove('hidden');
        if (ui.actionBarClosed) ui.actionBarClosed.classList.add('hidden'); 
        if (ui.statusText) ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Conectado`;
        if (badgeText) badgeText.textContent = "Pulse Message Activo";
        scrollToBottom();
    }
}

function listenToMessages() {
    if (messagesUnsubscribe) messagesUnsubscribe(); 

    const msgsRef = collection(db, "chats", currentUserId, "mensajes");
    let q;

    if (currentChatStatus === "activo") {
        q = query(msgsRef, orderBy("fecha", "asc"));
    } else {
        q = query(msgsRef, orderBy("fecha", "asc"), limitToLast(30)); // 🔥 Ampliado a 30 interacciones
    }

    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        if (!ui.messagesArea) return;

        const systemMsg = ui.messagesArea.children[0] ? ui.messagesArea.children[0].outerHTML : `
            <div class="flex justify-center my-4 shrink-0">
                <span id="system-badge-text" class="px-3 py-1 bg-white/10 backdrop-blur text-white rounded-full text-[9px] font-black tracking-widest uppercase">Pulse Message</span>
            </div>`;
        
        // 🔥 PREVENCIÓN TOTAL DE PARPADEO: Construimos la cadena en memoria ram y modificamos el DOM una sola vez
        let fullHTML = systemMsg;
        let currentCount = 0;

        snapshot.forEach((doc) => {
            currentCount++;
            const msg = doc.data();
            const isMe = msg.remitente === "atleta";
            let timeString = msg.fecha ? msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            const msgHTML = isMe ? `
                <div class="flex justify-end message-bubble">
                    <div class="max-w-[75%] bg-[#FFC300] text-black px-4 py-2 rounded-[20px] rounded-br-[4px] shadow-sm relative">
                        <p class="text-[14px] font-semibold whitespace-pre-wrap leading-tight">${escapeHTML(msg.texto)}</p>
                    </div>
                </div>
            ` : `
                <div class="flex justify-start message-bubble">
                    <div class="max-w-[75%] bg-[#1c1c1e] border border-white/10 text-gray-100 px-4 py-2 rounded-[20px] rounded-bl-[4px] shadow-sm">
                        <p class="text-[14px] font-medium whitespace-pre-wrap leading-tight">${escapeHTML(msg.texto)}</p>
                        <span class="text-[8px] text-gray-500 block text-left mt-1 font-bold">${timeString}</span>
                    </div>
                </div>
            `;
            fullHTML += msgHTML;
        });

        ui.messagesArea.innerHTML = fullHTML;

        if (currentCount > lastMessageCount && currentChatStatus === "activo") { playUISound('receive'); }
        lastMessageCount = currentCount;
        scrollToBottom();
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    // Inicializar selectores del ecosistema de forma segura
    ui = {
        overlay: document.getElementById('chat-request-overlay'),
        inputArea: document.getElementById('chat-input-area'),
        statusText: document.getElementById('chat-status-text'),
        btnRequest: document.getElementById('btn-request-support'),
        reqMsg: document.getElementById('request-status-msg'),
        messagesArea: document.getElementById('chat-messages-area'),
        chatForm: document.getElementById('chat-form'),
        chatInput: document.getElementById('chat-input'),
        actionBarClosed: document.getElementById('chat-action-bar-closed'),
        btnViewHistory: document.getElementById('btn-view-history'),
        btnShowOverlay: document.getElementById('btn-show-overlay')
    };

    const isAuthenticated = await authenticateWithFirebase();
    if (isAuthenticated) { 
        listenToChatStatus(); 
        listenToMessages(); 

        // 🔥 CONTROL COMPUESTO DE COMPUERTAS DE NAVEGACIÓN INTERNA
        if (ui.btnViewHistory) {
            ui.btnViewHistory.addEventListener('click', () => {
                ui.overlay.classList.add('hidden'); // Ocultar cortina
                if (ui.actionBarClosed) ui.actionBarClosed.classList.remove('hidden'); // Mostrar píldora de ticket
                setTimeout(() => { ui.messagesArea.scrollTop = ui.messagesArea.scrollHeight; }, 50);
            });
        }

        if (ui.btnShowOverlay) {
            ui.btnShowOverlay.addEventListener('click', () => {
                ui.overlay.classList.remove('hidden'); // Volver a bloquear con la cortina
                if (ui.actionBarClosed) ui.actionBarClosed.classList.add('hidden'); // Esconder píldora
            });
        }
    }
});

if (ui.chatForm) {
    ui.chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = ui.chatInput.value.trim();
        if (!texto || !currentUserId || currentChatStatus !== "activo") return;

        ui.chatInput.value = ''; ui.chatInput.style.height = 'auto';

        try {
            await addDoc(collection(db, "chats", currentUserId, "mensajes"), {
                texto: texto, remitente: "atleta", fecha: serverTimestamp()
            });
            await setDoc(doc(db, "chats", currentUserId), {
                ultimo_mensaje: texto, actualizado: serverTimestamp(), unread_admin: true
            }, { merge: true });
            
            playUISound('send');
        } catch (e) { }
    });
}

if (ui.chatInput) {
    ui.chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ui.chatForm.dispatchEvent(new Event('submit')); }
    });
}

function scrollToBottom() { setTimeout(() => { if (ui.messagesArea) ui.messagesArea.scrollTop = ui.messagesArea.scrollHeight; }, 50); }
function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }
