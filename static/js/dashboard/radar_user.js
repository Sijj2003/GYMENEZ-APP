import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

const firebaseConfig = {
  apiKey: "AIzaSyC7ESvLhYTydAn_ZjHVSkebTC-BhvnbzIw",
  authDomain: "gymenezapp.firebaseapp.com",
  projectId: "gymenezapp",
  storageBucket: "gymenezapp.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let audioCtx = null;
let lastNotifiedMsg = localStorage.getItem('gymen_last_radar_msg') || ""; 

function playDing() {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// Inyección de la interfaz táctil Premium con botón de cierre integrado
const toastHTML = `
<div id="radar-toast" class="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-[#0a0a0f]/90 backdrop-blur-2xl border border-white/10 p-3.5 pr-12 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.9)] transition-all duration-500 select-none touch-none" style="transform: translateX(160vw); max-width: 340px; width: calc(100vw - 48px);">
    <div onclick="window.location.href='/apps/user/pulse.html'" class="w-10 h-10 bg-gradient-to-tr from-[#FFC300] to-[#FFD700] rounded-[16px] flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,195,0,0.3)] shrink-0 cursor-pointer">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
    </div>
    <div onclick="window.location.href='/apps/user/pulse.html'" class="flex-grow overflow-hidden cursor-pointer">
        <h4 class="text-white text-[11px] font-black uppercase tracking-widest truncate">Pulse Center</h4>
        <p id="radar-user-preview" class="text-gray-400 text-[10px] font-medium tracking-wide truncate mt-0.5">Mensaje entrante...</p>
    </div>
    <button id="radar-close-btn" class="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-all font-sans">✕</button>
</div>`;
document.body.insertAdjacentHTML('beforeend', toastHTML);

// LÓGICA DE GESTOS TÁCTILES (SWIPE TO DISMISS)
let startX = 0, startY = 0, currentX = 0, currentY = 0;
const toastEl = document.getElementById('radar-toast');

toastEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    toastEl.style.transition = 'none';
});

toastEl.addEventListener('touchmove', (e) => {
    currentX = e.touches[0].clientX - startX;
    currentY = e.touches[0].clientY - startY;
    
    // Solo permitir mover hacia la derecha (valores positivos) o hacia arriba (valores negativos)
    let moveX = currentX > 0 ? currentX : 0;
    let moveY = currentY < 0 ? currentY : 0;
    
    if (Math.abs(currentX) > Math.abs(currentY)) {
        toastEl.style.transform = `translateX(${moveX}px)`;
    } else {
        toastEl.style.transform = `translateY(${moveY}px)`;
    }
});

toastEl.addEventListener('touchend', () => {
    toastEl.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    if (currentX > 100 || currentY < -60) {
        dismissToastManual();
    } else {
        toastEl.style.transform = 'translateX(0)';
    }
    startX = startY = currentX = currentY = 0;
});

document.getElementById('radar-close-btn').addEventListener('click', dismissToastManual);

function dismissToastManual() {
    toastEl.style.transform = 'translateX(160vw)';
    // Al cerrar manualmente, marcamos el último mensaje como "leído localmente" para silenciarlo
    const currentPreview = document.getElementById('radar-user-preview').textContent;
    if (currentPreview) {
        lastNotifiedMsg = currentPreview;
        localStorage.setItem('gymen_last_radar_msg', lastNotifiedMsg);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token');
    const sessionStr = localStorage.getItem('userSession');
    if (!token || !sessionStr) return;
    
    const userId = JSON.parse(sessionStr).id || JSON.parse(sessionStr)._id;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            onSnapshot(doc(db, "chats", userId), (docSnap) => {
                if (docSnap.exists() && docSnap.data().unread_user) {
                    const rawMsg = docSnap.data().ultimo_mensaje || "";
                    const sanitizedMsg = rawMsg.replace("Tú: ", "").trim();

                    // 🛡️ REGLA CONTROLADORA ANTI-DUPLICADOS SILENCIOSA
                    if (sanitizedMsg === lastNotifiedMsg) {
                        return; 
                    }

                    document.getElementById('radar-user-preview').textContent = sanitizedMsg;
                    playDing();
                    toastEl.style.transform = 'translateX(0)';
                } else {
                    toastEl.style.transform = 'translateX(160vw)';
                }
            });
        }
    } catch(e) {}
});
