// ====================================================================
// 💰 MOTOR DE FINANZAS Y LIQUIDACIONES B2B (ZERO-TRUST BIMONETARIO)
// ====================================================================

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymenez_partner_token';

document.addEventListener('DOMContentLoaded', () => {
    fetchFinancialData();
});

// 1. OBTENER EL SNAPSHOT FINANCIERO SEGURO
async function fetchFinancialData() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        // Hacemos ping a la nueva ruta segura que audita los fondos
        const res = await fetch(`${API_BASE_URL}/api/partner/finances`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            updateFinancialUI(data.snapshot);
            renderTransactions(data.snapshot.transactions);
        } else {
            console.error("Error del servidor:", data.error);
        }

    } catch (error) {
        console.error("Error de red al obtener finanzas:", error);
    }
}

// 2. ACTUALIZAR INTERFAZ BIMONETARIA
function updateFinancialUI(snapshot) {
    // A) Animamos los montos totales equivalentes en USD
    animateValue("balance-available", 0, snapshot.total_disponible_equivalente_usd, 1200);
    
    // Calculamos el equivalente en USD del Escrow solo para la pantalla (El backend ya mandó los puros)
    const escrowEqUsd = snapshot.escrow_puro_usd + (snapshot.tasa_bcv_hoy > 0 ? (snapshot.escrow_puro_ves / snapshot.tasa_bcv_hoy) : 0);
    animateValue("balance-escrow", 0, escrowEqUsd, 1200);

    // B) Inyectar Subtítulos Desglosados (Asegúrate de agregar estos IDs en tu HTML debajo de los números grandes si deseas mostrarlos)
    const availableSubtitle = document.getElementById('breakdown-available');
    if (availableSubtitle) {
        availableSubtitle.innerHTML = `$${snapshot.disponible_puro_usd.toFixed(2)} USD + Bs. ${snapshot.disponible_puro_ves.toFixed(2)} (Tasa BCV: ${snapshot.tasa_bcv_hoy})`;
    }
    
    const escrowSubtitle = document.getElementById('breakdown-escrow');
    if (escrowSubtitle) {
        escrowSubtitle.innerHTML = `$${snapshot.escrow_puro_usd.toFixed(2)} USD + Bs. ${snapshot.escrow_puro_ves.toFixed(2)}`;
    }

    // C) Lógica del Botón de Retiro (Sin mínimos, solo que sea mayor a cero)
    const btnPayout = document.getElementById('btn-request-payout');
    if (btnPayout) {
        if (snapshot.total_disponible_equivalente_usd > 0) {
            btnPayout.classList.remove('bg-white/5', 'text-gray-500', 'cursor-not-allowed', 'border-white/10');
            btnPayout.classList.add('bg-[#FFC300]', 'text-black', 'border-[#FFC300]', 'hover:bg-[#e6b000]', 'cursor-pointer');
            btnPayout.disabled = false;
        } else {
            btnPayout.classList.add('bg-white/5', 'text-gray-500', 'cursor-not-allowed', 'border-white/10');
            btnPayout.classList.remove('bg-[#FFC300]', 'text-black', 'border-[#FFC300]', 'hover:bg-[#e6b000]', 'cursor-pointer');
            btnPayout.disabled = true;
        }
    }
}

// 3. RENDERIZAR HISTORIAL DE TRANSACCIONES AUDITADO
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
        const total = parseFloat(tx.net_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        let d = new Date(tx.created_at);
        let dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        let badge = '';
        let icon = '';

        if (tx.status === 'disponible') {
            badge = `<span class="text-[9px] font-black uppercase tracking-widest text-[#FFC300]">Disponible</span>`;
            icon = `<div class="w-10 h-10 rounded-full bg-[#FFC300]/10 border border-[#FFC300]/20 flex items-center justify-center text-[#FFC300] shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>`;
        } else if (tx.status === 'payout_requested') {
            badge = `<span class="text-[9px] font-black uppercase tracking-widest text-blue-400">Liquidación en Proceso</span>`;
            icon = `<div class="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>`;
        } else {
            badge = `<span class="text-[9px] font-black uppercase tracking-widest text-gray-500">En Escrow</span>`;
            icon = `<div class="w-10 h-10 rounded-full bg-gray-500/10 border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>`;
        }

        const monedaStr = tx.payment_method === 'pago_movil' ? 'Pago Móvil (VES)' : 'Digital (USD)';

        list.innerHTML += `
            <div class="p-6 md:p-8 flex items-center justify-between hover:bg-white/5 transition-colors cursor-default border-b border-white/5 last:border-0">
                <div class="flex items-center gap-4">
                    ${icon}
                    <div>
                        <p class="text-sm font-[900] uppercase italic text-white mb-0.5">Orden #${tx.id}</p>
                        <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${dateStr} • ${tx.buyer_name} • ${monedaStr}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-lg font-[900] italic text-white tracking-tighter mb-0.5">+$${total}</p>
                    ${badge}
                </div>
            </div>
        `;
    });
}

// 4. GENERAR TICKET DE LIQUIDACIÓN
window.requestPayout = async function(event) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    // Feedback visual en el botón
    const btn = event ? event.currentTarget : document.getElementById('btn-request-payout');
    if (btn.disabled) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/finances/payout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            if(navigator.vibrate) navigator.vibrate([50, 50]);
            alert(`✅ ¡Éxito!\n\n${data.message}\nTicket de seguimiento: ${data.ticket_id}`);
            // Recargamos los fondos para mostrar $0.00 disponibles
            fetchFinancialData(); 
        } else {
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
            alert(`❌ Error al solicitar liquidación: ${data.error}`);
        }
    } catch (error) {
        alert("Fallo de conexión al procesar la solicitud.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// ==========================================
// UTILIDADES: ANIMACIÓN FLUIDA DE NÚMEROS
// ==========================================
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    obj.classList.remove('skeleton-text'); // Quitar efecto de carga

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
