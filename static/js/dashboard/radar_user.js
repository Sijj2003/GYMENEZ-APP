import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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
let lastNotifiedMsg = localStorage.getItem('gymen_last_radar_msg') || ""; 
let autoDismissTimer = null;

// ==========================================
// 🎵 SINTETIZADOR DE AUDIO MODERNO
// ==========================================
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
        
        // Sonido de burbuja premium
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// ==========================================
// 🔔 INYECCIÓN DE INTERFAZ Y ESTILOS
// ==========================================
const toastHTML = `
<div id="radar-toast" class="fixed top-6 right-6 z-[9999] flex items-start gap-3 bg-[#111111]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-out select-none touch-none cursor-pointer hover:bg-white/5" style="transform: translateX(160vw); width: 320px; max-width: calc(100vw - 48px);">
    <div onclick="window.location.href='/apps/user/pulse.html'" class="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
    </div>
    <div class="flex-1 min-w-0 pt-0.5" onclick="window.location.href='/apps/user/pulse.html'">
        <div class="flex justify-between items-start">
            <h4 class="text-xs font-black text-white uppercase tracking-tight truncate pr-2">Soporte Gymenez</h4>
        </div>
        <p class="text-[9px] text-sky-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span> Nuevo Mensaje
        </p>
        <p id="radar-user-preview" class="text-[11px] text-gray-400 font-medium truncate">Cargando...</p>
    </div>
    <button id="radar-close-btn" class="absolute right-3.5 top-4 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-all font-sans z-10">✕</button>
</div>`;

// Evitar duplicados si el script se carga dos veces
if (!document.getElementById('radar-toast')) {
    document.body.insertAdjacentHTML('beforeend', toastHTML);
}

const toastEl = document.getElementById('radar-toast');

// ==========================================
// 🖐️ LÓGICA DE GESTOS TÁCTILES (SWIPE TO DISMISS)
// ==========================================
let startX = 0, startY = 0, currentX = 0, currentY = 0;

toastEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    toastEl.style.transition = 'none';
    clearTimeout(autoDismissTimer); // Pausar autodestrucción si el usuario lo está tocando
});

toastEl.addEventListener('touchmove', (e) => {
    currentX = e.touches[0].clientX - startX;
    currentY = e.touches[0].clientY - startY;
    
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
        window.dismissToastManual();
    } else {
        toastEl.style.transform = 'translateX(0)';
        // Reactivar autodestrucción si lo soltó y no se cerró
        autoDismissTimer = setTimeout(() => { window.dismissToastManual(false); }, 6000);
    }
    startX = startY = currentX = currentY = 0;
});

// ==========================================
// ❌ CERRADO MANUAL E INTELIGENCIA DE MEMORIA
// ==========================================
document.getElementById('radar-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    window.dismissToastManual(true);
});

// Función global para cerrar el toast. 
// "isManualDismiss" determina si debemos silenciar el mensaje permanentemente
window.dismissToastManual = function(isManualDismiss = true) {
    toastEl.style.transform = 'translateX(160vw)';
    
    // Si el usuario lo cerró a propósito (con X o Swipe), lo guardamos para que no vuelva a sonar en otras páginas
    if (isManualDismiss) {
        const currentPreview = document.getElementById('radar-user-preview').textContent;
        if (currentPreview) {
            lastNotifiedMsg = currentPreview;
            localStorage.setItem('gymen_last_radar_msg', lastNotifiedMsg);
        }
    }
}

// ==========================================
// 📡 CONEXIÓN Y ESCUCHA DE FIRESTORE
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    // 1. INTELIGENCIA DE CONTEXTO: Si el atleta ya está en la app Pulse, apagamos el radar
    if (window.location.href.includes('pulse.html')) {
        return; 
    }

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

                    // 🛡️ REGLA CONTROLADORA ANTI-DUPLICADOS (El mensaje ya fue silenciado por el usuario)
                    if (sanitizedMsg === lastNotifiedMsg) {
                        return; 
                    }

                    // Actualizar UI
                    document.getElementById('radar-user-preview').textContent = sanitizedMsg;
                    toastEl.style.transform = 'translateX(0)';
                    
                    // Efecto visual de actualización si el toast ya estaba en pantalla
                    toastEl.classList.add('bg-white/10');
                    setTimeout(() => toastEl.classList.remove('bg-white/10'), 200);

                    playDing();

                    // Autodestrucción visual en 8 segundos (pero no silencia el mensaje permanentemente)
                    clearTimeout(autoDismissTimer);
                    autoDismissTimer = setTimeout(() => {
                        toastEl.style.transform = 'translateX(160vw)';
                    }, 8000);

                } else {
                    toastEl.style.transform = 'translateX(160vw)';
                }
            });
        }
    } catch(e) {}
});
