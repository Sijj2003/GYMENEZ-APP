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

// Motor de audio en espera (Evita el bloqueo estricto del navegador)
let audioCtx = null;
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
    } catch(e) { console.warn("Audio bloqueado por falta de interacción previa."); }
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return;

    // Inyección de la UI Flotante con CSS Puro para la animación
    const toastHTML = `
    <div id="radar-toast-admin" class="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-[#060608]/95 backdrop-blur-xl border border-sky-500/30 p-3 pr-6 rounded-2xl shadow-[0_10px_40px_rgba(14,165,233,0.2)] cursor-pointer hover:bg-white/5 transition-all" style="transform: translateX(150vw); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);" onclick="window.location.href='/apps/admin/pulse.html'">
        <div class="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] animate-pulse">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <div>
            <h4 class="text-white text-xs font-black uppercase tracking-widest">Radar Pulse</h4>
            <p class="text-sky-400 text-[10px] font-bold uppercase tracking-widest mt-0.5" id="radar-admin-text">Atleta requiere asistencia</p>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', toastHTML);

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
                    if (count > unreadCount) playDing();
                    unreadCount = count;
                    
                    document.getElementById('radar-admin-text').textContent = `${count} atleta(s) a la espera`;
                    toast.style.transform = 'translateX(0)'; // Deslizar hacia adentro
                } else {
                    unreadCount = 0;
                    toast.style.transform = 'translateX(150vw)'; // Ocultar
                }
            });
        }
    } catch(e) { console.error("Error de Radar Admin:", e); }
});
