const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allTickets = [];
let activeTicketId = null;

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

// ==========================================
// 📡 FETCH Y RENDERIZADO DE TICKETS
// ==========================================
window.fetchTickets = async function() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/treasury/tickets`, { headers: getSecureHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
            allTickets = data.tickets;
            renderList();
            
            // Refrescar el dossier si hay un ticket activo
            if (activeTicketId) {
                const t = allTickets.find(x => x.ticket_id === activeTicketId);
                if (t) loadTicketDossier(t);
            }
        } else {
            showUIFeedback("Error de autenticación Tesorería.", "error");
        }
    } catch (e) {
        showUIFeedback("Falla de red al sincronizar tickets.", "error");
    }
};

function renderList() {
    const container = document.getElementById('tickets-list');
    const searchVal = document.getElementById('search-input').value.toLowerCase();
    const statusVal = document.getElementById('filter-status').value;

    container.innerHTML = '';

    const filtered = allTickets.filter(t => {
        const matchSearch = t.store_name.toLowerCase().includes(searchVal) || t.ticket_id.toLowerCase().includes(searchVal);
        const matchStatus = statusVal === 'ALL' || t.status === statusVal;
        return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-10">Bandeja Vacía</div>`;
        return;
    }

    filtered.forEach(t => {
        const isActive = t.ticket_id === activeTicketId;
        const amountUsd = t.financials?.total_equivalente_usd || 0;
        
        let badgeUI = t.status === 'paid' 
            ? `<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Pagado</span>`
            : `<span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border-amber-500/20">Pendiente</span>`;

        const html = `
            <div onclick="window.selectTicket('${t.ticket_id}')" class="p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${isActive ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-sm text-white truncate max-w-[150px]">${t.store_name}</h4>
                    ${badgeUI}
                </div>
                <div class="flex justify-between items-end mt-1">
                    <p class="text-[10px] text-gray-500 font-mono uppercase">${t.ticket_id}</p>
                    <p class="text-xs font-black text-emerald-400">$${amountUsd.toFixed(2)}</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ==========================================
// 🔍 DOSSIER DEL TICKET Y PAGOS
// ==========================================
window.selectTicket = function(id) {
    activeTicketId = id;
    const ticket = allTickets.find(t => t.ticket_id === id);
    if (!ticket) return;

    renderList();

    if(window.innerWidth < 1024) document.getElementById('directory-panel').classList.add('hidden');
    
    document.getElementById('empty-state').classList.add('hidden');
    const dossier = document.getElementById('active-dossier');
    dossier.classList.remove('hidden');
    dossier.classList.add('flex');

    loadTicketDossier(ticket);
};

function loadTicketDossier(t) {
    // 1. Header
    document.getElementById('t-id').textContent = t.ticket_id;
    document.getElementById('t-store-name').textContent = t.store_name;
    
    const reqDate = new Date(t.requested_at).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' });
    document.getElementById('t-date').textContent = `Solicitado el: ${reqDate}`;

    // 2. Extraer montos y dependencias visuales
    const puroUsd = t.financials?.puro_usd || 0;
    const puroVes = t.financials?.puro_ves || 0;
    const rate = t.financials?.tasa_bcv_cierre || 0;

    // 3. Manejo de Estados y Cajas de Acción
    const statusB = document.getElementById('t-status');
    const actionBox = document.getElementById('payment-action-box');
    const receiptBox = document.getElementById('payment-receipt-box');
    
    const inputUsd = document.getElementById('input-ref-usd');
    const inputVes = document.getElementById('input-ref-ves');

    if (t.status === 'pending_transfer') {
        statusB.textContent = 'Pendiente por Pagar';
        statusB.className = 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/30';
        actionBox.classList.remove('hidden');
        receiptBox.classList.add('hidden');
        
        inputUsd.value = ''; 
        inputVes.value = '';

        // Ocultar/Mostrar cajas de input de referencia dinámicamente
        if (puroUsd > 0) inputUsd.classList.remove('hidden');
        else inputUsd.classList.add('hidden');

        if (puroVes > 0) inputVes.classList.remove('hidden');
        else inputVes.classList.add('hidden');

    } else {
        statusB.textContent = 'Liquidado';
        statusB.className = 'px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
        actionBox.classList.add('hidden');
        receiptBox.classList.remove('hidden');
        
        document.getElementById('t-receipt-ref').textContent = `Ref: ${t.payment_reference || 'N/A'}`;
        const execDate = t.executed_at ? new Date(t.executed_at).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' }) : '--';
        document.getElementById('t-receipt-date').textContent = `Pagado el: ${execDate}`;
    }

    // 4. Inyectar Desglose Matemático
    document.getElementById('t-puro-usd').textContent = `$${puroUsd.toFixed(2)}`;
    
    const vesEl = document.getElementById('t-puro-ves');
    if (puroVes > 0) {
        vesEl.textContent = `Bs. ${puroVes.toFixed(2)}`;
        vesEl.classList.replace('text-gray-600', 'text-white');
    } else {
        vesEl.textContent = `Bs. 0.00`;
        vesEl.classList.replace('text-white', 'text-gray-600');
    }
    
    document.getElementById('t-bcv-ref').textContent = `Tasa BCV Cierre: Bs. ${rate.toFixed(2)}`;
    document.getElementById('t-orders-count').textContent = `${t.orders_count} Entregas procesadas`;

    // 5. Inyectar Datos de Bóveda
    document.getElementById('t-binance').textContent = t.wallet_binance || 'N/A';
    document.getElementById('t-bank-name').textContent = t.wallet_bank_name || 'N/A';
    document.getElementById('t-bank-account').textContent = t.wallet_bank_account || 'N/A';
}

// ==========================================
// 🛡️ ACCIONES DE LIQUIDACIÓN
// ==========================================
window.executePayment = async function() {
    const t = allTickets.find(x => x.ticket_id === activeTicketId);
    if (!t) return;

    const puroUsd = t.financials?.puro_usd || 0;
    const puroVes = t.financials?.puro_ves || 0;

    let refUsd = document.getElementById('input-ref-usd').value.trim();
    let refVes = document.getElementById('input-ref-ves').value.trim();

    // Validar que se ingresen las referencias según las monedas adeudadas
    if (puroUsd > 0 && !refUsd) {
        showUIFeedback("Ingresa la referencia de Binance.", "error");
        return;
    }
    if (puroVes > 0 && !refVes) {
        showUIFeedback("Ingresa la referencia del Banco.", "error");
        return;
    }

    let finalRefs = [];
    if (puroUsd > 0) finalRefs.push(`BIN: ${refUsd}`);
    if (puroVes > 0) finalRefs.push(`VES: ${refVes}`);
    
    const combinedReference = finalRefs.join(' | ');

    if (!confirm("💰 ¿Confirmas que los fondos han sido enviados y deseas sellar este ticket como PAGADO?")) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/b2b/treasury/ticket/${activeTicketId}/pay`, {
            method: 'PUT', headers: getSecureHeaders(), body: JSON.stringify({ payment_reference: combinedReference })
        });
        const data = await res.json();
        
        if (res.ok) {
            showUIFeedback("Liquidación sellada exitosamente.");
            window.fetchTickets();
        } else {
            showUIFeedback(data.error || "Error al procesar el pago.", "error");
        }
    } catch (e) {
        showUIFeedback("Falla de red.", "error");
    }
};

// ==========================================
// 🚀 INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    window.fetchTickets();
    document.getElementById('search-input')?.addEventListener('input', renderList);
    document.getElementById('filter-status')?.addEventListener('change', renderList);
    document.getElementById('btn-close-dossier')?.addEventListener('click', () => {
        document.getElementById('active-dossier').classList.add('hidden');
        document.getElementById('active-dossier').classList.remove('flex');
        document.getElementById('directory-panel').classList.remove('hidden');
        activeTicketId = null;
        renderList();
    });
});
