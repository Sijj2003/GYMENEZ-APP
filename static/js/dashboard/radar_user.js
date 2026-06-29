import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// CONFIGURACIÓN GLOBAL
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

let audioCtx = null;
// 🔥 El radar ahora recuerda la hora exacta de la última notificación para no repetirla
let lastNotifiedTime = localStorage.getItem('gymen_last_radar_time') || "0"; 
let autoDismissTimer = null;
let isInitialLoad = true;

// ==========================================
// 🎵 SINTETIZADOR DE AUDIO
// ==========================================
function playDing(isUpdate = false) {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        
        if (isUpdate) {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.05);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch(e) {}
}

// ==========================================
// 🔔 INYECCIÓN DE INTERFAZ
// ==========================================
const toastHTML = `
<div id="radar-toast" class="fixed top-6 right-6 z-[9999] flex items-start gap-3 bg-[#111111]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-out select-none touch-none cursor-pointer hover:bg-white/5" style="transform: translateX(160vw); width: 320px; max-width: calc(100vw - 48px);">
    <div onclick="window.location.href='/apps/user/pulse.html'" class="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
    </div>
    <div class="flex-1 min-w-0 pt-0.5" onclick="window.location.href='/apps/user/pulse.html'">
        <div class="flex justify-between items-start">
            <h4 class="text-xs font-black text-white uppercase tracking-tight truncate pr-2">Soporte Gymenez</h4>
            <span id="radar-counter" class="hidden px-1.5 py-0.5 rounded bg-sky-500 text-black text-[7px] font-black uppercase tracking-widest shrink-0" data-count="1">1 Msg</span>
        </div>
        <p class="text-[9px] text-sky-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span> Nuevo Mensaje
        </p>
        <p id="radar-user-preview" class="text-[11px] text-gray-400 font-medium truncate">Cargando...</p>
    </div>
    <button id="radar-close-btn" class="absolute right-3.5 top-4 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-all font-sans z-10">✕</button>
</div>`;

if (!document.getElementById('radar-toast')) { document.body.insertAdjacentHTML('beforeend', toastHTML); }

const toastEl = document.getElementById('radar-toast');
const previewEl = document.getElementById('radar-user-preview');
const counterEl = document.getElementById('radar-counter');

function updateSidebarBadge(isActive) {
    const pulseBtn = document.querySelector('a[href*="pulse.html"]'); // Adaptado al enlace del Atleta
    if (!pulseBtn) return;
    
    let badge = pulseBtn.querySelector('.pulse-badge');
    if (isActive) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'pulse-badge absolute top-3 right-3 flex h-3 w-3';
            badge.innerHTML = `<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>`;
            pulseBtn.appendChild(badge);
        }
    } else {
        if (badge) badge.remove();
    }
}

// ==========================================
// 🖐️ GESTOS Y CERRADO MANUAL
// ==========================================
let startX = 0, startY = 0, currentX = 0, currentY = 0;

toastEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    toastEl.style.transition = 'none';
    clearTimeout(autoDismissTimer); 
});

toastEl.addEventListener('touchmove', (e) => {
    currentX = e.touches[0].clientX - startX; currentY = e.touches[0].clientY - startY;
    let moveX = currentX > 0 ? currentX : 0; let moveY = currentY < 0 ? currentY : 0;
    
    if (Math.abs(currentX) > Math.abs(currentY)) toastEl.style.transform = `translateX(${moveX}px)`;
    else toastEl.style.transform = `translateY(${moveY}px)`;
});

toastEl.addEventListener('touchend', () => {
    toastEl.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    if (currentX > 100 || currentY < -60) window.dismissToastManual();
    else {
        toastEl.style.transform = 'translateX(0)';
        autoDismissTimer = setTimeout(() => { window.dismissToastManual(); }, 6000);
    }
    startX = startY = currentX = currentY = 0;
});

document.getElementById('radar-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    window.dismissToastManual();
});

window.dismissToastManual = function() {
    toastEl.style.transform = 'translateX(160vw)';
}

// ==========================================
// 📡 EL MOTOR DEL RADAR DEL ATLETA
// ==========================================
async function activateRadar() {
    // 🧠 INTELIGENCIA DE CONTEXTO: Si el atleta ya está en la app Pulse, apagamos el radar visual.
    if (window.location.href.includes('pulse.html')) return; 

    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token');
    const sessionStr = localStorage.getItem('userSession');
    if (!token || !sessionStr) return;
    
    const userId = JSON.parse(sessionStr).id || JSON.parse(sessionStr)._id;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            // El atleta SOLO escucha su propio documento
            onSnapshot(doc(db, "chats", userId), (docSnap) => {
                if (!docSnap.exists()) return;
                
                const chat = docSnap.data();
                updateSidebarBadge(chat.unread_user === true);
                
                if (isInitialLoad) { isInitialLoad = false; return; }

                if (chat.unread_user === true) {
                    
                    // 🛡️ REGLA DE TIEMPO EXACTO: Comparamos el timestamp, no el texto.
                    const msgTime = chat.actualizado ? chat.actualizado.toMillis().toString() : "0";
                    if (msgTime === lastNotifiedTime) return; 

                    lastNotifiedTime = msgTime;
                    localStorage.setItem('gymen_last_radar_time', msgTime); // Recordamos en localStorage que este timestamp ya sonó

                    // Preparar Mensaje
                    const rawMsg = chat.ultimo_mensaje || "Nuevo mensaje recibido";
                    const sanitizedMsg = rawMsg.replace("Tú: ", "").trim();
                    previewEl.textContent = sanitizedMsg;

                    // Si ya estaba en pantalla
                    if (toastEl.style.transform === 'translateX(0px)' || toastEl.style.transform === 'translateX(0)') {
                        let count = parseInt(counterEl.dataset.count || 1) + 1;
                        counterEl.dataset.count = count;
                        counterEl.textContent = `${count} Msgs`;
                        counterEl.classList.remove('hidden');

                        toastEl.classList.add('bg-white/10');
                        setTimeout(() => toastEl.classList.remove('bg-white/10'), 200);
                        playDing(true); // Sonido TIC
                    } else {
                        // Si es nuevo
                        counterEl.dataset.count = 1;
                        counterEl.classList.add('hidden');
                        toastEl.style.transform = 'translateX(0)';
                        playDing(false); // Sonido BURBUJA
                    }

                    // Autodesaparición Visual
                    clearTimeout(autoDismissTimer);
                    autoDismissTimer = setTimeout(() => { toastEl.style.transform = 'translateX(160vw)'; }, 8000);
                }
            });
        }
    } catch (e) {
        console.warn("Radar del Atleta inactivo.");
    }
}

window.addEventListener('DOMContentLoaded', activateRadar);
