// =========================================================
// 🛒 MOTOR ADMIN: AUDITORÍA E-COMMERCE
// =========================================================

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

// Cargar automáticamente cuando se abra la vista
document.addEventListener('DOMContentLoaded', () => {
    loadAdminStoreOrders();
});

async function loadAdminStoreOrders() {
    const token = localStorage.getItem('gymen_admin_token') || localStorage.getItem('jwt_token');
    const tbody = document.getElementById('admin-orders-tbody');
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="p-16 text-center">
                <div class="w-8 h-8 border-2 border-[#FFC300] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <span class="text-[10px] font-black uppercase tracking-widest text-[#FFC300] animate-pulse">Sincronizando transacciones...</span>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/store/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            renderAdminStoreOrders(data.orders);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 text-[10px] uppercase font-bold tracking-widest">Error cargando órdenes: ${data.error}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 text-[10px] uppercase font-bold tracking-widest">Fallo crítico de conexión de red.</td></tr>`;
    }
}

function renderAdminStoreOrders(orders) {
    const tbody = document.getElementById('admin-orders-tbody');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-16 text-center text-gray-500 text-[10px] uppercase font-bold tracking-widest">No hay transacciones registradas en el E-Commerce actualmente.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(o => {
        const date = new Date(o.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        
        // Etiquetas de tiendas involucradas
        const storesHtml = (o.involved_stores || []).map(s => `
            <span class="bg-white/5 border border-white/10 px-2.5 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest text-gray-400 mr-1 mb-1 inline-block shadow-inner">${s}</span>
        `).join('');
        
        // Identidad visual de la pasarela de pago
        const payColor = o.payment_method === 'binance' ? 'text-[#FCD535]' : 'text-emerald-400';
        const methodText = o.payment_method === 'binance' ? 'BINANCE PAY' : 'PAGO MÓVIL';

        return `
            <tr class="hover:bg-white/5 transition-colors group">
                <td class="p-5 pl-8 align-middle">
                    <p class="text-xs font-black text-white uppercase tracking-widest">#...${o.id.slice(-6)}</p>
                    <p class="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">${date}</p>
                </td>
                <td class="p-5 align-middle">
                    <p class="text-xs font-bold text-white capitalize">${o.buyer_name}</p>
                    <p class="text-[9px] font-bold text-gray-500 tracking-widest mt-1 uppercase">${o.buyer_doc}</p>
                </td>
                <td class="p-5 align-middle">
                    <p class="text-xl font-[900] ${payColor} italic drop-shadow-md">$${parseFloat(o.total_usd).toFixed(2)}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[8px] font-black tracking-widest uppercase text-gray-500">${methodText}</span>
                        <span class="text-[9px] font-black text-white uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/5">REF: ${o.payment_reference}</span>
                    </div>
                </td>
                <td class="p-5 align-middle">
                    <div class="max-w-[200px] flex flex-wrap gap-1">${storesHtml}</div>
                </td>
                <td class="p-5 pr-8 align-middle">
                    <div class="relative">
                        <select onchange="updateStoreOrderStatus('${o.id}', this.value)" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-[#FFC300] cursor-pointer shadow-inner transition appearance-none">
                            <option value="pending_verification" ${o.status === 'pending_verification' ? 'selected' : ''}>⚠️ Auditoría de Pago</option>
                            <option value="approved" ${o.status === 'approved' ? 'selected' : ''}>✅ Pago Aprobado</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>🚚 En Tránsito</option>
                            <option value="rejected" ${o.status === 'rejected' ? 'selected' : ''}>❌ Pago Rechazado</option>
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateStoreOrderStatus(orderId, newStatus) {
    const token = localStorage.getItem('gymen_admin_token') || localStorage.getItem('jwt_token');
    
    // Podemos inyectar un pequeño efecto visual aquí en el futuro
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            console.log(`Orden ${orderId} actualizada a: ${newStatus}`);
            // No recargamos toda la tabla para mantener la experiencia fluida,
            // el selector ya muestra el nuevo estado.
        } else {
            alert("Error al actualizar estado: " + data.error);
            loadAdminStoreOrders(); // Recargamos para revertir el selector
        }
    } catch (error) {
        alert("Fallo de conexión al intentar actualizar.");
        loadAdminStoreOrders(); // Recargamos para revertir el selector
    }
}
