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

// Memoria de Interfaz Inteligente (Para el Atleta)
let activeToast = null; 
let toastTimer = null;  
let isInitialLoad = true; 

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
            // Tic sutil (Para ráfagas de mensajes del admin)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start(audioCtx.currentTime); 
            osc.stop(audioCtx.currentTime + 0.05);
        } else {
            // Burbuja Principal 
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

function updateSidebarBadge(isActive) {
    const pulseBtn = document.querySelector('button[data-url*="pulse.html"]');
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

function removeToast() {
    if (activeToast) {
        activeToast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if(activeToast && activeToast.parentNode) activeToast.remove();
            activeToast = null;
        }, 500);
    }
}

function showSmartRadarToast(text) {
    injectRadarContainer();
    const container = document.getElementById('radar-notifications-container');

    // SI YA HAY UNA TARJETA EN PANTALLA (SMART STACKING)
    if (activeToast) {
        const textElement = activeToast.querySelector('.msg-text');
        const badgeElement = activeToast.querySelector('.msg-counter');
        
        textElement.textContent = text;
        
        let count = parseInt(badgeElement.dataset.count || 1) + 1;
        badgeElement.dataset.count = count;
        badgeElement.textContent = `${count} Msgs`;
        badgeElement.classList.remove('hidden');

        activeToast.classList.add('bg-white/10');
        setTimeout(() => activeToast.classList.remove('bg-white/10'), 200);

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => removeToast(), 6000);
        
        playRadarSound(true); 
    } 
    // SI ES UNA TARJETA NUEVA
    else {
        activeToast = document.createElement('div');
        activeToast.className = 'bg-[#111111]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-start gap-3 pointer-events-auto transform translate-x-[120%] transition-all duration-500 ease-out cursor-pointer hover:bg-white/5';
        
        // Click para Enrutar a Pulse del Atleta
        activeToast.onclick = () => {
            localStorage.setItem('gymen_user_pending_pulse', 'true');
            const pulseNavBtn = document.querySelector('button[data-url*="pulse.html"]');
            if(pulseNavBtn) pulseNavBtn.click();
            removeToast();
        };

        activeToast.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <h4 class="text-xs font-black text-white uppercase tracking-tight truncate pr-2">Soporte Gymenez</h4>
                    <span class="msg-counter hidden px-1.5 py-0.5 rounded bg-sky-500 text-black text-[7px] font-black uppercase tracking-widest shrink-0" data-count="1">1 Msg</span>
                </div>
                <p class="text-[9px] text-sky-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span> Nuevo Mensaje
                </p>
                <p class="msg-text text-[11px] text-gray-400 font-medium truncate">${text}</p>
            </div>
            <button id="radar-close-btn" class="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-all font-sans" onclick="event.stopPropagation(); window.dismissToastManual();">✕</button>
        `;

        // LÓGICA DE GESTOS TÁCTILES (SWIPE TO DISMISS)
        let startX = 0, startY = 0, currentX = 0, currentY = 0;
        
        activeToast.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            activeToast.style.transition = 'none';
        });

        activeToast.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX - startX;
            currentY = e.touches[0].clientY - startY;
            
            // Solo permitir mover hacia la derecha (valores positivos) o hacia arriba (valores negativos)
            let moveX = currentX > 0 ? currentX : 0;
            let moveY = currentY < 0 ? currentY : 0;
            
            if (Math.abs(currentX) > Math.abs(currentY)) {
                activeToast.style.transform = `translateX(${moveX}px)`;
            } else {
                activeToast.style.transform = `translateY(${moveY}px)`;
            }
        });

        activeToast.addEventListener('touchend', () => {
            activeToast.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            if (currentX > 100 || currentY < -60) {
                window.dismissToastManual();
            } else {
                activeToast.style.transform = 'translateX(0)';
            }
            startX = startY = currentX = currentY = 0;
        });

        container.appendChild(activeToast);
        
        requestAnimationFrame(() => activeToast.style.transform = 'translateX(0)');
        toastTimer = setTimeout(() => removeToast(), 6000);
        
        playRadarSound(false); 
    }
}

window.dismissToastManual = function() {
    if (activeToast) {
        activeToast.style.transform = 'translateX(160vw)';
        const textElement = activeToast.querySelector('.msg-text');
        if (textElement) {
            localStorage.setItem('gymen_last_radar_msg', textElement.textContent);
        }
        setTimeout(() => {
            if(activeToast && activeToast.parentNode) activeToast.remove();
            activeToast = null;
        }, 500);
    }
}

// ==========================================
// 📡 EL MOTOR DEL RADAR DEL ATLETA
// ==========================================
async function activateRadar() {
    const token = localStorage.getItem('gymen_token') || localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token'); // Usa el token del atleta
    const sessionStr = localStorage.getItem('userSession');
    if (!token || !sessionStr) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/user/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            const userId = JSON.parse(sessionStr).id || JSON.parse(sessionStr)._id;
            
            // El atleta SOLO escucha su propio documento
            onSnapshot(doc(db, "chats", userId), (docSnap) => {
                if (!docSnap.exists()) return;
                
                const chat = docSnap.data();
                
                // Actualizar la bolita roja en el menú lateral
                updateSidebarBadge(chat.unread_user === true);
                
                if (isInitialLoad) {
                    isInitialLoad = false;
                    return; 
                }

                if (chat.unread_user === true) {
                    // Si el atleta ya tiene la app Pulse abierta, el radar no interfiere
                    const iframe = document.getElementById('os-frame');
                    if (iframe && iframe.contentWindow.location.href.includes('pulse.html')) {
                        return; 
                    }
                    
                    const rawMsg = chat.ultimo_mensaje || "Tienes un nuevo mensaje";
                    const sanitizedMsg = rawMsg.replace("Tú: ", "").trim();

                    // 🛡️ REGLA CONTROLADORA ANTI-DUPLICADOS SILENCIOSA
                    const lastNotifiedMsg = localStorage.getItem('gymen_last_radar_msg');
                    if (sanitizedMsg === lastNotifiedMsg) {
                        return; 
                    }
                    
                    showSmartRadarToast(sanitizedMsg);
                }
            });
        }
    } catch (e) {
        console.warn("Radar del Atleta inactivo. Falla de conexión.");
    }
}

window.addEventListener('DOMContentLoaded', activateRadar);
