// ====================================================================
// 📦 MOTOR DE ÓRDENES Y LOGÍSTICA DEL PARTNER (B2B)
// ====================================================================

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymenez_partner_token';
let globalOrders = [];
let currentSelectedOrder = null;

// ==========================================
// 1. INICIALIZACIÓN Y DESCARGA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadPartnerOrders();
});

async function loadPartnerOrders() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            globalOrders = data.orders || [];
            window.filterOrders(); // Dibuja la grilla por primera vez
        } else {
            console.error("Fallo al cargar órdenes:", data.error);
        }
    } catch (error) {
        console.error("Error de red al obtener órdenes:", error);
    }
}

// ==========================================
// 2. MOTOR DE BÚSQUEDA Y FILTROS
// ==========================================
window.filterOrders = function() {
    const searchVal = document.getElementById('search-orders').value.toLowerCase();
    const statusVal = document.getElementById('filter-status').value;
    
    let filtered = globalOrders.filter(order => {
        // Filtro por Texto (ID o Nombre de Cliente)
        const matchesSearch = (order.id.toLowerCase().includes(searchVal) || (order.buyer_name || '').toLowerCase().includes(searchVal));
        
        // Filtro por Semáforo
        let matchesStatus = true;
        if (statusVal === 'pending_verification') {
            matchesStatus = order.global_payment_status === 'pending_verification';
        } else if (statusVal === 'processing') {
            matchesStatus = (order.global_payment_status === 'processing' || order.global_payment_status === 'liquidated') && order.partner_shipping_status !== 'shipped';
        } else if (statusVal === 'shipped') {
            matchesStatus = order.partner_shipping_status === 'shipped';
        }

        return matchesSearch && matchesStatus;
    });

    renderOrdersGrid(filtered);
};

// ==========================================
// 3. DIBUJADO DE LA GRILLA DE TARJETAS
// ==========================================
function renderOrdersGrid(ordersList) {
    const grid = document.getElementById('orders-grid');
    const emptyState = document.getElementById('empty-state');
    
    grid.innerHTML = '';

    if (ordersList.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    ordersList.forEach(order => {
        // Determinar el Color y Texto del Semáforo
        let statusBadge = '';
        if (order.partner_shipping_status === 'shipped') {
            statusBadge = `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner">🔵 Enviado</span>`;
        } else if (order.global_payment_status === 'pending_verification') {
            statusBadge = `<span class="bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner">🟡 Esperando Pago</span>`;
        } else {
            statusBadge = `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner animate-pulse">🟢 Por Enviar</span>`;
        }

        // Formato de Fecha y Dinero
        const totalUsd = Number(order.my_total_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        let dateStr = 'Fecha Desconocida';
        if (order.created_at) {
            const d = new Date(order.created_at);
            dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        const itemsCount = (order.my_items || []).reduce((acc, item) => acc + (item.qty || item.quantity || 1), 0);

        const cardHTML = `
        <div class="bg-[#12121a] border border-white/5 rounded-[2rem] p-6 hover:border-white/10 transition-colors shadow-lg cursor-pointer flex flex-col justify-between h-full" onclick="openOrderModal('${order.id}')">
            <div>
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">ID Orden</p>
                        <p class="text-xs font-bold text-white truncate max-w-[150px]">#${order.id}</p>
                    </div>
                    ${statusBadge}
                </div>
                
                <h4 class="text-sm font-[900] uppercase italic text-white mb-1 truncate">${order.buyer_name}</h4>
                <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">${itemsCount} Artículo(s) &bull; ${dateStr}</p>
            </div>
            
            <div class="flex items-center justify-between pt-4 border-t border-white/5">
                <span class="text-xs font-black text-gray-400">Total Venta:</span>
                <span class="text-lg font-[900] italic text-[#FFC300] tracking-tighter drop-shadow-md">$${totalUsd}</span>
            </div>
        </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

// ==========================================
// 4. CONTROL DEL MODAL PREMIUM Y SEMÁFORO
// ==========================================
window.openOrderModal = function(orderId) {
    const order = globalOrders.find(o => o.id === orderId);
    if (!order) return;
    
    currentSelectedOrder = order;

    // A) Llenar Datos Base
    document.getElementById('modal-order-id').innerText = `ID: #${order.id}`;
    document.getElementById('modal-buyer-name').innerText = order.buyer_name || 'Desconocido';
    document.getElementById('modal-buyer-doc').innerText = `CI: ${order.buyer_doc || 'N/A'}`;
    document.getElementById('modal-shipping-type').innerText = order.shipping_type || 'Cobro a Destino';
    
    const sInfo = order.shipping_info || {};
    document.getElementById('modal-shipping-agency').innerText = `${sInfo.courier || 'Envío'} - ${sInfo.municipality || 'Agencia'}`;
    document.getElementById('modal-shipping-state').innerText = `${sInfo.state || ''}, ${sInfo.city || ''}`;
    
    document.getElementById('modal-total-usd').innerText = `$${Number(order.my_total_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    // B) Semáforo Lógico de Seguridad
    const semaforoEl = document.getElementById('modal-semaforo');
    const guideSection = document.getElementById('modal-guide-section');
    
    if (order.partner_shipping_status === 'shipped') {
        // ENVIADO (Azul)
        semaforoEl.className = "bg-[#12121a] border border-blue-500/30 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(59,130,246,0.1)]";
        semaforoEl.innerHTML = `
            <div>
                <h4 class="text-sm font-[900] text-blue-400 uppercase italic tracking-tighter">Mercancía Enviada</h4>
                <p class="text-[10px] font-bold text-gray-400 mt-1">El cliente ya fue notificado. Puedes anexar más guías si enviaste múltiples paquetes.</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
        `;
        guideSection.classList.remove('hidden');

    } else if (order.global_payment_status === 'pending_verification') {
        // PENDIENTE DE PAGO (Amarillo / Candado)
        semaforoEl.className = "bg-[#12121a] border border-[#FFC300]/30 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(255,195,0,0.1)]";
        semaforoEl.innerHTML = `
            <div>
                <h4 class="text-sm font-[900] text-[#FFC300] uppercase italic tracking-tighter">Pago en Revisión</h4>
                <p class="text-[10px] font-bold text-gray-400 mt-1">El área de administración de Gymenez está validando los fondos. <span class="text-white font-black">NO ENVÍES MERCANCÍA AÚN.</span></p>
            </div>
            <div class="w-12 h-12 rounded-full bg-[#FFC300]/10 flex items-center justify-center shrink-0 border border-[#FFC300]/20">
                <svg class="w-6 h-6 text-[#FFC300]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
        `;
        guideSection.classList.add('hidden'); // Escudo: No dejamos que meta guías si no han pagado

    } else {
        // LUZ VERDE PARA ENVIAR (Verde)
        semaforoEl.className = "bg-[#12121a] border border-emerald-500/30 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]";
        semaforoEl.innerHTML = `
            <div>
                <h4 class="text-sm font-[900] text-emerald-400 uppercase italic tracking-tighter animate-pulse">Luz Verde: Proceder con Envío</h4>
                <p class="text-[10px] font-bold text-gray-400 mt-1">Los fondos están asegurados. Prepara el paquete, entrégalo a la agencia y anexa la guía abajo.</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                <svg class="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
        `;
        guideSection.classList.remove('hidden');
    }

    // C) Llenar Lista de Productos
    const itemsContainer = document.getElementById('modal-items-list');
    itemsContainer.innerHTML = '';
    (order.my_items || []).forEach(item => {
        const qty = item.qty || item.quantity || 1;
        const price = Number(item.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
        
        let variantBadge = '';
        const variantMatch = item.name.match(/(.*)\s\((.*)\)$/);
        let displayName = item.name;
        if (variantMatch) {
            displayName = variantMatch[1].trim();
            variantBadge = `<span class="bg-white/10 text-gray-300 border border-white/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded ml-2 shadow-inner inline-block">${variantMatch[2]}</span>`;
        }

        itemsContainer.innerHTML += `
            <div class="bg-[#030305] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                    <p class="text-xs font-bold text-white leading-tight">${displayName} ${variantBadge}</p>
                    <p class="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">Cantidad: <span class="text-white">${qty}</span></p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-[900] italic text-white">$${price}</p>
                </div>
            </div>
        `;
    });

    // D) Llenar Lista de Guías Anexadas
    const guidesContainer = document.getElementById('modal-guides-list');
    guidesContainer.innerHTML = '';
    if (order.tracking_guides && order.tracking_guides.length > 0) {
        order.tracking_guides.forEach(g => {
            guidesContainer.innerHTML += `
                <div class="bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl flex items-center justify-between">
                    <div>
                        <p class="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-0.5">${g.courier}</p>
                        <p class="text-xs font-bold text-white tracking-widest">${g.guide_number}</p>
                    </div>
                    <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
            `;
        });
    } else {
        guidesContainer.innerHTML = `<p class="text-[10px] text-gray-500 font-bold italic text-center py-2">No se han anexado guías aún.</p>`;
    }

    // Mostrar Modal con Animación
    const modal = document.getElementById('order-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.firstElementChild.classList.remove('translate-y-full', 'md:scale-95');
    }, 10);
};

window.closeOrderModal = function() {
    const modal = document.getElementById('order-modal');
    modal.classList.add('opacity-0');
    modal.firstElementChild.classList.add('translate-y-full', 'md:scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        currentSelectedOrder = null;
    }, 300);
};

// ==========================================
// 5. INYECCIÓN DE GUÍAS DE ENVÍO
// ==========================================
window.addTrackingGuide = async function() {
    if (!currentSelectedOrder) return;

    const courier = document.getElementById('guide-courier').value;
    const guideNumberInput = document.getElementById('guide-number');
    const guideNumber = guideNumberInput.value.trim();
    const token = localStorage.getItem(TOKEN_KEY);

    if (guideNumber.length < 4) {
        alert("Por favor, ingresa un número de guía válido.");
        return;
    }

    // Botón en estado de carga
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/orders/${currentSelectedOrder.id}/tracking`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courier: courier, guide_number: guideNumber })
        });
        
        const data = await res.json();

        if (res.ok && data.success) {
            // Limpiar input
            guideNumberInput.value = '';
            
            // Actualizar la orden localmente sin recargar la página entera
            if (!currentSelectedOrder.tracking_guides) currentSelectedOrder.tracking_guides = [];
            currentSelectedOrder.tracking_guides.push({
                courier: courier,
                guide_number: guideNumber,
                added_at: new Date().toISOString()
            });
            currentSelectedOrder.partner_shipping_status = 'shipped';

            // Refrescar el modal en vivo
            openOrderModal(currentSelectedOrder.id);
            // Refrescar la grilla de fondo para que el círculo cambie a azul
            filterOrders();

        } else {
            alert(data.error || "No se pudo anexar la guía.");
        }
    } catch (e) {
        alert("Fallo de conexión al enviar la guía.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
