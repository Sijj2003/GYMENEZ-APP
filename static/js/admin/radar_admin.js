import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, setDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC7ESvLhYTydAn_ZjHVSkebTC-BhvnbzIw",
    authDomain: "gymenezapp.firebaseapp.com",
    projectId: "gymenezapp"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.currentActiveThreadId = null;
let lastNotifiedTimestamps = {}; 
let isInitialLoad = true;
let unsubscribeMessages = null;

// ==========================================
// 🎵 SINTETIZADOR DE AUDIO Y BANNER
// ==========================================
function playAdminNotification(isTicket) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        
        if (isTicket) {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.1);
        } else {
            osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1108, audioCtx.currentTime + 0.1);
        }
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

function showAdminIOSNotification(threadId, userName, text, role = 'athlete', isTicket = false) {
    if (!document.getElementById('ios-admin-notifications')) {
        const cont = document.createElement('div'); cont.id = 'ios-admin-notifications';
        cont.className = 'fixed top-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none w-[320px]';
        document.body.appendChild(cont);
    }
    const container = document.getElementById('ios-admin-notifications');
    const toast = document.createElement('div');
    
    const isPartner = role === 'partner';
    const accentColor = isPartner ? 'text-[#FFC300]' : (isTicket ? 'text-amber-400' : 'text-sky-400');
    const bgAccent = isPartner ? 'bg-[#FFC300]' : (isTicket ? 'bg-amber-500' : 'bg-sky-500');
    const titleText = isPartner ? 'Soporte Comercial (B2B)' : (isTicket ? 'Solicitud de Soporte' : 'Nuevo Mensaje');

    toast.className = `pointer-events-auto bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 rounded-[20px] p-4 shadow-2xl flex items-start gap-3 transform translate-x-12 opacity-0 transition-all duration-400 ease-out cursor-pointer hover:bg-[#2c2c2e]/90`;
    
    toast.onclick = () => {
        if (typeof window.openThread === 'function') window.openThread(threadId, userName);
        const widgetWindow = document.getElementById('pulse-window');
        if (widgetWindow && !widgetWindow.classList.contains('open')) widgetWindow.classList.add('open');
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
    requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; toast.style.opacity = '1'; });
    playAdminNotification(isTicket);
    setTimeout(() => { toast.style.transform = 'translateX(12px)'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 6000);
}

// ==========================================
// 📡 RADAR E INBOX OMNICANAL EN TIEMPO REAL
// ==========================================
async function activateAdminRadar() {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return;

    const API_URL = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') 
        ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

    try {
        const res = await fetch(`${API_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            onSnapshot(collection(db, "pulse_threads"), (snapshot) => {
                const threads = [];
                
                snapshot.forEach(docSnap => {
                    const thread = docSnap.data();
                    thread.thread_id = docSnap.id;
                    threads.push(thread);

                    const currentMsgTime = thread.updated_at ? thread.updated_at.toMillis() : 0;
                    const savedTime = lastNotifiedTimestamps[thread.thread_id] || 0;

                    if (!isInitialLoad && currentMsgTime > savedTime) {
                        if (thread.unread_admin !== 0 && window.currentActiveThreadId !== thread.thread_id) {
                            const userName = thread.participant_name || 'Usuario';
                            const role = thread.participant_role || 'athlete';
                            const isTicketWaiting = thread.status === 'espera';
                            showAdminIOSNotification(thread.thread_id, userName, thread.last_message || "", role, isTicketWaiting);
                        }
                    }
                    lastNotifiedTimestamps[thread.thread_id] = currentMsgTime;
                });

                isInitialLoad = false;
                
                threads.sort((a, b) => {
                    const timeA = a.updated_at ? a.updated_at.toMillis() : 0;
                    const timeB = b.updated_at ? b.updated_at.toMillis() : 0;
                    return timeB - timeA;
                });

                renderInbox(threads);
            });
        }
    } catch (e) {
        document.getElementById('pulse-list-view').innerHTML = `<div class="p-4 text-center text-red-500 text-[10px] font-bold uppercase tracking-widest mt-10">Radar Inactivo</div>`;
    }
}

function renderInbox(threads) {
    const listContainer = document.getElementById('pulse-list-view');
    listContainer.innerHTML = '';

    if (threads.length === 0) {
        listContainer.innerHTML = `<div class="p-4 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-10">Inbox Limpio</div>`;
        return;
    }

    threads.forEach(thread => {
        const isPartner = thread.participant_role === 'partner';
        const isWaiting = thread.status === 'espera';
        const badgeColor = isPartner ? 'bg-[#FFC300] text-black' : 'bg-white/10 text-white';
        const roleLabel = isPartner ? 'B2B Partner' : 'Atleta';
        const unreadDot = thread.unread_admin > 0 ? `<div class="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>` : '';
        const name = thread.participant_name || 'Desconocido';
        const statusIcon = isWaiting ? `<span class="inline-block ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="En espera"></span>` : '';

        const itemHTML = `
            <div onclick="window.openThread('${thread.thread_id}', '${name.replace(/'/g, "\\'")}', '${thread.status || 'inactivo'}')" class="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors cursor-pointer flex gap-3 items-center group">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isPartner ? 'bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20' : 'bg-white/5 text-gray-300 border border-white/10'}">
                    ${name.substring(0, 2).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-0.5">
                        <h4 class="text-xs font-bold text-white truncate pr-2 group-hover:text-[#FFC300] transition-colors">${name} ${statusIcon}</h4>
                        ${unreadDot}
                    </div>
                    <p class="text-[10px] text-gray-500 truncate">${thread.last_message || 'Inició un nuevo ticket...'}</p>
                    <span class="inline-block mt-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${badgeColor}">${roleLabel}</span>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// ==========================================
// 💬 GESTIÓN DE SALA DE CHAT Y TICKET FORZADO
// ==========================================
window.updateChatActions = function(threadId, status) {
    const actionsBar = document.getElementById('pulse-chat-actions');
    const btnAccept = document.getElementById('btn-pulse-accept');
    const btnClose = document.getElementById('btn-pulse-close');
    const chatInput = document.querySelector('.chat-input');
    const chatBtn = document.querySelector('#pulse-form button');

    if (!actionsBar) return;
    actionsBar.classList.remove('hidden');

    btnAccept.onclick = null;
    btnClose.onclick = null;

    if (status === 'espera') {
        btnAccept.classList.remove('hidden'); btnClose.classList.remove('hidden');
        btnAccept.textContent = "Atender Ticket";
        btnAccept.className = "flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm";
        chatInput.disabled = true; chatBtn.disabled = true;
        chatInput.placeholder = "Acepta el ticket para responder...";
    } else if (status === 'activo') {
        btnAccept.classList.add('hidden'); btnClose.classList.remove('hidden');
        chatInput.disabled = false; chatBtn.disabled = false;
        chatInput.placeholder = "Responder al ticket...";
    } else {
        // INACTIVO O CERRADO: Modo Ejecutivo
        actionsBar.classList.remove('hidden');
        btnAccept.classList.remove('hidden'); btnClose.classList.add('hidden');
        btnAccept.textContent = "Abrir Ticket";
        btnAccept.className = "flex-1 py-2 rounded-lg bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20 hover:bg-[#FFC300] hover:text-black text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm";
        chatInput.disabled = true; chatBtn.disabled = true;
        chatInput.placeholder = "Inicia el ticket para escribir...";
    }

    btnAccept.onclick = () => window.changeThreadStatus(threadId, 'activo');
    btnClose.onclick = () => window.changeThreadStatus(threadId, 'cerrado');
};

window.changeThreadStatus = async function(threadId, newStatus) {
    try {
        const threadName = document.querySelector('#pulse-window h3').textContent;
        
        // Usamos setDoc con merge para que funcione incluso si el hilo no existía antes
        await setDoc(doc(db, "pulse_threads", threadId), {
            participant_id: threadId,
            participant_name: threadName,
            status: newStatus, 
            updated_at: serverTimestamp()
        }, { merge: true });
        
        if(newStatus === 'cerrado') {
            await addDoc(collection(db, `pulse_threads/${threadId}/messages`), {
                sender_type: 'system', text: 'Ticket cerrado por el Administrador.', timestamp: serverTimestamp()
            });
        } else if (newStatus === 'activo') {
            await addDoc(collection(db, `pulse_threads/${threadId}/messages`), {
                sender_type: 'system', text: 'Administrador Abrio Ticket de Soporte.', timestamp: serverTimestamp()
            });
        }
    } catch (e) { console.error("Error al cambiar estado:", e); }
};

window.openThread = function(threadId, participantName, status = 'inactivo') {
    window.currentActiveThreadId = threadId;
    
    document.getElementById('pulse-list-view').classList.add('hidden');
    const chatView = document.getElementById('pulse-chat-view');
    chatView.classList.remove('hidden'); chatView.classList.add('flex');
    
    document.querySelector('#pulse-window h3').textContent = participantName;

    const btnContainer = document.querySelector('#pulse-window .flex.items-center.gap-1');
    btnContainer.innerHTML = `
        <button onclick="window.backToInbox()" class="w-7 h-7 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
    `;

    const messagesContainer = document.getElementById('pulse-messages');
    messagesContainer.innerHTML = `<div class="flex justify-center py-10"><div class="w-5 h-5 border-2 border-[#FFC300] border-t-transparent rounded-full animate-spin"></div></div>`;
    
    // Escuchar el documento del hilo para mantener el estado de los botones UI en tiempo real
    if (window.unsubscribeThreadDoc) window.unsubscribeThreadDoc();
    window.unsubscribeThreadDoc = onSnapshot(doc(db, "pulse_threads", threadId), (docSnap) => {
        if(docSnap.exists()) {
            window.updateChatActions(threadId, docSnap.data().status || 'inactivo');
        } else {
            window.updateChatActions(threadId, 'inactivo');
        }
    });

    // Usamos setDoc para no crashear si el doc no existía
    setDoc(doc(db, "pulse_threads", threadId), { unread_admin: 0 }, { merge: true }).catch(e => {});

    if (unsubscribeMessages) unsubscribeMessages();
    const q = query(collection(db, `pulse_threads/${threadId}/messages`), orderBy("timestamp", "asc"));
    
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const msgs = [];
        snapshot.forEach(d => msgs.push(d.data()));
        renderMessages(msgs);
    });
};

function renderMessages(messages) {
    const container = document.getElementById('pulse-messages');
    container.innerHTML = '';

    messages.forEach(msg => {
        // Filtro para Mensajes del Sistema
        if (msg.sender_type === 'system') {
            container.insertAdjacentHTML('beforeend', `<p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center my-4 border-b border-white/5 pb-4">${msg.text}</p>`);
            return;
        }

        const isAdmin = msg.sender_type === 'admin';
        const alignment = isAdmin ? 'justify-end' : 'justify-start';
        const bubbleStyle = isAdmin ? 'bg-[#FFC300] text-black rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm border border-white/5';
        const timeStr = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';

        const msgHTML = `
            <div class="flex w-full ${alignment} mb-3 animate-[fadeIn_0.2s_ease-out]">
                <div class="max-w-[80%] flex flex-col ${isAdmin ? 'items-end' : 'items-start'}">
                    <div class="px-3 py-2 rounded-xl text-[13px] font-medium leading-relaxed ${bubbleStyle}">${msg.text}</div>
                    <span class="text-[8px] text-gray-600 font-bold mt-1 tracking-widest">${timeStr}</span>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', msgHTML);
    });
    container.scrollTop = container.scrollHeight;
}

window.backToInbox = function() {
    window.currentActiveThreadId = null;
    if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
    if (window.unsubscribeThreadDoc) { window.unsubscribeThreadDoc(); window.unsubscribeThreadDoc = null; }
    
    document.getElementById('pulse-chat-view').classList.add('hidden');
    document.getElementById('pulse-chat-view').classList.remove('flex');
    document.getElementById('pulse-list-view').classList.remove('hidden');
    
    document.querySelector('#pulse-window h3').textContent = 'Inbox Soporte';
    document.querySelector('#pulse-window .flex.items-center.gap-1').innerHTML = `
        <button onclick="togglePulseWidget()" class="w-7 h-7 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
    `;
};

window.sendAdminReply = async function() {
    const input = document.querySelector('.chat-input');
    const text = input.value.trim();
    if (!text || !window.currentActiveThreadId) return;

    input.value = '';
    input.focus();

    try {
        await addDoc(collection(db, `pulse_threads/${window.currentActiveThreadId}/messages`), {
            sender_type: 'admin', text: text, timestamp: serverTimestamp()
        });
        
        await setDoc(doc(db, "pulse_threads", window.currentActiveThreadId), {
            last_message: "Tú: " + text, updated_at: serverTimestamp(), unread_client: 1
        }, { merge: true });
    } catch (e) {
        alert("Error al enviar mensaje");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const pulseForm = document.getElementById('pulse-form');
    if (pulseForm) {
        pulseForm.addEventListener('submit', (e) => { e.preventDefault(); window.sendAdminReply(); });
        const sendBtn = pulseForm.querySelector('button');
        if (sendBtn) sendBtn.addEventListener('click', window.sendAdminReply);
    }
    activateAdminRadar();
});
