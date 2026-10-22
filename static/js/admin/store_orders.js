const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allPartners = [];
let activePartnerId = null;

// ==========================================
// 📢 UTILIDADES UI Y SEGURIDAD
// ==========================================
function getSecureHeaders() {
    const token = localStorage.getItem('gymen_admin_token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl text-[10px] font-bold shadow-2xl z-[9999] transition-all duration-300 pointer-events-none text-center border backdrop-blur-md uppercase tracking-widest ${type === 'success' ? 'bg-emerald-950/95 text-emerald-400 border-emerald-500/30' : 'bg-red-950/95 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

function setupTabs() {
    document.querySelectorAll('.d-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.d-tab-btn').forEach(b => { 
                b.classList.remove('active', 'text-[#FFC300]', 'border-[#FFC300]'); 
                b.classList.add('text-gray-500', 'border-transparent'); 
            });
            document.querySelectorAll('.d-tab-content').forEach(c => { 
                c.classList.remove('block'); 
                c.classList.add('hidden'); 
            });
            btn.classList.remove('text-gray-500', 'border-transparent'); 
            btn.classList.add('active', 'text-[#FFC300]', 'border-[#FFC300]');
            const targetContent = document.getElementById(btn.getAttribute('data-target'));
            if(targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('block');
            }
        });
    });

    document.getElementById('btn-close-dossier')?.addEventListener('click', () => {
        document.getElementById('active-dossier').classList.add('hidden');
        document.getElementById('active-dossier').classList.remove('flex');
        document.getElementById('directory-panel').classList.remove('hidden');
        activePartnerId = null;
        renderList();
    });
}

// ==========================================
// 📡 CORE B2B: FETCH Y RENDERIZADO
// ==========================================
async function fetchPartners() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partners`, { headers: getSecureHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
            allPartners = data.partners;
            renderList();
            
            // Si hay un partner activo, refrescamos su dossier en vivo
            if(activePartnerId) {
                const p = allPartners.find(x => x.id === activePartnerId);
                if(p) loadPartnerDossier(p);
            }
        } else {
            showUIFeedback("Error de autenticación CRM.", "error");
        }
    } catch (e) {
        showUIFeedback("Falla de red al sincronizar B2B.", "error");
    }
}

function renderList() {
    const container = document.getElementById('partners-list');
    const searchVal = document.getElementById('search-input').value.toLowerCase();
    const statusVal = document.getElementById('filter-status').value;

    container.innerHTML = '';

    const filtered = allPartners.filter(p => {
        const matchSearch = p.store_name.toLowerCase().includes(searchVal) || p.email.toLowerCase().includes(searchVal) || p.doc_number.toLowerCase().includes(searchVal);
        let matchStatus = true;
        if (statusVal === 'blocked') matchStatus = p.is_blocked;
        else if (statusVal !== 'ALL') matchStatus = (p.status === statusVal && !p.is_blocked);
        return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-10">Directorio Vacío</div>`;
        return;
    }

    filtered.forEach(p => {
        const isActive = p.id === activePartnerId;
        
        let badgeUI = '';
        if (p.is_blocked) badgeUI = `<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border-red-500/20">Bloqueado</span>`;
        else if (p.status === 'pending_approval') badgeUI = `<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border-amber-500/20">Auditoría</span>`;
        else badgeUI = `<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Activa</span>`;

        const html = `
            <div onclick="window.selectPartner('${p.id}')" class="p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${isActive ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-sm text-white truncate max-w-[160px]">${p.store_name}</h4>
                    ${badgeUI}
                </div>
                <p class="text-[10px] text-gray-400 font-mono truncate">${p.email}</p>
                <p class="text-[10px] text-gray-500 font-bold mt-1 uppercase">${p.doc_type}-${p.doc_number}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ==========================================
// 🔍 DOSSIER 360 DEL PARTNER
// ==========================================
window.selectPartner = function(id) {
    activePartnerId = id;
    const partner = allPartners.find(p => p.id === id);
    if (!partner) return;

    renderList(); // Repintar para marcar el activo

    if(window.innerWidth < 1024) document.getElementById('directory-panel').classList.add('hidden');
    
    document.getElementById('empty-state').classList.add('hidden');
    const dossier = document.getElementById('active-dossier');
    dossier.classList.remove('hidden');
    dossier.classList.add('flex');

    loadPartnerDossier(partner);
    document.querySelector('.d-tab-btn[data-target="d-content-kyc"]').click(); // Forzar tab 1
};

function loadPartnerDossier(p) {
    // 1. Header
    document.getElementById('d-store-name').textContent = p.store_name;
    document.getElementById('d-email').textContent = p.email;
    document.getElementById('d-logo').innerHTML = p.logo_url ? `<img src="${p.logo_url}" class="w-full h-full object-cover">` : '🏢';
    
    // Status Badges
    const statusB = document.getElementById('d-status');
    const actionBox = document.getElementById('kyc-action-box');
    
    if(p.status === 'pending_approval') {
        statusB.textContent = 'Auditoría KYC';
        statusB.className = 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/30';
        actionBox.classList.remove('hidden');
    } else {
        statusB.textContent = p.status === 'active' ? 'ACTIVA' : 'RECHAZADA';
        statusB.className = p.status === 'active' ? 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-gray-500/10 text-gray-400 border border-gray-500/20';
        actionBox.classList.add('hidden');
    }

    const secB = document.getElementById('d-security');
    const secBox = document.getElementById('security-unlock-box');
    if (p.is_blocked) {
        secB.classList.remove('hidden');
        secBox.classList.remove('hidden');
    } else {
        secB.classList.add('hidden');
        secBox.classList.add('hidden');
    }

    // 2. Tab: KYC
    document.getElementById('d-doc-number').textContent = `${p.doc_type}-${p.doc_number}`;
    document.getElementById('d-phone').textContent = p.phone || 'Sin registro';
    
    const setLink = (id, url, defaultText) => {
        const el = document.getElementById(id);
        el.href = url || '#';
        el.style.pointerEvents = url ? 'auto' : 'none';
        el.style.opacity = url ? '1' : '0.5';
    };
    setLink('d-cedula-link', p.cedula_url);
    setLink('d-rif-link', p.rif_url);

    // 3. Tab: Ciberseguridad (Sesiones)
    const sessions = p.active_sessions || [];
    document.getElementById('d-session-count').textContent = `${sessions.length} / 3 Límite`;
    const sList = document.getElementById('d-sessions-list');
    sList.innerHTML = '';
    
    if (sessions.length === 0) {
        sList.innerHTML = '<div class="p-6 bg-black/40 border border-white/5 rounded-xl text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ningún dispositivo conectado</div>';
    } else {
        sessions.forEach(s => {
            sList.insertAdjacentHTML('beforeend', `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 border border-white/5 p-4 rounded-xl">
                    <div>
                        <p class="text-xs font-bold text-white uppercase tracking-wider">${s.device_name || 'Terminal Desconocido'}</p>
                        <p class="text-[9px] text-gray-500 font-mono mt-1">IP: ${s.ip_address || '0.0.0.0'} | Caduca: ${new Date(s.expires_at).toLocaleDateString()}</p>
                    </div>
                    <button onclick="window.killSession('${s.session_id}')" class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-[9px] font-black uppercase rounded-lg transition">Destruir Sesión</button>
                </div>
            `);
        });
    }

    // 4. Tab: Finanzas y Bóveda
    document.getElementById('d-contract-model').textContent = p.commission_model || 'No Firmado';
    
    const wStatus = document.getElementById('d-wallet-status');
    const wBtn = document.getElementById('btn-reset-wallet');
    if (p.has_wallet) {
        wStatus.innerHTML = '<span class="text-emerald-400 font-bold">Bóveda Sellada (Activa)</span>';
        wBtn.classList.remove('hidden');
    } else {
        wStatus.innerHTML = '<span class="text-gray-500">Bóveda sin configurar / Sello roto</span>';
        wBtn.classList.add('hidden');
    }
}

// ==========================================
// 🛡️ ACCIONES DE SEGURIDAD (LLAMADAS API)
// ==========================================
window.executeAudit = async function(action) {
    if(!confirm(`⚖️ AUDITORÍA: ¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} a este comercio para operar en Gymenez?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/audit`, {
            method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ action })
        });
        if(res.ok) { showUIFeedback(`Tienda ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente.`); fetchPartners(); }
        else showUIFeedback("Operación denegada.", "error");
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

window.unlockPartner = async function() {
    if(!confirm("🛡️ PARTNER SHIELD: ¿Deseas levantar el bloqueo de seguridad impuesto a esta tienda?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/unlock`, { method: 'PUT', headers: getSecureHeaders() });
        if(res.ok) { showUIFeedback("Bloqueo de seguridad levantado."); fetchPartners(); }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

window.killSession = async function(sessionId) {
    if(!confirm("⚠️ CIBERSEGURIDAD: ¿Destruir remotamente la sesión? El comercio será desconectado de ese dispositivo de inmediato.")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/session/${sessionId}`, { method: 'DELETE', headers: getSecureHeaders() });
        if(res.ok) { showUIFeedback("Sesión destruida con éxito."); fetchPartners(); }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

window.resetWallet = async function() {
    if(!confirm("💰 FINANZAS: Estás a punto de ROMPER EL SELLO BANCARIO. El partner tendrá que registrar sus datos de cobro de nuevo. ¿Continuar?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/reset-wallet`, { method: 'PUT', headers: getSecureHeaders() });
        if(res.ok) { showUIFeedback("Sello de bóveda roto correctamente."); fetchPartners(); }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

// ==========================================
// 🚀 INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    fetchPartners();

    document.getElementById('search-input')?.addEventListener('input', renderList);
    document.getElementById('filter-status')?.addEventListener('change', renderList);
});
