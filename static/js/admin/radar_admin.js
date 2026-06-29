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

function showAdminIOSNotification(userId, userName, text, isTicket = false) {
    injectAdminIOSContainer();
    const container = document.getElementById('ios-admin-notifications');

    const toast = document.createElement('div');
    const accentColor = isTicket ? 'text-amber-400' : 'text-sky-400';
    const bgAccent = isTicket ? 'bg-amber-500' : 'bg-sky-500';
    const titleText = isTicket ? 'Solicitud de Soporte' : 'Nuevo Mensaje';

    toast.className = `pointer-events-auto bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 rounded-[20px] p-4 shadow-2xl flex items-start gap-3 transform translate-x-12 opacity-0 transition-all duration-400 ease-out cursor-pointer hover:bg-[#2c2c2e]/90`;
    
    // Al hacer clic, redirigimos el foco y eliminamos la notificación
    toast.onclick = () => {
        localStorage.setItem('gymen_pending_open_id', userId);
        localStorage.setItem('gymen_pending_open_name', userName);
        const pulseNavBtn = document.querySelector('button[data-url*="pulse.html"]');
        if(pulseNavBtn) pulseNavBtn.click();
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
// 📡 CEREBRO LÓGICO DEL RADAR (FILTROS DE GRADO MILITAR)
// ==========================================
async function activateAdminRadar() {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            onSnapshot(collection(db, "chats"), (snapshot) => {
                
                if (isInitialLoad) { 
                    isInitialLoad = false; 
                    snapshot.forEach(doc => {
                        const chat = doc.data();
                        lastNotifiedTimestamps[doc.id] = chat.actualizado ? chat.actualizado.toMillis() : 0;
                    });
                    return; 
                }

                snapshot.docChanges().forEach((change) => {
                    if (change.type === "modified" || change.type === "added") {
                        const chat = change.doc.data();
                        const userId = change.doc.id;
                        
                        const currentMsgTime = chat.actualizado ? chat.actualizado.toMillis() : 0;
                        const savedTime = lastNotifiedTimestamps[userId] || 0;

                        // 🔒 CANDADO 1: Freno de Duplicados
                        if (currentMsgTime <= savedTime) return; 

                        // 🔒 CANDADO 2: Freno de Auto-Notificación (Ignorar los mensajes enviados por ti)
                        const ultimoMsj = chat.ultimo_mensaje || "";
                        if (ultimoMsj.startsWith("Tú: ")) {
                            lastNotifiedTimestamps[userId] = currentMsgTime; // Lo marcamos como leído en RAM
                            return; // Destruimos el proceso aquí, NO SUENA.
                        }

                        // 🔒 CANDADO 3: Freno de Contexto (Búnker)
                        // Preguntamos al disco duro del navegador si estás actualmente con ESTE atleta.
                        const chatAbiertoEnPantalla = localStorage.getItem('gymen_admin_active_chat_id');
                        if (chatAbiertoEnPantalla === userId) {
                            lastNotifiedTimestamps[userId] = currentMsgTime; // Lo marcamos como leído en RAM
                            return; // Destruimos el proceso aquí, NO SUENA.
                        }

                        // Si pasó los 3 candados, es un mensaje de un cliente que NO estás viendo. ¡Notificar!
                        const isTicketWaiting = chat.estado === 'espera';
                        const isNewMessage = chat.unread_admin === true;

                        if (isNewMessage || isTicketWaiting) {
                            lastNotifiedTimestamps[userId] = currentMsgTime; // Sellar para no repetir
                            const text = ultimoMsj.replace("Tú: ", "").trim();
                            showAdminIOSNotification(userId, chat.atleta_nombre || 'Atleta', text, isTicketWaiting);
                        }
                    }
                });
            });
        }
    } catch (e) {
        console.warn("Radar Global inactivo.");
    }
}

window.addEventListener('DOMContentLoaded', activateAdminRadar);
