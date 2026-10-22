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
window.fetchPartners = async function() {
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
        else if (p.status === 'suspended') badgeUI = `<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-gray-500/10 text-gray-400 border-gray-500/30">Suspendida</span>`;
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
    document.querySelector('.d-tab-btn[data-target="d-content-kyc"]')?.click(); // Forzar tab 1
};

function loadPartnerDossier(p) {
    // 1. Header
    document.getElementById('d-store-name').textContent = p.store_name;
    document.getElementById('d-email').textContent = p.email;
    document.getElementById('d-logo').innerHTML = p.logo_url ? `<img src="${p.logo_url}" class="w-full h-full object-cover">` : '🏢';
    
    // Status Badges & Action Box Dinámico
    const statusB = document.getElementById('d-status');
    const actBox = document.getElementById('kyc-action-box');
    const actTitle = document.getElementById('action-box-title');
    const actDesc = document.getElementById('action-box-desc');
    const actBtns = document.getElementById('action-box-buttons');
    
    actBox.className = 'border rounded-xl p-5 mb-6'; // Reset base classes
    actBox.classList.remove('hidden');

    if(p.status === 'pending_approval') {
        statusB.textContent = 'En Auditoría'; statusB.className = 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/30';
        actBox.classList.add('bg-amber-500/10', 'border-amber-500/30');
        actTitle.className = 'text-xs font-black uppercase tracking-widest mb-2 text-amber-500';
        actTitle.textContent = 'Aprobación Pendiente';
        actDesc.textContent = 'Verifica minuciosamente los documentos legales antes de permitir a esta tienda operar en el catálogo global de Gymenez.';
        actBtns.innerHTML = `
            <button onclick="window.executeAudit('approve')" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition shadow-sm">✅ Aprobar Comercio</button>
            <button onclick="window.executeAudit('reject')" class="px-6 py-3 bg-red-600/20 hover:bg-red-500/40 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition">❌ Rechazar</button>
        `;
    } else if (p.status === 'active') {
        statusB.textContent = 'Activa'; statusB.className = 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        actBox.classList.add('bg-emerald-500/5', 'border-emerald-500/20');
        actTitle.className = 'text-xs font-black uppercase tracking-widest mb-2 text-emerald-500';
        actTitle.textContent = 'Tienda Operativa';
        actDesc.textContent = 'Este comercio está activo y visible. Puedes suspenderlo temporalmente si viola políticas comerciales.';
        actBtns.innerHTML = `<button onclick="window.executeAudit('suspend')" class="px-6 py-3 bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 text-orange-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition">⚠️ Suspender Tienda</button>`;
    } else if (p.status === 'suspended') {
        statusB.textContent = 'Suspendida'; statusB.className = 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-gray-500/10 text-gray-400 border border-gray-500/20';
        actBox.classList.add('bg-gray-500/10', 'border-gray-500/30');
        actTitle.className = 'text-xs font-black uppercase tracking-widest mb-2 text-gray-400';
        actTitle.textContent = 'Tienda Suspendida';
        actDesc.textContent = 'La tienda no puede operar actualmente. Puedes reactivarla cuando se solucionen los inconvenientes operacionales.';
        actBtns.innerHTML = `<button onclick="window.executeAudit('reactivate')" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition">✅ Reactivar Tienda</button>`;
    } else {
        statusB.textContent = 'Rechazada'; statusB.className = 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20';
        actBox.classList.add('bg-red-500/5', 'border-red-500/20');
        actTitle.className = 'text-xs font-black uppercase tracking-widest mb-2 text-red-500';
        actTitle.textContent = 'Solicitud Rechazada';
        actDesc.textContent = 'La documentación de esta tienda fue denegada.';
        actBtns.innerHTML = `<button onclick="window.executeAudit('approve')" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition">✅ Reevaluar y Aprobar</button>`;
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

    // 2. Tab: KYC Links
    document.getElementById('d-doc-number').textContent = `${p.doc_type}-${p.doc_number}`;
    document.getElementById('d-phone').textContent = p.phone || 'Sin registro';
    
    const setLink = (id, url) => {
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

    // 4. Tab: Finanzas, Bóveda y Contrato
    document.getElementById('p-contract-model').textContent = p.commission_model || 'No Firmado';
    const btnRevoke = document.getElementById('btn-revoke-contract');
    if(p.commission_model && p.commission_model !== 'No Firmado') {
        btnRevoke.classList.remove('hidden');
    } else {
        btnRevoke.classList.add('hidden');
    }

    const wStatus = document.getElementById('p-wallet-status');
    const wBtn = document.getElementById('btn-reset-wallet');
    if (p.has_wallet) {
        wStatus.innerHTML = '<span class="text-emerald-400 font-bold">Bóveda Sellada (Activa)</span>';
        wBtn.classList.remove('hidden');
    } else {
        wStatus.innerHTML = '<span class="text-gray-500">Bóveda sin configurar / Sello roto</span>';
        wBtn.classList.add('hidden');
    }

    // 📜 RENDERIZAR HISTORIAL DE CONTRATOS REVOCADOS
    const historyList = document.getElementById('p-contract-history-list');
    historyList.innerHTML = '';
    const history = p.contract_history || [];
    
    if(history.length === 0) {
        historyList.innerHTML = '<p class="text-xs text-gray-500 font-bold uppercase tracking-widest text-center py-4">No hay historial legal archivado.</p>';
    } else {
        // Revertimos el array para mostrar los más recientes arriba
        [...history].reverse().forEach(h => {
            const dateStr = new Date(h.revoked_at).toLocaleString('es-VE', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
            }).toUpperCase();
            
            historyList.insertAdjacentHTML('beforeend', `
                <div class="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl">
                    <div>
                        <p class="text-xs font-black text-gray-300 uppercase tracking-widest">${h.model}</p>
                        <p class="text-[9px] text-gray-500 font-mono mt-1">ID Contrato: ${h.contract_id || 'Desconocido'} | Revocado por: ${h.revoked_by || 'Sistema'}</p>
                    </div>
                    <div class="text-right">
                        <span class="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[8px] font-black uppercase tracking-widest">Dado de Baja</span>
                        <p class="text-[9px] text-gray-400 font-mono mt-1.5">${dateStr}</p>
                    </div>
                </div>
            `);
        });
    }
}

// ==========================================
// 🛡️ ACCIONES DE SEGURIDAD Y EDICIÓN (LLAMADAS API)
// ==========================================
window.executeAudit = async function(action) {
    let actionWord = action === 'approve' ? 'APROBAR' : action === 'suspend' ? 'SUSPENDER' : action === 'reactivate' ? 'REACTIVAR' : 'RECHAZAR';
    if(!confirm(`⚖️ AUDITORÍA: ¿Estás seguro de ${actionWord} a este comercio para operar en Gymenez?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/audit`, {
            method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ action })
        });
        if(res.ok) { 
            showUIFeedback(`Operación exitosa.`); 
            fetchPartners(); 
        } else {
            showUIFeedback("Operación denegada.", "error");
        }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

window.revokeContract = async function() {
    if(!confirm("📜 LEGAL: Estás a punto de revocar el contrato B2B actual. El historial se guardará de forma inmutable, pero el partner tendrá que firmar un modelo nuevo. ¿Continuar?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/revoke-contract`, {
            method: 'PUT', headers: getSecureHeaders()
        });
        if(res.ok) { showUIFeedback("Contrato revocado y archivado exitosamente."); window.fetchPartners(); }
    } catch(e) { showUIFeedback("Error de red.", "error"); }
};

window.unlockPartner = async function() {
    if(!confirm("🛡️ PARTNER SHIELD: ¿Deseas levantar el bloqueo de seguridad impuesto a esta tienda?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/unlock`, { method: 'PUT', headers: getSecureHeaders() });
        if(res.ok) { showUIFeedback("Bloqueo de seguridad levantado."); window.fetchPartners(); }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

window.killSession = async function(sessionId) {
    if(!confirm("⚠️ CIBERSEGURIDAD: ¿Destruir remotamente la sesión? El comercio será desconectado de ese dispositivo de inmediato.")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/session/${sessionId}`, { method: 'DELETE', headers: getSecureHeaders() });
        if(res.ok) { showUIFeedback("Sesión destruida con éxito."); window.fetchPartners(); }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

window.resetWallet = async function() {
    if(!confirm("💰 FINANZAS: Estás a punto de ROMPER EL SELLO BANCARIO. El partner tendrá que registrar sus datos de cobro de nuevo. ¿Continuar?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/reset-wallet`, { method: 'PUT', headers: getSecureHeaders() });
        if(res.ok) { showUIFeedback("Sello de bóveda roto correctamente."); window.fetchPartners(); }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

// 📞 Edición de Teléfono
window.editPartnerPhone = async function() {
    const currentPhone = document.getElementById('d-phone').textContent;
    const newPhone = prompt("Ingresa el nuevo número de teléfono para esta tienda:", currentPhone);
    
    if (newPhone === null || newPhone.trim() === "" || newPhone === currentPhone) return;

    if(!confirm(`¿Estás seguro de actualizar el teléfono a ${newPhone}?`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/phone`, {
            method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ phone: newPhone })
        });
        if(res.ok) { 
            showUIFeedback("Teléfono actualizado con éxito."); 
            window.fetchPartners(); 
        } else {
            showUIFeedback("Error al actualizar el teléfono.", "error");
        }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

// 📧 Edición de Correo
window.editPartnerEmail = async function() {
    const currentEmail = document.getElementById('d-email').textContent;
    const newEmail = prompt("Ingresa el nuevo correo electrónico para esta tienda:", currentEmail);
    
    if (newEmail === null || newEmail.trim() === "" || newEmail === currentEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        showUIFeedback("Formato de correo inválido.", "error");
        return;
    }

    if(!confirm(`¿Estás seguro de actualizar el correo a ${newEmail}?`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/partner/${activePartnerId}/email`, {
            method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ email: newEmail })
        });
        if(res.ok) { 
            showUIFeedback("Correo actualizado con éxito."); 
            window.fetchPartners(); 
        } else {
            showUIFeedback("Error al actualizar el correo.", "error");
        }
    } catch(e) { showUIFeedback("Falla de red.", "error"); }
};

// ==========================================
// 🚀 INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    window.fetchPartners();

    document.getElementById('search-input')?.addEventListener('input', renderList);
    document.getElementById('filter-status')?.addEventListener('change', renderList);
});
