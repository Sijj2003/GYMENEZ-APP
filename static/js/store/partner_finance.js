// ====================================================================
// 💰 MOTOR DE FINANZAS Y LIQUIDACIONES (B2B)
// ====================================================================

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymenez_partner_token';
const MINIMUM_PAYOUT = 20.00;
let liquidableBalance = 0;

document.addEventListener('DOMContentLoaded', () => {
    fetchFinancialData();
});

async function fetchFinancialData() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        const orders = (res.ok && data.success) ? data.orders : [];

        calculateBalances(orders);
        renderTransactions(orders);

    } catch (error) {
        console.error("Error al obtener finanzas:", error);
    }
}

function calculateBalances(orders) {
    let escrowBalance = 0;
    liquidableBalance = 0;

    orders.forEach(order => {
        const orderTotal = parseFloat(order.my_total_usd || 0);
        const globalStatus = (order.global_payment_status || '').toLowerCase();
        
        // 1. Fondos Liquidables (Gymenez autorizó liberar o se completó)
        if (globalStatus === 'liquidated' || globalStatus === 'completado') {
            // Nota: Aquí se asume que aún no se le ha pagado (Payout) físicamente.
            // Para un sistema real de Payouts, el backend debería marcar "payout_done".
            if (!order.payout_done) { 
                liquidableBalance += orderTotal;
            }
        }
        
        // 2. Fondos en Escrow (Pagado, pero retenido por SLA o envío pendiente)
        else if (globalStatus === 'processing' || globalStatus === 'enviado') {
            escrowBalance += orderTotal;
        }
    });

    // Animar Valores
    animateValue("balance-available", 0, liquidableBalance, 1200);
    animateValue("balance-escrow", 0, escrowBalance, 1200);

    // Lógica del Botón de Retiro
    const btnPayout = document.getElementById('btn-request-payout');
    if (liquidableBalance >= MINIMUM_PAYOUT) {
        btnPayout.classList.remove('bg-white/5', 'text-gray-500', 'cursor-not-allowed', 'border-white/10');
        btnPayout.classList.add('bg-[#FFC300]', 'text-black', 'border-[#FFC300]', 'hover:bg-[#e6b000]', 'cursor-pointer');
    }
}

function renderTransactions(orders) {
    const list = document.getElementById('transactions-list');
    const emptyState = document.getElementById('finance-empty-state');
    
    // Filtrar órdenes que no estén canceladas o fallidas
    const validOrders = orders.filter(o => 
        !['cancelled', 'failed', 'pending_verification'].includes((o.global_payment_status || '').toLowerCase())
    );

    if (validOrders.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    list.innerHTML = '';

    // Ordenar de más reciente a más antigua
    validOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    validOrders.forEach(order => {
        const globalStatus = (order.global_payment_status || '').toLowerCase();
        const total = parseFloat(order.my_total_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        let d = new Date(order.created_at);
        let dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        let badge = '';
        let icon = '';

        if (globalStatus === 'liquidated' || globalStatus === 'completado') {
            badge = `<span class="text-[9px] font-black uppercase tracking-widest text-[#FFC300]">Disponible</span>`;
            icon = `<div class="w-10 h-10 rounded-full bg-[#FFC300]/10 border border-[#FFC300]/20 flex items-center justify-center text-[#FFC300] shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>`;
        } else {
            badge = `<span class="text-[9px] font-black uppercase tracking-widest text-gray-500">En Escrow</span>`;
            icon = `<div class="w-10 h-10 rounded-full bg-gray-500/10 border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>`;
        }

        list.innerHTML += `
            <div class="p-6 md:p-8 flex items-center justify-between hover:bg-white/5 transition-colors cursor-default">
                <div class="flex items-center gap-4">
                    ${icon}
                    <div>
                        <p class="text-sm font-[900] uppercase italic text-white mb-0.5">Orden #${order.id}</p>
                        <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${dateStr} • ${order.buyer_name || 'Cliente'}</p>
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

// Interacción del Botón
window.requestPayout = function() {
    if (liquidableBalance < MINIMUM_PAYOUT) {
        if(navigator.vibrate) navigator.vibrate([100]);
        return; // No hace nada si no llega al mínimo
    }
    
    // Aquí podrías abrir un modal para que confirme la cuenta bancaria o Binance Pay ID
    alert(`Has solicitado el retiro de $${liquidableBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}. El equipo de Gymenez procesará la liquidación.`);
};

// Utilidad para limpiar el "Skeleton" y animar
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
