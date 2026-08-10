// ==========================================
// MÓDULO 5: ÓRDENES Y LOGÍSTICA
// ==========================================

async function loadMyOrders() {
    const token = localStorage.getItem('gymenez_partner_token');
    const URL = 'https://sijj2003.pythonanywhere.com/api/store/partner/orders';
    try {
        const response = await fetch(URL, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (response.ok && data.success) {
            renderOrders(data.orders);
        }
    } catch (error) { 
        console.error("Error cargando órdenes:", error); 
    }
}

function renderOrders(orders) {
    const container = document.getElementById('tab-orders');

    const headerHtml = `
        <div class="flex justify-between items-end mb-2 border-b border-white/5 pb-6">
            <div>
                <h1 class="text-3xl font-[900] tracking-tighter uppercase italic">Central de <span class="text-[#FFC300]">Órdenes</span></h1>
                <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Logística delegada. Gymenez audita el pago, tú despachas.</p>
            </div>
            <button onclick="loadMyOrders()" class="bg-[#12121a] hover:bg-white/5 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 transition shadow-inner flex items-center gap-2">
                <svg class="w-3 h-3 text-[#FFC300]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Refrescar
            </button>
        </div>
    `;

    if (!orders || orders.length === 0) {
        container.innerHTML = headerHtml + `
            <div class="bg-[#0a0a0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl mt-8">
                <div class="p-12 text-center">
                    <div class="text-5xl opacity-30 mb-4">📦</div>
                    <h3 class="text-lg font-bold text-white mb-1">Cero órdenes pendientes</h3>
                    <p class="text-xs text-gray-500 font-medium">Cuando un cliente reporte un pago, aparecerá aquí en estado de verificación.</p>
                </div>
            </div>
        `;
        return;
    }

    const statusMap = {
        'pending_verification': '<span class="bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-inner">⚠️ Auditoría de Pago</span>',
        'approved': '<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-inner animate-pulse">✅ Aprobado / Empacar</span>',
        'shipped': '<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-inner">🚚 En Tránsito</span>',
        'rejected': '<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-inner">❌ Pago Rechazado</span>'
    };

    let rowsHtml = orders.map(o => {
        const date = new Date(o.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        
        const itemsHtml = (o.my_items || []).map(i => `
            <div class="bg-[#030305] border border-white/5 p-2 rounded-lg mb-1 last:mb-0 shadow-inner">
                <span class="text-[10px] font-bold text-white leading-tight block">${i.qty}x ${i.name}</span>
            </div>
        `).join('');

        const ship = o.shipping_info || {};
        const isApproved = o.status === 'approved' || o.status === 'shipped';
        const shippingHtml = isApproved
            ? `<div class="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-inner">
                <p class="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Agencia: ${ship.courier || 'MRW'}
                </p>
                <p class="text-[10px] text-white font-bold leading-tight capitalize">${ship.state}, ${ship.city}</p>
                ${ship.municipality ? `<p class="text-[9px] text-emerald-500/70 capitalize mt-0.5">${ship.municipality}</p>` : ''}
               </div>` 
            : `<div class="mt-2 p-2.5 bg-white/5 border border-white/10 rounded-xl shadow-inner">
                <p class="text-[9px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    Destino Protegido
                </p>
                <p class="text-[9px] text-gray-600 mt-1 leading-tight font-bold">Se revelará al aprobarse el pago central.</p>
               </div>`;

        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td class="p-5 pl-8 align-middle">
                    <p class="text-xs font-black text-white uppercase tracking-widest">#...${o.id.slice(-6)}</p>
                    <p class="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">${date}</p>
                </td>
                <td class="p-5 align-middle min-w-[220px]">
                    <p class="text-xs font-bold text-white capitalize">${o.buyer_name}</p>
                    ${shippingHtml}
                </td>
                <td class="p-5 align-middle min-w-[200px]">
                    <div class="max-h-[100px] overflow-y-auto hide-scroll pr-1">${itemsHtml}</div>
                </td>
                <td class="p-5 align-middle">
                    <p class="text-xl font-[900] text-[#FFC300] italic drop-shadow-md">$${parseFloat(o.my_total_usd).toFixed(2)}</p>
                    <p class="text-[8px] font-black uppercase tracking-widest text-gray-500 mt-1">Ganancia Bruta</p>
                </td>
                <td class="p-5 pr-8 align-middle">${statusMap[o.status] || statusMap['pending_verification']}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = headerHtml + `
        <div class="bg-[#0a0a0f] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mt-4">
            <div class="overflow-x-auto hide-scroll">
                <table class="w-full text-left border-collapse min-w-[900px]">
                    <thead class="bg-[#12121a] border-b border-white/5">
                        <tr class="text-gray-500 text-[9px] uppercase font-black tracking-widest">
                            <th class="p-5 whitespace-nowrap pl-8">Cod. Factura</th>
                            <th class="p-5 whitespace-nowrap">Atleta & Logística</th>
                            <th class="p-5 whitespace-nowrap">Equipamiento Solicitado</th>
                            <th class="p-5 whitespace-nowrap">Liquidación USD</th>
                            <th class="p-5 whitespace-nowrap pr-8">Estado Operativo</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
