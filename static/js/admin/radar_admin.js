import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// Memoria RAM estricta para matar duplicados
let lastNotifiedTimestamps = {}; 
let isInitialLoad = true;

// ==========================================
// 🎵 SINTETIZADOR DE AUDIO TIPO iOS
// ==========================================
function playAdminNotification(isTicket) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        
        if (isTicket) {
            // Tono de Alerta de Soporte (Doble tono rápido)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.1);
        } else {
            // Tono "Note" suave estilo iMessage
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1108, audioCtx.currentTime + 0.1); // C#6
        }

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// ==========================================
// 📱 MOTOR GRÁFICO DE NOTIFICACIONES (DYNAMIC BANNER)
// ==========================================
function injectAdminIOSContainer() {
    if (!document.getElementById('ios-admin-notifications')) {
        const container = document.createElement('div');
        container.id = 'ios-admin-notifications';
        container.className = 'fixed top-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none w-[320px]';
        document.body.appendChild(container);
    }
}

function showAdminIOSNotification(threadId, userName, text, role = 'athlete', isTicket = false) {
    injectAdminIOSContainer();
    const container = document.getElementById('ios-admin-notifications');

    const toast = document.createElement('div');
    
    // Distintivo visual para Partners B2B vs Atletas B2C
    const isPartner = role === 'partner';
    const accentColor = isPartner ? 'text-[#FFC300]' : (isTicket ? 'text-amber-400' : 'text-sky-400');
    const bgAccent = isPartner ? 'bg-[#FFC300]' : (isTicket ? 'bg-amber-500' : 'bg-sky-500');
    let titleText = isTicket ? 'Solicitud de Soporte' : 'Nuevo Mensaje';
    if (isPartner) titleText = 'Soporte Comercial (B2B)';

    toast.className = `pointer-events-auto bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 rounded-[20px] p-4 shadow-2xl flex items-start gap-3 transform translate-x-12 opacity-0 transition-all duration-400 ease-out cursor-pointer hover:bg-[#2c2c2e]/90`;
    
    // Al hacer clic, abre el chat en el Pulse Widget
    toast.onclick = () => {
        // En lugar de ir a otra página, abrimos el widget que ya creamos en dashboard.html
        if (typeof window.openThread === 'function') {
            window.openThread(threadId, userName);
            const widgetWindow = document.getElementById('pulse-window');
            if (widgetWindow && !widgetWindow.classList.contains('open')) {
                widgetWindow.classList.add('open');
            }
        }
        toast.remove();
    };

    toast.innerHTML = `
        <div class="w-10 h-10 rounded-full ${bgAccent}/20 flex items-center justify-center shrink-0 border border-${bgAccent}/30">
            <svg class="w-5 h-5 ${accentColor}" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 5.92 2 10.75c0 2.5 1.35 4.74 3.5 6.27V22l3.85-2.02c.85.22 1.74.33 2.65.33 5.52 0 10-3.92 10-8.75S17.52 2 12 2z"/></svg>
        </div>
        <div class="flex-1 overflow-hidden pt-0.5">
            <div class="flex justify-between items-center mb-0.5">
                <span class="font-bold text-white text-[13px] tracking-tight truncate">${userName}</span>
                <span class="text-[9px] font-bold ${accentColor} uppercase tracking-widest">${titleText}</span>
            </div>
            <p class="text-[11px] text-gray-300 truncate font-medium">${text}</p>
        </div>
    `;

    container.appendChild(toast);

    // Animar entrada fluidamente
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });

    playAdminNotification(isTicket);

    // Auto-cierre con animación de salida
    setTimeout(() => {
        toast.style.transform = 'translateX(12px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}

// ==========================================
// 📡 CEREBRO LÓGICO DEL RADAR OMNICANAL
// ==========================================
async function activateAdminRadar() {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            // 🔥 CAMBIO CLAVE: Ahora escuchamos pulse_threads (Omnicanal)
            onSnapshot(collection(db, "pulse_threads"), (snapshot) => {
                
                if (isInitialLoad) { 
                    isInitialLoad = false; 
                    snapshot.forEach(doc => {
                        const thread = doc.data();
                        lastNotifiedTimestamps[doc.id] = thread.updated_at ? thread.updated_at.toMillis() : 0;
                    });
                    return; 
                }

                snapshot.docChanges().forEach((change) => {
                    if (change.type === "modified" || change.type === "added") {
                        const thread = change.doc.data();
                        const threadId = change.doc.id;
                        
                        const currentMsgTime = thread.updated_at ? thread.updated_at.toMillis() : 0;
                        const savedTime = lastNotifiedTimestamps[threadId] || 0;

                        // 🔒 CANDADO 1: Freno de Duplicados
                        if (currentMsgTime <= savedTime) return; 

                        // 🔒 CANDADO 2: Freno de Auto-Notificación
                        const ultimoMsj = thread.last_message || "";
                        // Si fuiste tú quien respondió, no suenes.
                        if (thread.unread_admin === 0) {
                            lastNotifiedTimestamps[threadId] = currentMsgTime;
                            return; 
                        }

                        // 🔒 CANDADO 3: Freno de Contexto (Búnker)
                        // Preguntamos al Pulse Widget si este chat está abierto ahorita
                        const pulseChatWindow = document.getElementById('pulse-chat-view');
                        const isPulseOpen = pulseChatWindow && !pulseChatWindow.classList.contains('hidden');
                        
                        // NOTA: 'currentActiveThreadId' es una variable global en tu dashboard.html (Pulse Widget)
                        if (isPulseOpen && window.currentActiveThreadId === threadId) {
                            lastNotifiedTimestamps[threadId] = currentMsgTime; 
                            return; 
                        }

                        // Si pasó los 3 candados, ¡Notificar!
                        const isTicketWaiting = thread.status === 'espera';
                        
                        lastNotifiedTimestamps[threadId] = currentMsgTime;
                        const userName = thread.participant_name || 'Usuario';
                        const role = thread.participant_role || 'athlete';
                        
                        showAdminIOSNotification(threadId, userName, ultimoMsj, role, isTicketWaiting);
                    }
                });
            });
        }
    } catch (e) {
        console.warn("Radar Global inactivo.", e);
    }
}

window.addEventListener('DOMContentLoaded', activateAdminRadar);
