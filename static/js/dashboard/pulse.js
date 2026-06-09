import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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

// 🎵 SINTETIZADOR DE AUDIO (Bloop suave)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playUISound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'send') { // Pop agudo
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'receive') { // Ding suave
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.2);
    }
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
        currentChatStatus = docSnap.exists() ? docSnap.data().estado : "inactivo";
        updateUIBasedOnStatus();
    });
}

function updateUIBasedOnStatus() {
    if (currentChatStatus === "inactivo" || currentChatStatus === "cerrado") {
        ui.overlay.classList.remove('opacity-0', 'pointer-events-none');
        ui.inputArea.classList.add('hidden');
        ui.btnRequest.textContent = "Abrir Ticket Seguro";
        ui.btnRequest.disabled = false;
        ui.reqMsg.textContent = currentChatStatus === "cerrado" ? "Tu preparador ha cerrado el ticket de asistencia." : "La línea está cerrada. Solicita un ticket para abrir comunicación.";
        ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 bg-gray-500 rounded-full"></span> Desconectado`;
    } 
    else if (currentChatStatus === "espera") {
        ui.overlay.classList.remove('opacity-0', 'pointer-events-none');
        ui.inputArea.classList.add('hidden');
        ui.btnRequest.textContent = "Ubicando Preparador...";
        ui.btnRequest.disabled = true;
        ui.reqMsg.textContent = "Ticket emitido. Mantén esta pantalla abierta.";
        ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> En Espera`;
    } 
    else if (currentChatStatus === "activo") {
        ui.overlay.classList.add('opacity-0', 'pointer-events-none');
        ui.inputArea.classList.remove('hidden');
        ui.statusText.innerHTML = `<span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Conectado`;
        scrollToBottom();
    }
}

ui.btnRequest.addEventListener('click', async () => {
    if (!currentUserId) return;
    ui.btnRequest.textContent = "Procesando..."; ui.btnRequest.disabled = true;
    try {
        const session = JSON.parse(localStorage.getItem('userSession'));
        await setDoc(doc(db, "chats", currentUserId), {
            estado: "espera", actualizado: serverTimestamp(),
            atleta_nombre: `${session.name || ''} ${session.last_name || ''}`.trim(),
            ultimo_mensaje: "🔴 Ticket abierto."
        }, { merge: true });
        playUISound('send');
    } catch (e) { ui.btnRequest.textContent = "Error. Reintentar"; ui.btnRequest.disabled = false; }
});

function listenToMessages() {
    onSnapshot(query(collection(db, "chats", currentUserId, "mensajes"), orderBy("fecha", "asc")), (snapshot) => {
        const systemMsg = Array.from(ui.messagesArea.children)[0].outerHTML;
        ui.messagesArea.innerHTML = systemMsg;
        let currentCount = 0;

        snapshot.forEach((doc) => {
            currentCount++;
            const msg = doc.data();
            const isMe = msg.remitente === "atleta";
            let timeString = msg.fecha ? msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            // 🔥 Burbujas estilo iMessage
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
            ui.messagesArea.insertAdjacentHTML('beforeend', msgHTML);
        });

        if (currentCount > lastMessageCount) { playUISound('receive'); }
        lastMessageCount = currentCount;
        scrollToBottom();
    });
}

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
        
        playUISound('send'); // 🎵 Sonido de envío de iMessage
    } catch (e) { }
});

ui.chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ui.chatForm.dispatchEvent(new Event('submit')); }
});

function scrollToBottom() { setTimeout(() => { ui.messagesArea.scrollTop = ui.messagesArea.scrollHeight; }, 50); }
function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }

window.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await authenticateWithFirebase();
    if (isAuthenticated) { listenToChatStatus(); listenToMessages(); }
});
