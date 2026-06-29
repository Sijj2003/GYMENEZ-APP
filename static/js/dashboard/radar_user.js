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
  projectId: "gymenezapp"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let audioCtx = null;
let isInitialLoad = true;

// ==========================================
// 🎵 AUDIO PROFESIONAL
// ==========================================
function playNotificationSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        
        // Sonido suave tipo iPhone "Tri-tone" rápido
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1108, audioCtx.currentTime + 0.1); // C#6
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// ==========================================
// 📱 INYECCIÓN DE UI ESTILO iOS (DYNAMIC BANNER)
// ==========================================
function injectIOSContainer() {
    if (!document.getElementById('ios-notification-container')) {
        const container = document.createElement('div');
        container.id = 'ios-notification-container';
        // Fijo arriba al centro
        container.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[99999] flex flex-col gap-2 pointer-events-none items-center w-full max-w-[95vw] sm:max-w-[400px]';
        document.body.appendChild(container);
    }
}

function showIOSNotification(title, text) {
    injectIOSContainer();
    const container = document.getElementById('ios-notification-container');

    const toast = document.createElement('div');
    // Estilos exactos tipo Notificación de Apple
    toast.className = `pointer-events-auto w-full bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-[24px] p-3.5 shadow-2xl flex items-center gap-3 transform -translate-y-20 opacity-0 transition-all duration-500 ease-out cursor-pointer`;
    
    toast.onclick = () => window.location.href = '/apps/user/pulse.html';

    toast.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-[#FFC300] flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 5.92 2 10.75c0 2.5 1.35 4.74 3.5 6.27V22l3.85-2.02c.85.22 1.74.33 2.65.33 5.52 0 10-3.92 10-8.75S17.52 2 12 2zm0 15.5c-.75 0-1.48-.1-2.2-.28l-2.6 1.36v-2.05C5.45 15.22 4 13.12 4 10.75 4 6.9 7.58 3.75 12 3.75s8 3.15 8 7-3.58 7-8 7z"/></svg>
        </div>
        <div class="flex-1 overflow-hidden">
            <div class="flex justify-between items-center mb-0.5">
                <span class="font-bold text-white text-[13px] tracking-tight">${title}</span>
                <span class="text-[10px] font-medium text-gray-400">Ahora</span>
            </div>
            <p class="text-[12px] text-gray-300 truncate font-medium">${text}</p>
        </div>
    `;

    // Apilar por arriba
    container.prepend(toast);

    // Animar entrada
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });

    playNotificationSound();

    // Auto-cierre
    setTimeout(() => {
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// ==========================================
// 📡 LÓGICA DEL RADAR ATLETA
// ==========================================
async function activateRadar() {
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
                if (!docSnap.exists()) return;
                const chat = docSnap.data();
                
                if (isInitialLoad) { 
                    isInitialLoad = false; 
                    return; 
                }

                // Si el mensaje es para el usuario
                if (chat.unread_user === true) {
                    const msgTime = chat.actualizado ? chat.actualizado.toMillis().toString() : "0";
                    const lastNotifiedTime = localStorage.getItem('gymen_last_radar_time');

                    // Prevenir duplicados matemáticamente
                    if (msgTime === lastNotifiedTime) return; 
                    localStorage.setItem('gymen_last_radar_time', msgTime);

                    // CONTEXT AWARENESS: Si está en el chat, no mostrar popup (ya lo está leyendo)
                    if (window.location.href.includes('pulse.html')) return; 

                    const sanitizedMsg = (chat.ultimo_mensaje || "").replace("Tú: ", "").trim();
                    showIOSNotification("Soporte Gymenez", sanitizedMsg || "Nuevo mensaje recibido");
                }
            });
        }
    } catch (e) { console.warn("Radar del Atleta inactivo."); }
}

window.addEventListener('DOMContentLoaded', activateRadar);
