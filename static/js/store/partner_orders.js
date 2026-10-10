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
// 4. CONTROL DEL PANEL CUPERTINO Y SEMÁFORO
// ==========================================
window.openOrderModal = function(orderId) {
    const order = globalOrders.find(o => o.id === orderId);
    if (!order) return;
    
    currentSelectedOrder = order;

    // A) Llenar Datos Base
    document.getElementById('modal-order-id-title').innerText = `#${order.id}`;
    document.getElementById('modal-buyer-name').innerText = `${order.buyer_name || 'Desconocido'} • CI: ${order.buyer_doc || 'N/A'}`;
    document.getElementById('modal-shipping-type').innerText = order.shipping_type || 'Cobro a Destino';
    
    const sInfo = order.shipping_info || {};
    document.getElementById('modal-shipping-agency').innerText = `${sInfo.courier || 'Envío'} - ${sInfo.municipality || 'Agencia'}`;
    document.getElementById('modal-shipping-state').innerText = `${sInfo.state || ''}, ${sInfo.city || ''}`;
    document.getElementById('modal-total-usd').innerText = `$${Number(order.my_total_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    // B) Semáforo Lógico de Seguridad
    const semaforoEl = document.getElementById('modal-semaforo');
    const guideSection = document.getElementById('modal-guide-section');
    const timelineSection = document.getElementById('modal-timeline-section');
    
    if (order.partner_shipping_status === 'shipped') {
        semaforoEl.className = "bg-[#12121a] border border-blue-500/30 p-6 rounded-[2rem] flex items-center justify-between gap-4 shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all";
        semaforoEl.innerHTML = `
            <div>
                <h4 class="text-sm font-[900] text-blue-400 uppercase italic tracking-tighter">Paquete en Tránsito</h4>
                <p class="text-[10px] font-bold text-gray-400 mt-1">El cliente está monitoreando el envío. La liquidación se liberará al entregar.</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
        `;
        guideSection.classList.add('hidden'); // Ocultar input si ya se envió (anti-fraude)
        
        // Renderizar Línea de Tiempo si el bot ha extraído historial
        if (order.historial_envio && order.historial_envio.length > 0) {
            renderTimeline(order.historial_envio);
            timelineSection.classList.remove('hidden');
        } else if (order.tracking_guides && order.tracking_guides.length > 0) {
            // Mostrar guía estática si aún no hay historial del bot
            renderTimeline([{ estatus: `Guía Anexada: ${order.tracking_guides[0].guide_number}`, ubicacion: order.tracking_guides[0].courier, fecha: "Reciente" }]);
            timelineSection.classList.remove('hidden');
        }

    } else if (order.global_payment_status === 'pending_verification') {
        semaforoEl.className = "bg-[#12121a] border border-[#FFC300]/30 p-6 rounded-[2rem] flex items-center justify-between gap-4 shadow-[0_0_30px_rgba(255,195,0,0.1)] transition-all";
        semaforoEl.innerHTML = `
            <div>
                <h4 class="text-sm font-[900] text-[#FFC300] uppercase italic tracking-tighter">Pago en Revisión</h4>
                <p class="text-[10px] font-bold text-gray-400 mt-1">Fondos en validación. <span class="text-white font-black">NO ENTREGUES A LA AGENCIA AÚN.</span></p>
            </div>
            <div class="w-12 h-12 rounded-full bg-[#FFC300]/10 flex items-center justify-center shrink-0 border border-[#FFC300]/20">
                <svg class="w-6 h-6 text-[#FFC300]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
        `;
        guideSection.classList.add('hidden');
        timelineSection.classList.add('hidden');

    } else {
        semaforoEl.className = "bg-[#12121a] border border-emerald-500/30 p-6 rounded-[2rem] flex items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all";
        semaforoEl.innerHTML = `
            <div>
                <h4 class="text-sm font-[900] text-emerald-400 uppercase italic tracking-tighter animate-pulse">Luz Verde: Enviar</h4>
                <p class="text-[10px] font-bold text-gray-400 mt-1">Fondos asegurados. Entrega a la agencia, escanea el recibo y anexa la guía.</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                <svg class="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
        `;
        guideSection.classList.remove('hidden');
        timelineSection.classList.add('hidden');
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
                <div class="text-right"><p class="text-sm font-[900] italic text-white">$${price}</p></div>
            </div>`;
    });

    // Mostrar Panel Fluido
    const backdrop = document.getElementById('order-modal-backdrop');
    const panel = document.getElementById('order-panel');
    backdrop.classList.remove('hidden');
    
    // Pequeño delay para asegurar que el display:block se aplique antes de la transición
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('translate-y-full', 'md:translate-x-full');
    }, 10);
};

window.closeOrderModal = function() {
    const backdrop = document.getElementById('order-modal-backdrop');
    const panel = document.getElementById('order-panel');
    
    backdrop.classList.add('opacity-0');
    panel.classList.add('translate-y-full', 'md:translate-x-full');
    
    setTimeout(() => {
        backdrop.classList.add('hidden');
        currentSelectedOrder = null;
    }, 500); // 500ms coincide con la duración de la transición CSS
};

// ==========================================
// RENDERING DEL TIMELINE DE RASTREO
// ==========================================
function renderTimeline(historialArray) {
    const container = document.getElementById('modal-timeline');
    container.innerHTML = '';
    
    // Invertimos para mostrar el más reciente arriba
    const reversed = [...historialArray].reverse();
    
    reversed.forEach((paso, index) => {
        const isLatest = index === 0;
        const colorClass = isLatest ? 'bg-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-[#12121a] text-gray-500 border border-white/20';
        const textClass = isLatest ? 'text-white font-bold' : 'text-gray-400';
        
        container.innerHTML += `
            <div class="relative flex items-start gap-4">
                <div class="absolute left-0 mt-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10 ${colorClass}">
                    ${isLatest ? '<div class="w-2 h-2 bg-black rounded-full"></div>' : ''}
                </div>
                <div class="pl-8 pb-4 w-full">
                    <p class="text-xs ${textClass} leading-tight">${paso.estatus}</p>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-[9px] font-black uppercase tracking-widest text-gray-500">${paso.ubicacion}</span>
                        <span class="text-[9px] font-bold text-gray-600">${paso.fecha ? paso.fecha.split(' ')[0] : ''}</span>
                    </div>
                </div>
            </div>`;
    });
}

// ==========================================
// 5. VALIDACIÓN Y ENVÍO DE GUÍAS (Anti-Fraude)
// ==========================================
window.addTrackingGuide = async function(event) {
    if (!currentSelectedOrder) return;

    const courier = document.getElementById('guide-courier').value;
    const guideInput = document.getElementById('guide-number');
    const guideNumber = guideInput.value.trim();
    const token = localStorage.getItem(TOKEN_KEY);

    if (guideNumber.length < 4) {
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]); // Haptic Feedback Error
        guideInput.classList.add('border-red-500', 'bg-red-500/10');
        setTimeout(() => guideInput.classList.remove('border-red-500', 'bg-red-500/10'), 800);
        return;
    }

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/orders/${currentSelectedOrder.id}/tracking`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ courier: courier, guide_number: guideNumber })
        });
        
        const data = await res.json();

        if (res.ok && data.success) {
            if(navigator.vibrate) navigator.vibrate([50]); // Haptic Feedback Éxito
            guideInput.value = '';
            
            // Actualizar vista local
            currentSelectedOrder.tracking_guides = [{ courier: courier, guide_number: guideNumber }];
            currentSelectedOrder.partner_shipping_status = 'shipped';
            
            // Refrescar modal y grilla
            openOrderModal(currentSelectedOrder.id);
            filterOrders();
        } else {
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
            alert(data.error || "La guía ingresada es inválida o no existe en MRW/Zoom.");
        }
    } catch (e) {
        alert("Fallo de conexión al verificar la guía.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// ==========================================
// UTILITIES: GENERADOR DE ETIQUETAS Y ESCÁNER
// ==========================================
window.generarEtiquetaPDF = async function(event) {
    if (!currentSelectedOrder) return;
    
    if(navigator.vibrate) navigator.vibrate([30, 50, 30]);

    // Feedback visual: Cambiamos el ícono de la impresora por un spinner de carga
    const eventBtn = event ? event.currentTarget : null;
    let originalHTML = '';
    if (eventBtn) {
        originalHTML = eventBtn.innerHTML;
        eventBtn.innerHTML = `<div class="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>`;
        eventBtn.disabled = true;
    }

    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const res = await fetch(`${API_BASE_URL}/api/partner/orders/${currentSelectedOrder.id}/packing-slip`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            // Si falla, el backend nos devuelve un JSON con el error
            const errorData = await res.json();
            alert(errorData.error || "No se pudo generar la etiqueta.");
            return;
        }

        // 1. Extraemos el archivo binario de la respuesta (Blob)
        const blob = await res.blob();
        
        // 2. Creamos una URL temporal en la memoria del navegador
        const url = window.URL.createObjectURL(blob);
        
        // 3. Creamos un enlace invisible, simulamos el clic y lo destruimos
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Etiqueta_Gymenez_${currentSelectedOrder.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Limpiamos la memoria RAM del navegador
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        if(navigator.vibrate) navigator.vibrate([50]); // Vibración de éxito

    } catch (error) {
        console.error("Error al descargar PDF:", error);
        alert("Fallo de red al intentar generar la etiqueta.");
    } finally {
        // Restauramos el botón a su estado original
        if (eventBtn) {
            eventBtn.innerHTML = originalHTML;
            eventBtn.disabled = false;
        }
    }
};

// ==========================================
// 📸 ESCÁNER MÓVIL DE CÓDIGOS DE BARRAS
// ==========================================
let html5QrcodeScanner = null;

window.escanearGuiaMobil = function() {
    if (!currentSelectedOrder) return;
    if (navigator.vibrate) navigator.vibrate([30]);

    // Mostrar el modal
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.remove('hidden');

    // Inicializar el escáner (Configurado rectangular para códigos de barras de envío)
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { 
            fps: 10, 
            qrbox: { width: 250, height: 100 },
            formatsToSupport: [ Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39 ],
            aspectRatio: 1.0
        },
        false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
};

function onScanSuccess(decodedText, decodedResult) {
    // Éxito: El código de barras fue leído
    if (navigator.vibrate) navigator.vibrate([50, 50]);
    
    console.log(`[Escáner] Código detectado: ${decodedText}`);

    // Detenemos la cámara y cerramos el modal
    cerrarEscaner();

    // Buscar el input donde el partner normalmente teclea el número de guía
    const inputGuia = document.getElementById('tracking-guide-input'); 
    
    if (inputGuia) {
        // Autocompletamos el input con el número limpio (solo dígitos)
        inputGuia.value = decodedText.replace(/\D/g, ''); 
        
        // Feedback visual: Hacemos parpadear el input en verde suave
        inputGuia.classList.add('bg-green-100', 'transition', 'duration-300');
        setTimeout(() => inputGuia.classList.remove('bg-green-100'), 1000);
    } else {
        alert("Código detectado: " + decodedText);
    }
}

function onScanFailure(error) {
    // El escáner falla decenas de veces por segundo mientras intenta enfocar.
    // Esto es un comportamiento normal, por lo que lo mantenemos en silencio.
}

window.cerrarEscaner = function() {
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.add('hidden');
    
    // Apagar la cámara de forma segura
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
            console.error("Error al detener el escáner:", error);
        });
        html5QrcodeScanner = null;
    }
};
