// ====================================================================
// 💰 MOTOR DE FINANZAS Y LIQUIDACIONES B2B (ZERO-TRUST BIMONETARIO)
// ====================================================================

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymenez_partner_token';

let currentLiquidableUsdEquiv = 0; 
let isProcessingPayout = false;
let currentFinancialData = null; // 🍎 NUEVO: Guardamos el snapshot para el modal

document.addEventListener('DOMContentLoaded', () => {
    fetchFinancialData();
});

async function fetchFinancialData() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/finances`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            currentFinancialData = data.snapshot; // 🍎 NUEVO
            updateFinancialUI(data.snapshot);
            renderTransactions(data.snapshot.transactions);
        } else {
            console.error("Error del servidor:", data.error);
        }
    } catch (error) {
        console.error("Error de red al obtener finanzas:", error);
    }
}

// 🛡️ REGLA B2B: Jueves 7:00 AM a Viernes 11:59 AM
function isPayoutWindowOpen() {
    const now = new Date();
    // Ajuste simple para zona horaria local. 
    // day: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
    const day = now.getDay(); 
    const hour = now.getHours();

    if (day === 4 && hour >= 7) return true; // Jueves desde las 7:00 AM hasta las 23:59
    if (day === 5 && hour < 12) return true; // Viernes desde las 00:00 hasta las 11:59 AM
    
    return false;
}

// Utilidad para cambiar estilos del botón rápidamente
function setButtonState(btn, enabled, text, colorClasses) {
    btn.disabled = !enabled;
    btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> ${text}`;
    btn.className = `${colorClasses} border px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all w-full md:w-auto text-center flex items-center justify-center gap-2 ${!enabled ? 'cursor-not-allowed' : 'cursor-pointer shadow-lg hover:scale-[1.02]'}`;
}

function updateFinancialUI(snapshot) {
    currentLiquidableUsdEquiv = snapshot.total_disponible_equivalente_usd;
    animateValue("balance-available", 0, currentLiquidableUsdEquiv, 1200);
    
    const escrowEqUsd = snapshot.escrow_puro_usd + (snapshot.tasa_bcv_hoy > 0 ? (snapshot.escrow_puro_ves / snapshot.tasa_bcv_hoy) : 0);
    animateValue("balance-escrow", 0, escrowEqUsd, 1200);

    const availableSubtitle = document.getElementById('breakdown-available');
    if (availableSubtitle) {
        availableSubtitle.innerHTML = `$${snapshot.disponible_puro_usd.toFixed(2)} USD + Bs. ${snapshot.disponible_puro_ves.toFixed(2)} (Tasa BCV: ${snapshot.tasa_bcv_hoy})`;
    }
    
    const escrowSubtitle = document.getElementById('breakdown-escrow');
    if (escrowSubtitle) {
        escrowSubtitle.innerHTML = `$${snapshot.escrow_puro_usd.toFixed(2)} USD + Bs. ${snapshot.escrow_puro_ves.toFixed(2)}`;
    }

    const btnPayout = document.getElementById('btn-request-payout');
    if (!btnPayout) return;

    // 🛡️ VALIDACIÓN ESTRICTA: Ventana de tiempo y Límite de 1 por semana
    const windowOpen = isPayoutWindowOpen();
    const hasActiveTicket = snapshot.transactions.some(tx => tx.status === 'payout_requested' || tx.status === 'ticket_pending');

    if (hasActiveTicket) {
        setButtonState(btnPayout, false, 'Liquidación en Proceso', 'bg-white/5 text-blue-400 border-blue-500/30');
    } 
    else if (!windowOpen) {
        setButtonState(btnPayout, false, 'Abre Jueves 7:00 AM', 'bg-white/5 text-gray-500 border-white/10');
    } 
    else if (currentLiquidableUsdEquiv <= 0) {
        setButtonState(btnPayout, false, 'Sin Fondos Disponibles', 'bg-white/5 text-gray-500 border-white/10');
    } 
    else if (!isProcessingPayout) {
        setButtonState(btnPayout, true, 'Solicitar Retiro', 'bg-[#FFC300] text-black border-[#FFC300] hover:bg-[#e6b000]');
    }
}

function renderTransactions(transactions) {
    const list = document.getElementById('transactions-list');
    const emptyState = document.getElementById('finance-empty-state');
    
    if (!transactions || transactions.length === 0) {
        emptyState.classList.remove('hidden');
        if (list) list.innerHTML = '';
        return;
    }
    
    emptyState.classList.add('hidden');
    list.innerHTML = '';

    transactions.forEach(tx => {
        let d = new Date(tx.created_at);
        let dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        
        let badge = '';
        let icon = '';
        let textStyle = 'text-white';
        let actionBtn = '';
        let amountText = '';

        if (tx.type === 'ticket') {
            // RENDEREZADO DE TICKET DE LIQUIDACIÓN
            const usdTotal = tx.financials?.total_equivalente_usd || 0;
            amountText = `-$${usdTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            if (tx.status === 'ticket_paid') {
                badge = `<span class="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Pagado</span>`;
                icon = `<div class="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </div>`;
                actionBtn = `<button onclick="openReceiptModal('${tx.id}')" class="mt-2 text-[9px] font-black uppercase tracking-widest text-[#FFC300] hover:text-white flex items-center justify-end gap-1 w-full transition">Ver Recibo <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>`;
            } else {
                badge = `<span class="text-[9px] font-black uppercase tracking-widest text-blue-400">En Proceso</span>`;
                icon = `<div class="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>`;
            }
        } else {
            // RENDERIZADO DE ORDEN INDIVIDUAL
            const total = parseFloat(tx.net_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            amountText = `+$${total}`;

            if (tx.status === 'liquidated') {
                badge = `<span class="text-[9px] font-black uppercase tracking-widest text-emerald-500/50">Liquidada</span>`;
                icon = `<div class="w-10 h-10 rounded-full bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-500/50 shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>`;
                textStyle = 'text-gray-600'; 
            } else if (tx.status === 'disponible') {
                badge = `<span class="text-[9px] font-black uppercase tracking-widest text-[#FFC300]">Disponible</span>`;
                icon = `<div class="w-10 h-10 rounded-full bg-[#FFC300]/10 border border-[#FFC300]/20 flex items-center justify-center text-[#FFC300] shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>`;
            } else if (tx.status === 'payout_requested') {
                badge = `<span class="text-[9px] font-black uppercase tracking-widest text-blue-400">En Proceso</span>`;
                icon = `<div class="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>`;
                textStyle = 'text-gray-400 line-through decoration-white/20'; 
            } else {
                badge = `<span class="text-[9px] font-black uppercase tracking-widest text-gray-500">En Escrow</span>`;
                icon = `<div class="w-10 h-10 rounded-full bg-gray-500/10 border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>`;
            }
        }

        const typeLabel = tx.type === 'ticket' ? 'TICKET' : 'ORDEN';
        const monedaStr = tx.payment_method === 'pago_movil' ? 'Pago Móvil (VES)' : (tx.payment_method === 'boveda' ? 'Liquidación B2B' : 'Digital (USD)');

        list.innerHTML += `
            <div class="p-6 md:p-8 flex items-center justify-between hover:bg-white/5 transition-colors cursor-default border-b border-white/5 last:border-0">
                <div class="flex items-center gap-4">
                    ${icon}
                    <div>
                        <p class="text-sm font-[900] uppercase italic ${textStyle} mb-0.5">${typeLabel} #${tx.id}</p>
                        <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${dateStr} • ${tx.buyer_name} • ${monedaStr}</p>
                    </div>
                </div>
                <div class="text-right flex flex-col justify-between h-full">
                    <div>
                        <p class="text-lg font-[900] italic ${textStyle} tracking-tighter mb-0.5">${amountText}</p>
                        ${badge}
                    </div>
                    ${actionBtn}
                </div>
            </div>
        `;
    });
}

// ==========================================
// 🧾 CONTROLADORES DEL RECIBO PREMIUM B2B
// ==========================================
window.openReceiptModal = function(ticketId) {
    if (!currentFinancialData) return;
    const ticket = currentFinancialData.transactions.find(tx => tx.id === ticketId);
    if (!ticket || !ticket.financials) return;

    document.getElementById('rec-id').textContent = ticket.id;
    
    const usd = ticket.financials.puro_usd || 0;
    const ves = ticket.financials.puro_ves || 0;
    const bcv = ticket.financials.tasa_bcv_cierre || 0;

    const usdBox = document.getElementById('rec-usd-box');
    const vesBox = document.getElementById('rec-ves-box');

    if (usd > 0) {
        usdBox.classList.remove('hidden');
        usdBox.classList.add('flex');
        document.getElementById('rec-usd-val').textContent = `$${usd.toFixed(2)}`;
    } else {
        usdBox.classList.add('hidden');
        usdBox.classList.remove('flex');
    }

    if (ves > 0) {
        vesBox.classList.remove('hidden');
        vesBox.classList.add('flex');
        document.getElementById('rec-ves-val').textContent = `Bs. ${ves.toFixed(2)}`;
        document.getElementById('rec-ves-ref').textContent = `~ $${(ves / bcv).toFixed(2)} USD (Ref)`;
    } else {
        vesBox.classList.add('hidden');
        vesBox.classList.remove('flex');
    }

    document.getElementById('rec-bcv').textContent = `Bs. ${bcv.toFixed(2)}`;
    document.getElementById('rec-orders').textContent = `${ticket.orders_count} Entregas`;
    
    const execDate = ticket.executed_at && ticket.executed_at !== 'None' ? new Date(ticket.executed_at).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pendiente';
    document.getElementById('rec-date').textContent = execDate;
    document.getElementById('rec-ref').textContent = ticket.payment_reference || 'No registrada';

    const modal = document.getElementById('receipt-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.children[0].classList.remove('scale-95');
        modal.children[0].classList.add('scale-100');
    }, 10);
};

window.closeReceiptModal = function() {
    const modal = document.getElementById('receipt-modal');
    modal.classList.add('opacity-0');
    modal.children[0].classList.remove('scale-100');
    modal.children[0].classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// 🍎 DESCARGA DIRECTA DE PDF CORPORATIVO
window.downloadReceiptPdf = async function() {
    const ticketId = document.getElementById('rec-id').textContent;
    if (!ticketId || ticketId.includes('XXXXX')) return;
    
    const token = localStorage.getItem(TOKEN_KEY);
    const btn = document.getElementById('btn-download-pdf');
    const originalHtml = btn.innerHTML;
    
    // UI Feedback de carga
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Procesando PDF...`;
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/finances/ticket/${ticketId}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            // Conversión de datos binarios a Blob para descarga forzada en navegador
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Liquidacion_Gymenez_${ticketId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } else {
            const data = await res.json();
            alert(data.error || 'No se pudo generar el comprobante PDF de liquidación.');
        }
    } catch (e) {
        alert('Falla de red al intentar descargar el PDF.');
    } finally {
        // Restaurar estado del botón
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

// ==========================================
// 🚀 SOLICITUD DE RETIRO
// ==========================================
window.requestPayout = async function(event) {
    if (currentLiquidableUsdEquiv <= 0 || isProcessingPayout || !isPayoutWindowOpen()) {
        if(navigator.vibrate) navigator.vibrate([100]);
        return; 
    }

    const conf = confirm(`¿Estás seguro de solicitar tu corte semanal?\n\nEquivalente aproximado: $${currentLiquidableUsdEquiv.toLocaleString('en-US', {minimumFractionDigits: 2})} USD.\n\nRecuerda: Solo se procesa 1 retiro por semana.`);
    if (!conf) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    isProcessingPayout = true;
    const btn = event ? event.currentTarget : document.getElementById('btn-request-payout');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Procesando...`;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/finances/payout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            if(navigator.vibrate) navigator.vibrate([50, 50]);
            alert(`✅ ¡Ticket Generado!\n\n${data.message}\nID: ${data.ticket_id}`);
            fetchFinancialData(); 
        } else {
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
            alert(`❌ Error: ${data.error}`);
            isProcessingPayout = false;
            fetchFinancialData(); 
        }
    } catch (error) {
        alert("Fallo de conexión al procesar la solicitud.");
        isProcessingPayout = false;
        fetchFinancialData(); 
    }
};

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    obj.classList.remove('skeleton-text'); 

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = (easeProgress * (end - start) + start);
        
        obj.innerHTML = `$${currentVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerHTML = `$${end.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    window.requestAnimationFrame(step);
}
