// ====================================================================
// ⚙️ CONFIGURACIÓN DE NÚCLEO FINANCIERO FISCAL
// ====================================================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let activeTab = 'pending'; 
let pendingPaymentId = null;
let pendingActionStatus = null;
let historyDataMemory = []; 

function showAdminToast(message, type = 'success') {
    const box = document.getElementById('admin-toast');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

// 🛡️ Exponer funciones globalmente para evitar "not defined" en el HTML
window.switchTab = function(tab) {
    activeTab = tab;
    const btnPending = document.getElementById('tab-pending');
    const btnHistory = document.getElementById('tab-history');
    const wsPending = document.getElementById('pending-workspace');
    const wsHistory = document.getElementById('history-workspace');
    const filterPanel = document.getElementById('filter-panel');
    
    if (btnPending && btnHistory) {
        [btnPending, btnHistory].forEach(btn => btn.className = "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg text-gray-500 hover:text-white transition-all");
    }
    
    if (tab === 'pending') {
        if (btnPending) btnPending.className = "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg bg-sky-500 text-black shadow transition-all";
        if (wsHistory) { wsHistory.classList.add('hidden'); wsHistory.classList.remove('flex'); }
        if (filterPanel) { filterPanel.classList.add('hidden'); filterPanel.classList.remove('flex'); }
        fetchPendingPayments();
    } else {
        if (btnHistory) btnHistory.className = "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg bg-white/10 text-white border border-white/20 shadow transition-all";
        if (wsPending) { wsPending.classList.add('hidden'); wsPending.classList.remove('flex'); }
        if (filterPanel) { filterPanel.classList.remove('hidden'); filterPanel.classList.add('flex'); }
        fetchHistoryPayments(); 
    }
};

// ====================================================================
// 📊 BANDEJA DE ENTRADA (PAGOS PENDIENTES)
// ====================================================================
async function fetchPendingPayments() {
    const spinner = document.getElementById('admin-spinner');
    const workspace = document.getElementById('pending-workspace');
    const tbody = document.getElementById('pending-payments-tbody');

    if (spinner) spinner.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
    if (tbody) tbody.innerHTML = '';

    try {
        const token = localStorage.getItem('gymen_admin_token');
        const res = await fetch(`${API_BASE_URL}/api/payments/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            const payments = data.pending_payments || [];
            
            if (tbody) {
                if (payments.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-emerald-500/50 uppercase tracking-widest font-black text-[10px]">Caja al día. Sin operaciones por revisar.</td></tr>`;
                } else {
                    payments.forEach(p => {
                        const tr = document.createElement('tr');
                        let planColor = p.plan === 'ULTRA' ? 'text-[#FFC300]' : 'text-sky-400';
                        const userName = p.atleta_nombre || p.email || 'Atleta';
                        
                        tr.innerHTML = `
                            <td class="p-5 font-mono text-[10px] text-gray-400 whitespace-nowrap">${p.fecha_reporte || 'N/A'}</td>
                            <td class="p-5 text-[11px] font-bold text-white uppercase">${userName}</td>
                            <td class="p-5 font-black uppercase tracking-widest ${planColor} text-[10px]">${p.plan}</td>
                            <td class="p-5 font-mono text-white text-sm tracking-wider font-bold">#${p.referencia}</td>
                            <td class="p-5 text-right font-mono font-black text-emerald-400 text-sm whitespace-nowrap">${Number(p.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs</td>
                            <td class="p-5 text-right whitespace-nowrap">
                                <button onclick="processPayment('${p.id}', 'rechazado')" class="px-4 py-2.5 bg-white/5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition mr-2">Rechazar</button>
                                <button onclick="processPayment('${p.id}', 'aprobado')" class="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition shadow-[0_0_15px_rgba(14,165,233,0.2)]">Aprobar</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }
            if (spinner) spinner.classList.add('hidden');
            if (workspace) { workspace.classList.remove('hidden'); workspace.classList.add('flex'); }
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        if (spinner) spinner.innerHTML = `<p class="text-red-500 font-bold uppercase tracking-widest text-[10px]">Error de red financiera</p>`;
    }
}

// ====================================================================
// 🗃️ AUDITORÍA HISTÓRICA Y FILTROS
// ====================================================================
const filterForm = document.getElementById('filter-form');
if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchHistoryPayments();
    });
}

document.querySelectorAll('#filter-form input').forEach(input => {
    input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') {
            e.preventDefault();
            fetchHistoryPayments();
        }
    });
});

window.clearFilters = function() {
    if (filterForm) filterForm.reset();
    fetchHistoryPayments();
};

async function fetchHistoryPayments() {
    const spinner = document.getElementById('admin-spinner');
    const workspace = document.getElementById('history-workspace');
    const tbody = document.getElementById('history-payments-tbody');

    if (spinner) spinner.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
    if (tbody) tbody.innerHTML = '';

    const params = new URLSearchParams();
    const getValue = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';
    
    const name = getValue('f-name');
    const email = getValue('f-email');
    const ref = getValue('f-ref');
    const date = getValue('f-date');
    const amount = getValue('f-amount');

    if (name) params.append('name', name);
    if (email) params.append('email', email);
    if (ref) params.append('referencia', ref);
    if (date) params.append('fecha', date);
    if (amount) params.append('monto', amount);

    try {
        const token = localStorage.getItem('gymen_admin_token');
        const res = await fetch(`${API_BASE_URL}/api/payments/history?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            historyDataMemory = data.history || [];
            
            if (tbody) {
                if (historyDataMemory.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-500 uppercase tracking-widest font-black text-[10px]">No se encontraron expedientes.</td></tr>`;
                } else {
                    historyDataMemory.forEach((p, index) => {
                        const tr = document.createElement('tr');
                        
                        let statusBadge = '';
                        if (p.status === 'aprobado') statusBadge = `<span class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest">Aprobado</span>`;
                        else if (p.status === 'rechazado') statusBadge = `<span class="px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-black uppercase tracking-widest">Rechazado</span>`;
                        else statusBadge = `<span class="px-2 py-1 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[8px] font-black uppercase tracking-widest">${p.status}</span>`;

                        const userName = p.atleta_nombre || 'Atleta';
                        const emailTrunc = p.email ? p.email.substring(0, 15) + '...' : '';

                        tr.innerHTML = `
                            <td class="p-5">${statusBadge}</td>
                            <td class="p-5 text-[10px]">
                                <span class="font-bold text-white uppercase block">${userName}</span>
                                <span class="font-mono text-gray-500">${emailTrunc}</span>
                            </td>
                            <td class="p-5 font-mono text-white text-[11px] tracking-wider font-bold">#${p.referencia}</td>
                            <td class="p-5 font-mono text-[9px] text-gray-400 whitespace-nowrap">${p.fecha_resolucion || 'N/A'}</td>
                            <td class="p-5 text-right font-mono font-black text-gray-300 text-[11px] whitespace-nowrap">${Number(p.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs</td>
                            <td class="p-5 text-right">
                                <button onclick="showPaymentDetails(${index})" class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition border border-white/10">Ver Detalle</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }

            if (spinner) spinner.classList.add('hidden');
            if (workspace) { workspace.classList.remove('hidden'); workspace.classList.add('flex'); }
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        if (spinner) spinner.innerHTML = `<p class="text-red-500 font-bold uppercase tracking-widest text-[10px]">Fallo buscando historial en servidor</p>`;
    }
}

// ====================================================================
// 👁️ MODAL DE DETALLE FISCAL (APPLE STYLE EXPEDIENTE)
// ====================================================================
window.showPaymentDetails = function(index) {
    const p = historyDataMemory[index];
    if (!p) return;

    const setText = (id, text) => { if(document.getElementById(id)) document.getElementById(id).textContent = text; };

    setText('det-ref', `Ref: #${p.referencia}`);
    setText('det-amount', `${Number(p.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs`);
    
    const statusEl = document.getElementById('det-status');
    if (statusEl) {
        statusEl.textContent = p.status;
        if (p.status === 'aprobado') statusEl.className = "px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest";
        else if (p.status === 'rechazado') statusEl.className = "px-3 py-1 rounded bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-black uppercase tracking-widest";
        else statusEl.className = "px-3 py-1 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30 text-[10px] font-black uppercase tracking-widest";
    }

    setText('det-user', p.atleta_nombre || 'N/A');
    setText('det-email', p.email || '--');
    setText('det-plan', p.plan || '--');
    
    const planEl = document.getElementById('det-plan');
    if (planEl) planEl.className = `text-sm font-black uppercase ${p.plan === 'ULTRA' ? 'text-[#FFC300]' : 'text-sky-400'}`;
    
    setText('det-date-rep', p.fecha_reporte || '--');
    setText('det-date-res', p.fecha_resolucion || '--');
    setText('det-reason', p.admin_reason || 'Dictamen realizado sin justificación escrita registrada.');

    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    
    if (modal && content) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
        }, 50);
    }
};

window.closeDetailModal = function() {
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    
    if (modal && content) {
        modal.classList.add('opacity-0');
        content.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }, 300);
    }
};

// ====================================================================
// 🔐 EJECUCIÓN CON FIRMA TOTP Y MOTIVO (DICTAMEN)
// ====================================================================
window.processPayment = function(paymentId, actionStatus) {
    pendingPaymentId = paymentId;
    pendingActionStatus = actionStatus;
    
    if(document.getElementById('totp-input')) document.getElementById('totp-input').value = '';
    if(document.getElementById('totp-reason')) document.getElementById('totp-reason').value = '';
    
    const modal = document.getElementById('totp-modal');
    const content = document.getElementById('totp-content');
    const title = document.getElementById('totp-title');
    const subtitle = document.getElementById('totp-subtitle');
    const btnVerify = document.getElementById('btn-totp-verify');

    if (title && subtitle && btnVerify) {
        if (actionStatus === 'aprobado') {
            title.className = "text-2xl font-black uppercase tracking-tighter text-sky-400";
            subtitle.textContent = "Autorizando Ingreso a Bóveda";
            subtitle.className = "text-sky-400 text-[10px] font-black tracking-widest uppercase mt-1";
            btnVerify.className = "flex-1 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg";
            btnVerify.textContent = "Firmar Aprobación";
        } else {
            title.className = "text-2xl font-black uppercase tracking-tighter text-red-500";
            subtitle.textContent = "Declinando Transacción";
            subtitle.className = "text-red-500 text-[10px] font-black tracking-widest uppercase mt-1";
            btnVerify.className = "flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg";
            btnVerify.textContent = "Firmar Rechazo";
        }
    }
    
    if (modal && content) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            if(document.getElementById('totp-reason')) document.getElementById('totp-reason').focus();
        }, 50);
    }
};

window.closeTOTPModal = function() {
    const modal = document.getElementById('totp-modal');
    const content = document.getElementById('totp-content');
    const btnVerify = document.getElementById('btn-totp-verify');
    
    if (modal && content) {
        modal.classList.add('opacity-0');
        content.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            pendingPaymentId = null;
            pendingActionStatus = null;
            if (btnVerify) btnVerify.disabled = false;
        }, 300);
    }
};

window.executePaymentVerification = async function() {
    const otpInput = document.getElementById('totp-input');
    const reasonInput = document.getElementById('totp-reason');
    const btn = document.getElementById('btn-totp-verify');
    
    const otpCode = otpInput ? otpInput.value : '';
    const reasonText = reasonInput ? reasonInput.value.trim() : '';
    
    if (!reasonText) {
        showAdminToast("El motivo de resolución es obligatorio para la auditoría.", "error");
        return;
    }

    if (otpCode.length !== 6) {
        showAdminToast("La firma TOTP debe contener 6 dígitos.", "error");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "VERIFICANDO...";
    }

    try {
        const token = localStorage.getItem('gymen_admin_token');
        const payload = {
            payment_id: pendingPaymentId,
            status: pendingActionStatus,
            otp_code: otpCode,
            reason: reasonText 
        };

        const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showAdminToast(`Transacción auditada con éxito.`);
            window.closeTOTPModal();
            fetchPendingPayments();
        } else {
            showAdminToast(data.error || "Firma TOTP rechazada.", "error");
            if (btn) {
                btn.disabled = false;
                btn.textContent = pendingActionStatus === 'aprobado' ? "Firmar Aprobación" : "Firmar Rechazo";
            }
        }
    } catch (e) {
        showAdminToast("Falla conectando al Core Financiero.", "error");
        if (btn) btn.disabled = false;
    }
};

// ====================================================================
// 🚀 INICIALIZACIÓN DE ENTORNO
// ====================================================================
window.addEventListener('DOMContentLoaded', () => {
    // Verificamos que el DOM esté listo antes de llamar a switchTab
    setTimeout(() => { window.switchTab('pending'); }, 50);
    
    const totpInput = document.getElementById('totp-input');
    if (totpInput) {
        totpInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, ''); 
        });
    }

    const refInput = document.getElementById('f-ref');
    if (refInput) {
        refInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, ''); 
        });
    }
});
