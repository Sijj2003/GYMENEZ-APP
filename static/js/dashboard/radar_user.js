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
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) { console.warn("Audio bloqueado por falta de interacción previa."); }
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token');
    const sessionStr = localStorage.getItem('userSession');
    if (!token || !sessionStr) return;
    
    const userId = JSON.parse(sessionStr).id || JSON.parse(sessionStr)._id;

    // Inyección de la UI Flotante con CSS Puro para la animación
    const toastHTML = `
    <div id="radar-toast" class="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 p-3 pr-6 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] cursor-pointer hover:bg-[#2c2c2e] transition-all" style="transform: translateX(150vw); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);" onclick="window.location.href='/apps/user/pulse.html'">
        <div class="w-10 h-10 bg-[#FFC300] rounded-full flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,195,0,0.5)]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
        </div>
        <div>
            <h4 class="text-white text-xs font-black uppercase tracking-widest">Soporte Central</h4>
            <p class="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Tienes un Pulse Message</p>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', toastHTML);

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            let lastMsg = "";
            onSnapshot(doc(db, "chats", userId), (docSnap) => {
                const toast = document.getElementById('radar-toast');
                if (!toast) return;
                
                if (docSnap.exists() && docSnap.data().unread_user) {
                    const currentMsg = docSnap.data().ultimo_mensaje;
                    if (currentMsg !== lastMsg) { playDing(); lastMsg = currentMsg; }
                    toast.style.transform = 'translateX(0)'; // Deslizar hacia adentro
                } else {
                    toast.style.transform = 'translateX(150vw)'; // Ocultar
                }
            });
        }
    } catch(e) { console.error("Error de Radar:", e); }
});
