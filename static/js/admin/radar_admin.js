import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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
let lastNotificationState = ""; 
let targetUserId = null;   // 🔥 Memoria para saber a quién redirigir
let targetUserName = null; // 🔥 Memoria para el nombre

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
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.2);
    } catch(e) {}
}

// Inyección de la UI Flotante optimizada con redirección inteligente al hacer click
const toastHTML = `
<div id="radar-toast-admin" class="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-[#060608]/90 backdrop-blur-2xl border border-sky-500/20 p-3.5 pr-12 rounded-[24px] shadow-[0_20px_50px_rgba(14,165,233,0.15)] transition-all duration-500 select-none touch-none animate-fade-in" style="transform: translateX(160vw); max-width: 340px; width: calc(100vw - 48px);">
    <div id="radar-action-trigger" class="flex items-center gap-3 flex-grow cursor-pointer overflow-hidden">
        <div class="w-10 h-10 bg-gradient-to-tr from-sky-500 to-sky-400 rounded-[16px] flex items-center justify-center text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] shrink-0 animate-pulse">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <div class="overflow-hidden">
            <h4 class="text-white text-[11px] font-black uppercase tracking-widest truncate">Radar Pulse</h4>
            <p class="text-sky-400 text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate" id="radar-admin-text">Alerta de tráfico</p>
        </div>
    </div>
    <button id="radar-admin-close-btn" class="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-all font-sans">✕</button>
</div>`;
document.body.insertAdjacentHTML('beforeend', toastHTML);

let startX = 0, startY = 0, currentX = 0, currentY = 0;
const toastEl = document.getElementById('radar-toast-admin');

// AGREGAR EVENTO DE CLICK REDIRECCIONADOR AL CUERPO DE LA NOTIFICACIÓN
document.getElementById('radar-action-trigger').addEventListener('click', () => {
    // Si ya estamos en la pantalla de pulse, abrimos el chat inmediatamente
    if (window.location.pathname.includes('pulse.html')) {
        if (typeof window.openChatWindow === 'function' && targetUserId) {
            window.openChatWindow(targetUserId, targetUserName);
            toastEl.style.transform = 'translateX(160vw)';
        }
    } else {
        // Si estamos en otra pantalla, redirigimos guardando variables temporales para que pulse.js las abra al cargar
        localStorage.setItem('gymen_pending_open_id', targetUserId);
        localStorage.setItem('gymen_pending_open_name', targetUserName);
        window.location.href = '/apps/admin/pulse.html';
    }
});

toastEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    toastEl.style.transition = 'none';
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
        dismissToastManual();
    } else {
        toastEl.style.transform = 'translateX(0)';
    }
    startX = startY = currentX = currentY = 0;
});

document.getElementById('radar-admin-close-btn').addEventListener('click', dismissToastManual);

function dismissToastManual() {
    toastEl.style.transform = 'translateX(160vw)';
    const currentText = document.getElementById('radar-admin-text').textContent;
    if (currentText) lastNotificationState = currentText; 
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            let unreadCount = 0;
            const q = query(collection(db, "chats"), where("unread_admin", "==", true));
            
            onSnapshot(q, (snapshot) => {
                const toast = document.getElementById('radar-toast-admin');
                if (!toast) return;

                if (!snapshot.empty) {
                    const count = snapshot.size;
                    let stateText = "";
                    
                    // 🌟 EXTRACCIÓN DINÁMICA DE IDENTIDADES EN EL RADAR
                    if (count === 1) {
                        // Si hay un solo chat sin leer, extraemos los datos específicos de ese atleta
                        const recentDoc = snapshot.docs[0];
                        targetUserId = recentDoc.id;
                        targetUserName = recentDoc.data().atleta_nombre || "Atleta";
                        stateText = `${targetUserName} escribió...`;
                    } else {
                        // Si hay varios atletas simultáneos, mostramos un resumen global del tráfico
                        const firstDoc = snapshot.docs[0];
                        targetUserId = firstDoc.id;
                        targetUserName = firstDoc.data().atleta_nombre || "Atleta";
                        stateText = `${count} atletas en espera`;
                    }

                    if (stateText === lastNotificationState) return;

                    if (count > unreadCount) playDing();
                    unreadCount = count;
                    
                    document.getElementById('radar-admin-text').textContent = stateText;
                    toastEl.style.transform = 'translateX(0)';
                } else {
                    unreadCount = 0;
                    toastEl.style.transform = 'translateX(160vw)';
                }
            });
        }
    } catch(e) {}
});
