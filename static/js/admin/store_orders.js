const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allPartners = [];
let activePartnerId = null;

function getAuthHeaders() {
    const token = localStorage.getItem('gymen_admin_token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function showFeedback(msg, type = 'success') {
    const box = document.getElementById('message-box');
    box.textContent = msg;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

// 1. CARGA INICIAL
async function fetchPartners() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/b2b/partners`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
            allPartners = data.partners;
            updateKPIs();
            renderList();
        }
    } catch (e) {
        showFeedback("Error conectando con el servidor CRM.", "error");
    }
}

function updateKPIs() {
    let pending = 0, active = 0, blocked = 0;
    allPartners.forEach(p => {
        if (p.is_blocked) blocked++;
        if (p.status === 'pending_approval') pending++;
        if (p.status === 'active') active++;
    });
    document.getElementById('kpi-pending').textContent = pending;
    document.getElementById('kpi-active').textContent = active;
    document.getElementById('kpi-blocked').textContent = blocked;
}

// 2. RENDERIZADO DE LISTA
function renderList() {
    const container = document.getElementById('partners-list');
    const searchTerm = document.getElementById('search-partner').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;

    const filtered = allPartners.filter(p => {
        const searchMatch = p.store_name.toLowerCase().includes(searchTerm) || p.email.toLowerCase().includes(searchTerm) || p.doc_number.toLowerCase().includes(searchTerm);
        let statusMatch = true;
        if (statusFilter === 'blocked') statusMatch = p.is_blocked;
        else if (statusFilter !== 'ALL') statusMatch = (p.status === statusFilter && !p.is_blocked);
        return searchMatch && statusMatch;
    });

    container.innerHTML = '';
    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center p-10 text-gray-500 font-bold text-xs uppercase">Sin coincidencias</div>';
        return;
    }

    filtered.forEach(p => {
        const isActive = p.id === activePartnerId;
        let badge = '';
        if (p.is_blocked) badge = '<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border-red-500/20">Bloqueado</span>';
        else if (p.status === 'pending_approval') badge = '<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border-amber-500/20">Auditoría</span>';
        else badge = '<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Activo</span>';

        container.insertAdjacentHTML('beforeend', `
            <div onclick="selectPartner('${p.id}')" class="p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-sm text-white truncate max-w-[150px]">${p.store_name}</h4>
                    ${badge}
                </div>
                <p class="text-[10px] text-gray-400 font-mono truncate">${p.email}</p>
                <p class="text-[10px] text-gray-500 font-bold mt-1 uppercase">${p.doc_type}-${p.doc_number}</p>
            </div>
        `);
    });
}

// 3. SELECCIÓN DE PARTNER (DOSSIER)
window.selectPartner = function(id) {
    activePartnerId = id;
    renderList();
    const p = allPartners.find(x => x.id === id);
    if (!p) return;

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('active-partner').classList.remove('hidden');
    document.getElementById('active-partner').classList.add('flex');

    // Header
    document.getElementById('p-store-name').textContent = p.store_name;
    document.getElementById('p-email').textContent = p.email;
    document.getElementById('p-doc').textContent = `${p.doc_type}-${p.doc_number}`;
    
    const logoHtml = p.logo_url ? `<img src="${p.logo_url}" class="w-full h-full object-cover">` : '🏢';
    document.getElementById('p-logo-container').innerHTML = logoHtml;

    // Badges
    const statusB = document.getElementById('p-status-badge');
    if(p.status === 'pending_approval') {
        statusB.textContent = 'En Auditoría';
        statusB.className = 'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/30';
        document.getElementById('kyc-action-box').classList.remove('hidden');
    } else {
        statusB.textContent = p.status === 'active' ? 'Activo' : 'Rechazado';
        statusB.className = p.status === 'active' ? 'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-gray-500/10 text-gray-500 border border-gray-500/30';
        document.getElementById('kyc-action-box').classList.add('hidden');
    }

    const secB = document.getElementById('p-security-badge');
    const unlockBox = document.getElementById('security-unlock-box');
    if (p.is_blocked) {
        secB.classList.remove('hidden');
        unlockBox.classList.remove('hidden');
    } else {
        secB.classList.add('hidden');
        unlockBox.classList.add('hidden');
    }

    // KYC Links
    document.getElementById('p-cedula-link').href = p.cedula_url || '#';
    document.getElementById('p-cedula-link').textContent = p.cedula_url ? 'Ver Documento ↗' : 'No Disponible';
    document.getElementById('p-rif-link').href = p.rif_url || '#';
    document.getElementById('p-rif-link').textContent = p.rif_url ? 'Ver RIF ↗' : 'No Disponible';

    // Sesiones
    document.getElementById('p-session-count').textContent = p.active_sessions.length;
    const sList = document.getElementById('p-sessions-list');
    sList.innerHTML = '';
    if (p.active_sessions.length === 0) {
        sList.innerHTML = '<p class="text-xs text-gray-500">Ningún dispositivo conectado.</p>';
    } else {
        p.active_sessions.forEach(s => {
            sList.insertAdjacentHTML('beforeend', `
                <div class="flex justify-between items-center bg-black/40 border border-white/5 p-3 rounded-lg">
                    <div>
                        <p class="text-xs font-bold text-white">${s.device_name || 'Dispositivo'}</p>
                        <p class="text-[9px] text-gray-500 font-mono mt-0.5">IP: ${s.ip_address} | Expira: ${new Date(s.expires_at).toLocaleDateString()}</p>
                    </div>
                    <button onclick="killSession('${s.session_id}')" class="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-500 text-[9px] font-black uppercase rounded border border-red-500/30 transition">Matar Sesión</button>
                </div>
            `);
        });
    }

    // Finanzas
    document.getElementById('p-contract-model').textContent = p.commission_model || 'No Firmado';
    const wStatus = document.getElementById('p-wallet-status');
    const wBtn = document.getElementById('btn-reset-wallet');
    
    if (p.has_wallet) {
        wStatus.innerHTML = '<span class="text-emerald-400 font-bold">Sellada (Activa)</span>';
        wBtn.classList.remove('hidden');
    } else {
        wStatus.innerHTML = '<span class="text-gray-500">Sin configurar / Abierta</span>';
        wBtn.classList.add('hidden');
    }

    // Volver al tab 1
    document.querySelector('.p-tab-btn[data-target="p-tab-kyc"]').click();
};

// 4. ACCIONES DE SEGURIDAD Y CONTROL
window.executeAudit = async function(action) {
    if(!confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} este comercio?`)) return;
    try {
        const res = await fetch(`${API_BASE}/api/admin/b2b/partner/${activePartnerId}/audit`, {
            method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ action })
        });
        if(res.ok) { showFeedback("Auditoría procesada."); fetchPartners(); }
        else showFeedback("Fallo en la auditoría.", "error");
    } catch(e) { showFeedback("Error de red.", "error"); }
};

window.unlockPartner = async function() {
    if(!confirm("¿Levantar bloqueo de seguridad por fuerza bruta?")) return;
    try {
        const res = await fetch(`${API_BASE}/api/admin/b2b/partner/${activePartnerId}/unlock`, {
            method: 'PUT', headers: getAuthHeaders()
        });
        if(res.ok) { showFeedback("Cuenta desbloqueada."); fetchPartners(); }
    } catch(e) { showFeedback("Error de red.", "error"); }
};

window.killSession = async function(sessionId) {
    if(!confirm("¿Destruir remotamente esta sesión? El partner será expulsado del dispositivo.")) return;
    try {
        const res = await fetch(`${API_BASE}/api/admin/b2b/partner/${activePartnerId}/session/${sessionId}`, {
            method: 'DELETE', headers: getAuthHeaders()
        });
        if(res.ok) { showFeedback("Sesión destruida exitosamente."); fetchPartners(); }
    } catch(e) { showFeedback("Error de red.", "error"); }
};

window.resetWallet = async function() {
    if(!confirm("⚠️ PELIGRO: Esto romperá el sello de la bóveda bancaria. El partner tendrá que ingresar sus datos de cobro de nuevo. ¿Continuar?")) return;
    try {
        const res = await fetch(`${API_BASE}/api/admin/b2b/partner/${activePartnerId}/reset-wallet`, {
            method: 'PUT', headers: getAuthHeaders()
        });
        if(res.ok) { showFeedback("Sello de bóveda roto."); fetchPartners(); }
    } catch(e) { showFeedback("Error de red.", "error"); }
};

// Tabs Logic & Listeners
document.querySelectorAll('.p-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.p-tab-btn').forEach(b => { b.classList.remove('active', 'text-[#FFC300]', 'border-[#FFC300]'); b.classList.add('text-gray-500', 'border-transparent'); });
        document.querySelectorAll('.p-tab-content').forEach(c => { c.classList.remove('block'); c.classList.add('hidden'); });
        btn.classList.remove('text-gray-500', 'border-transparent'); btn.classList.add('active', 'text-[#FFC300]', 'border-[#FFC300]');
        document.getElementById(btn.getAttribute('data-target')).classList.remove('hidden');
        document.getElementById(btn.getAttribute('data-target')).classList.add('block');
    });
});

document.getElementById('search-partner').addEventListener('input', renderList);
document.getElementById('filter-status').addEventListener('change', renderList);
document.getElementById('btn-close-partner')?.addEventListener('click', () => {
    document.getElementById('active-partner').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    activePartnerId = null;
    renderList();
});

// INIT
fetchPartners();
