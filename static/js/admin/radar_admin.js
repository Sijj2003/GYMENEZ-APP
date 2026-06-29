import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// Memoria Anti-Spam (Evita notificar repetidas veces en un lapso corto)
const cooldownMemory = new Set();
const COOLDOWN_TIME_MS = 60000; // 1 minuto de silencio por usuario tras la primera alerta

// ==========================================
// 🎵 SINTETIZADOR DE AUDIO GLOBAL
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playRadarSound() {
    try {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Sonido estilo "Pop/Burbuja" elegante
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        osc.start(audioCtx.currentTime); 
        osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// ==========================================
// 🔔 INYECCIÓN DE LA INTERFAZ DE NOTIFICACIÓN
// ==========================================
function injectRadarContainer() {
    if (!document.getElementById('radar-notifications-container')) {
        const container = document.createElement('div');
        container.id = 'radar-notifications-container';
        container.className = 'fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-80 pointer-events-none';
        document.body.appendChild(container);
    }
}

function showRadarToast(userId, userName, text) {
    injectRadarContainer();
    const container = document.getElementById('radar-notifications-container');

    const toast = document.createElement('div');
    toast.className = 'bg-[#111111]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-start gap-3 pointer-events-auto transform translate-x-[120%] transition-transform duration-500 ease-out cursor-pointer hover:bg-white/5';
    
    // Al hacer clic, navega a Pulse
    toast.onclick = () => {
        localStorage.setItem('gymen_pending_open_id', userId);
        localStorage.setItem('gymen_pending_open_name', userName);
        
        // Disparar click en el botón de la barra lateral del Dashboard
        const pulseNavBtn = document.querySelector('button[data-url*="pulse.html"]');
        if(pulseNavBtn) pulseNavBtn.click();
        
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 500);
    };

    toast.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
        </div>
        <div class="flex-1 min-w-0">
            <h4 class="text-xs font-black text-white uppercase tracking-tight truncate">${userName}</h4>
            <p class="text-[10px] text-sky-400 font-bold uppercase tracking-widest mb-1">Nuevo Mensaje</p>
            <p class="text-[11px] text-gray-400 font-medium truncate">${text}</p>
        </div>
    `;

    container.appendChild(toast);
    
    // Animar entrada
    requestAnimationFrame(() => toast.style.transform = 'translateX(0)');

    // Remover a los 5 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// ==========================================
// 📡 EL MOTOR DEL RADAR
// ==========================================
async function activateRadar() {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            // Escuchar SOLO los chats donde unread_admin es TRUE
            const q = query(collection(db, "chats"), where("unread_admin", "==", true));
            
            onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added" || change.type === "modified") {
                        const chat = change.doc.data();
                        const userId = change.doc.id;

                        // 1. Context-Aware: Verificar si la app Pulse ya está abierta en el Dashboard
                        const iframe = document.getElementById('os-frame');
                        if (iframe && iframe.contentWindow.location.href.includes('pulse.html')) {
                            return; // Se aborta. Pulse.js manejará su propio sonido.
                        }

                        // 2. Anti-Spam: Verificar si está en Cooldown
                        if (cooldownMemory.has(userId)) return;

                        // 3. Activar Alerta
                        cooldownMemory.add(userId);
                        playRadarSound();
                        showRadarToast(userId, chat.atleta_nombre || 'Atleta', chat.ultimo_mensaje);

                        // Limpiar memoria tras 1 minuto
                        setTimeout(() => cooldownMemory.delete(userId), COOLDOWN_TIME_MS);
                    }
                });
            });
        }
    } catch (e) {
        console.warn("Radar Global inactivo. Falla de conexión.");
    }
}

window.addEventListener('DOMContentLoaded', activateRadar);
