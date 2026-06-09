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

const ui = {
    overlay: document.getElementById('chat-request-overlay'),
    inputArea: document.getElementById('chat-input-area'),
    statusText: document.getElementById('chat-status-text'),
    btnRequest: document.getElementById('btn-request-support'),
    reqMsg: document.getElementById('request-status-msg'),
    messagesArea: document.getElementById('chat-messages-area'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),
    dotGlow: document.getElementById('status-dot-glow'),
    dotPulse: document.getElementById('status-dot-pulse'),
    orb1: document.getElementById('orb-dynamic-1'),
    orb2: document.getElementById('orb-dynamic-2'),
    loaderRing: document.getElementById('haptic-loading-ring')
};

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
            osc.type = 'sine'; osc.frequency.setValueAtTime(820, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1250, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'receive') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(480, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(950, audioCtx.currentTime + 0.12);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.15);
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
    
    ui.dotGlow.className = "absolute w-2.5 h-2.5 rounded-full transition-all duration-700";
    ui.dotPulse.className = "absolute w-2.5 h-2.5 rounded-full animate-ping opacity-75";
    ui.loaderRing.classList.add('hidden');

    if (currentChatStatus === "inactivo" || currentChatStatus === "cerrado") {
        ui.overlay.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
        ui.inputArea.classList.add('hidden');
        ui.btnRequest.textContent = "Abrir Ticket Seguro";
        ui.btnRequest.disabled = false;
        ui.reqMsg.textContent = currentChatStatus === "cerrado" ? "Tu preparador ha cerrado la sala de asistencia." : "La línea de comunicación está en reposo. Solicita un ticket de acceso.";
        ui.statusText.textContent = "Historial Cerrado";
        
        ui.dotGlow.classList.add('bg-neutral-600'); ui.dotPulse.classList.add('bg-neutral-600');
        ui.orb1.style.backgroundColor = "rgba(56, 189, 248, 0.1)"; 
        ui.orb2.style.backgroundColor = "rgba(38, 38, 38, 0.1)";
        if (badgeText) badgeText.textContent = "Últimos 10 Mensajes (Modo Lectura)";
    } 
    else if (currentChatStatus === "espera") {
        ui.overlay.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
        ui.inputArea.classList.add('hidden');
        ui.btnRequest.textContent = "Ubicando Preparador...";
        ui.btnRequest.disabled = true;
        ui.loaderRing.classList.remove('hidden');
        ui.reqMsg.textContent = "Ticket emitido correctamente en la cola global. Mantén la pantalla abierta.";
        ui.statusText.textContent = "En Cola de Espera";
        
        ui.dotGlow.classList.add('bg-amber-500', 'shadow-[0_0_10px_#f59e0b]'); ui.dotPulse.classList.add('bg-amber-500');
        ui.orb1.style.backgroundColor = "rgba(245, 158, 11, 0.15)"; 
        ui.orb2.style.backgroundColor = "rgba(220, 38, 38, 0.05)";
        if (badgeText) badgeText.textContent = "Historial Limitado (Cola de Espera)";
    } 
    else if (currentChatStatus === "activo") {
        ui.overlay.classList.add('opacity-0', 'pointer-events-none', 'hidden');
        ui.inputArea.classList.remove('hidden');
        ui.statusText.textContent = "Línea Directa Activa";
        
        ui.dotGlow.classList.add('bg-emerald-500', 'shadow-[0_0_10px_#10b981]'); ui.dotPulse.classList.add('bg-emerald-500');
        ui.orb1.style.backgroundColor = "rgba(16, 185, 129, 0.16)"; 
        ui.orb2.style.backgroundColor = "rgba(56, 189, 248, 0.08)";
        if (badgeText) badgeText.textContent = "Pulse Message Conectado";
        scrollToBottom();
        
        setTimeout(() => ui.chatInput.focus(), 400);
    }
}

ui.btnRequest.addEventListener('click', async () => {
    if (!currentUserId) return;
    ui.btnRequest.textContent = "Enviando Solicitud..."; ui.btnRequest.disabled = true;
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
    if (messagesUnsubscribe) messagesUnsubscribe();

    const msgsRef = collection(db, "chats", currentUserId, "mensajes");
    let q = (currentChatStatus === "activo") 
        ? query(msgsRef, orderBy("fecha", "asc"))
        : query(msgsRef, orderBy("fecha", "asc"), limitToLast(10));

    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const area = document.getElementById('chat-messages-area');
        const systemMsg = area.children[0] ? area.children[0].outerHTML : '';
        area.innerHTML = systemMsg;
        
        let currentCount = 0;

        snapshot.forEach((doc) => {
            currentCount++;
            const msg = doc.data();
            const isMe = msg.remitente === "atleta";
            let timeString = msg.fecha ? msg.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            const msgHTML = isMe ? `
                <div class="flex justify-end message-bubble">
                    <div class="max-w-[78%] bg-gradient-to-br from-[#FFC300] to-[#eab308] text-black px-4 py-2.5 rounded-[22px] rounded-br-[6px] shadow-[0_3px_12px_rgba(255,195,0,0.15)] relative">
                        <p class="text-[14px] font-semibold tracking-tight whitespace-pre-wrap leading-snug">${escapeHTML(msg.texto)}</p>
                        <span class="text-[7.5px] text-yellow-950 block text-right mt-1 font-black font-mono tracking-wider opacity-60">${timeString}</span>
                    </div>
                </div>
            ` : `
                <div class="flex justify-start message-bubble">
                    <div class="max-w-[78%] bg-[#18181f]/80 backdrop-blur-xl border border-white/5 text-gray-100 px-4 py-2.5 rounded-[22px] rounded-bl-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                        <p class="text-[14px] font-medium tracking-tight whitespace-pre-wrap leading-snug">${escapeHTML(msg.texto)}</p>
                        <span class="text-[7.5px] text-gray-500 block text-left mt-1 font-bold font-mono tracking-wider">${timeString}</span>
                    </div>
                </div>
            `;
            area.insertAdjacentHTML('beforeend', msgHTML);
        });

        if (currentCount > lastMessageCount && currentChatStatus === "activo") { playUISound('receive'); }
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
        
        playUISound('send');
    } catch (e) { }
});

ui.chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ui.chatForm.dispatchEvent(new Event('submit')); }
});

function scrollToBottom() { 
    setTimeout(() => { 
        ui.messagesArea.scrollTo({
            top: ui.messagesArea.scrollHeight,
            behavior: 'smooth'
        });
    }, 60); 
}

function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }

window.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await authenticateWithFirebase();
    if (isAuthenticated) { 
        listenToChatStatus(); 
        listenToMessages(); 
    }
});
