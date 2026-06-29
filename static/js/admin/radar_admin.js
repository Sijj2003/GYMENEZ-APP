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

// Memoria de Interfaz Inteligente
const activeToasts = {}; // Guarda las tarjetas en pantalla por usuario
const toastTimers = {};  // Guarda los cronómetros de autodestrucción
let isInitialLoad = true; // Para no lanzar sonidos al refrescar la página

// ==========================================
// 🎵 SINTETIZADOR DE AUDIO INTELIGENTE
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playRadarSound(isUpdate = false) {
    try {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (isUpdate) {
            // Tic sutil (Para mensajes agrupados)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start(audioCtx.currentTime); 
            osc.stop(audioCtx.currentTime + 0.05);
        } else {
            // Burbuja Principal (Para primer mensaje)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime); 
            osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch(e) {}
}

// ==========================================
// 🔔 INYECCIÓN Y AGRUPACIÓN DE NOTIFICACIONES
// ==========================================
function injectRadarContainer() {
    if (!document.getElementById('radar-notifications-container')) {
        const container = document.createElement('div');
        container.id = 'radar-notifications-container';
        container.className = 'fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-80 pointer-events-none';
        document.body.appendChild(container);
    }
}

function updateSidebarBadge(count) {
    const pulseBtn = document.querySelector('button[data-url*="pulse.html"]');
    if (!pulseBtn) return;
    
    let badge = pulseBtn.querySelector('.pulse-badge');
    if (count > 0) {
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

function removeToast(userId) {
    const toast = activeToasts[userId];
    if (toast) {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if(toast.parentNode) toast.remove();
            delete activeToasts[userId];
        }, 500);
    }
}

function showSmartRadarToast(userId, userName, text) {
    injectRadarContainer();
    const container = document.getElementById('radar-notifications-container');

    // SI EL USUARIO YA TIENE UNA TARJETA EN PANTALLA (AGRUPACIÓN)
    if (activeToasts[userId]) {
        const toast = activeToasts[userId];
        const textElement = toast.querySelector('.msg-text');
        const badgeElement = toast.querySelector('.msg-counter');
        
        textElement.textContent = text;
        
        // Incrementar el contador visual
        let count = parseInt(badgeElement.dataset.count || 1) + 1;
        badgeElement.dataset.count = count;
        badgeElement.textContent = `${count} Msgs`;
        badgeElement.classList.remove('hidden');

        // Efecto visual sutil de actualización
        toast.classList.add('bg-white/10');
        setTimeout(() => toast.classList.remove('bg-white/10'), 200);

        // Reiniciar el cronómetro de autodestrucción a 6 segundos
        clearTimeout(toastTimers[userId]);
        toastTimers[userId] = setTimeout(() => removeToast(userId), 6000);
        
        playRadarSound(true); // Sonido sutil (Tic)
    } 
    // SI ES UNA TARJETA NUEVA
    else {
        const toast = document.createElement('div');
        toast.className = 'bg-[#111111]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-start gap-3 pointer-events-auto transform translate-x-[120%] transition-all duration-500 ease-out cursor-pointer hover:bg-white/5';
        
        // Click para Enrutar a Pulse
        toast.onclick = () => {
            localStorage.setItem('gymen_pending_open_id', userId);
            localStorage.setItem('gymen_pending_open_name', userName);
            
            const pulseNavBtn = document.querySelector('button[data-url*="pulse.html"]');
            if(pulseNavBtn) pulseNavBtn.click();
            
            removeToast(userId);
        };

        toast.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <h4 class="text-xs font-black text-white uppercase tracking-tight truncate pr-2">${userName}</h4>
                    <span class="msg-counter hidden px-1.5 py-0.5 rounded bg-sky-500 text-black text-[7px] font-black uppercase tracking-widest shrink-0" data-count="1">1 Msg</span>
                </div>
                <p class="text-[9px] text-sky-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span> Requiere Asistencia
                </p>
                <p class="msg-text text-[11px] text-gray-400 font-medium truncate">${text}</p>
            </div>
        `;

        container.appendChild(toast);
        activeToasts[userId] = toast;
        
        // Animar entrada
        requestAnimationFrame(() => toast.style.transform = 'translateX(0)');

        // Iniciar cronómetro de 6 segundos
        toastTimers[userId] = setTimeout(() => removeToast(userId), 6000);
        
        playRadarSound(false); // Sonido Principal (Burbuja)
    }
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
            
            // Escuchar todos los chats para conteo global de no leídos
            onSnapshot(collection(db, "chats"), (snapshot) => {
                let unreadCount = 0;
                
                snapshot.forEach(docSnap => {
                    const chat = docSnap.data();
                    if(chat.unread_admin) unreadCount++;
                });
                
                updateSidebarBadge(unreadCount);
                
                // Si es la carga inicial, detenemos aquí para no sacar 20 toasts de chats viejos
                if (isInitialLoad) {
                    isInitialLoad = false;
                    return; 
                }

                // Detectar los cambios en vivo para mostrar los Toasts
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "modified" || change.type === "added") {
                        const chat = change.doc.data();
                        const userId = change.doc.id;

                        // Si el chat requiere atención (fue modificado por el usuario)
                        if (chat.unread_admin) {
                            // Si el admin ya está dentro de Pulse.js, el radar se hace a un lado
                            const iframe = document.getElementById('os-frame');
                            if (iframe && iframe.contentWindow.location.href.includes('pulse.html')) {
                                return; 
                            }
                            // Mostrar o actualizar tarjeta
                            showSmartRadarToast(userId, chat.atleta_nombre || 'Atleta', chat.ultimo_mensaje);
                        }
                    }
                });
            });
        }
    } catch (e) {
        console.warn("Radar Global inactivo. Falla de conexión.");
    }
}

window.addEventListener('DOMContentLoaded', activateRadar);
