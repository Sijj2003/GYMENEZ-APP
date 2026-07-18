// ==========================================
// CONFIGURACIÓN DE SEGURIDAD (SSO & SHIELD)
// ==========================================
const TOKEN_KEY = 'gymen_auth_token';
const API_BASE_URL = 'https://sijj2003.pythonanywhere.com';

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARGA INSTANTÁNEA: Leer identidad desde la caché del SSO
    const sessionString = localStorage.getItem('userSession');
    if (sessionString) {
        try {
            const sessionUser = JSON.parse(sessionString);
            if (sessionUser.name) {
                const rawName = sessionUser.name.trim();
                const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                
                document.getElementById('user-greeting').innerText = formattedName;
                document.getElementById('avatar-initials').innerText = rawName.charAt(0).toUpperCase();
            }
        } catch (e) {
            console.warn("No se pudo parsear la sesión local.");
        }
    }

    // 2. Disparar Cargas Paralelas
    loadBuyerProfile();
    loadBuyerOrders(); // Nueva función "Apple Store"
});

// ==========================================
// LÓGICA DE NAVEGACIÓN (PESTAÑAS)
// ==========================================
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btnElement.classList.add('active');
}

// ==========================================
// CÓDIGO NUEVO: EL TIMELINE DE ÓRDENES
// ==========================================
async function loadBuyerOrders() {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/store/orders/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('orders-container');
        
        if (response.ok && data.success && data.orders.length > 0) {
            document.getElementById('badge-orders-count').innerText = data.orders.length;
            document.getElementById('badge-orders-count').classList.remove('hidden');
            
            container.innerHTML = data.orders.map(order => buildOrderTimeline(order)).join('');
        } else {
            container.innerHTML = '';
            document.getElementById('orders-empty-state').classList.remove('hidden');
        }
    } catch (error) {
        document.getElementById('orders-container').innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500 text-[10px] font-black uppercase tracking-widest">No pudimos conectar con el servidor.</p>
            </div>
        `;
    }
}

// El Generador de Tarjetas de Orden "Apple Style"
function buildOrderTimeline(order) {
    // Definición de la máquina de estados
    const s = order.status;
    const isPending = s === 'pending_verification';
    const isProcessing = s === 'processing';
    const isShipped = s === 'shipped';
    const isDelivered = s === 'delivered';
    const isDenied = s === 'denied';

    const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Reciente';

    // Generador de la Línea de Tiempo
    const timelineHtml = isDenied ? 
        `<div class="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mt-4">
            <p class="text-xs text-red-400 font-bold uppercase tracking-widest text-center">❌ Orden Cancelada o Rechazada</p>
        </div>` 
        : 
        `<div class="relative mt-6 pt-2 pl-4 md:pl-8">
            <!-- Pasos -->
            <div class="timeline-item relative pb-6 ${isPending || isProcessing || isShipped || isDelivered ? 'active' : ''}">
                <div class="absolute -left-8 md:-left-12 top-0 w-6 h-6 rounded-full border-4 border-[#0a0a0f] ${isPending ? 'bg-[#FFC300] shadow-[0_0_10px_rgba(255,195,0,0.5)]' : (isProcessing||isShipped||isDelivered ? 'bg-[#FFC300]' : 'bg-white/20')} z-10 flex items-center justify-center"></div>
                <h4 class="text-sm font-bold ${isPending ? 'text-white' : 'text-gray-400'}">Verificando Pago</h4>
                <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">${isPending ? 'Revisando Ref: '+order.payment_reference : 'Pago Confirmado'}</p>
            </div>

            <div class="timeline-item relative pb-6 ${isProcessing || isShipped || isDelivered ? 'active' : ''}">
                <div class="absolute -left-8 md:-left-12 top-0 w-6 h-6 rounded-full border-4 border-[#0a0a0f] ${isProcessing ? 'bg-[#FFC300] shadow-[0_0_10px_rgba(255,195,0,0.5)]' : (isShipped||isDelivered ? 'bg-[#FFC300]' : 'bg-white/20')} z-10 flex items-center justify-center"></div>
                <h4 class="text-sm font-bold ${isProcessing ? 'text-white' : 'text-gray-400'}">Procesando Envío</h4>
                <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Preparando paquete</p>
            </div>

            <div class="timeline-item relative pb-6 ${isShipped || isDelivered ? 'active-emerald' : ''}">
                <div class="absolute -left-8 md:-left-12 top-0 w-6 h-6 rounded-full border-4 border-[#0a0a0f] ${isShipped ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : (isDelivered ? 'bg-emerald-500' : 'bg-white/20')} z-10 flex items-center justify-center"></div>
                <h4 class="text-sm font-bold ${isShipped ? 'text-white' : 'text-gray-400'}">En Tránsito</h4>
                <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">${order.tracking_number ? `Guía: <span class="text-emerald-400 font-black">${order.tracking_number}</span> (${order.shipping_info?.courier || 'Envío'})` : 'En camino a tu destino'}</p>
            </div>

            <div class="timeline-item relative pb-2 ${isDelivered ? 'active-emerald' : ''}">
                <div class="absolute -left-8 md:-left-12 top-0 w-6 h-6 rounded-full border-4 border-[#0a0a0f] ${isDelivered ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/20'} z-10 flex items-center justify-center"></div>
                <h4 class="text-sm font-bold ${isDelivered ? 'text-emerald-400' : 'text-gray-400'}">Entregado</h4>
                <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Llegó a destino</p>
            </div>
        </div>`;

    // Resumen de Productos en esta Orden
    const itemsHtml = order.items && Array.isArray(order.items) 
        ? order.items.map(i => `<span class="inline-block bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-gray-300 mr-2 mb-2">${i.qty}x ${i.name.substring(0,25)}...</span>`).join('') 
        : '<span class="text-xs text-gray-500">Productos no listados</span>';

    return `
    <div class="bg-[#0a0a0f] border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 mb-4 gap-4">
            <div>
                <span class="text-[9px] font-black uppercase tracking-widest text-gray-500">Orden del ${orderDate}</span>
                <p class="text-lg font-[900] uppercase italic text-white leading-none mt-1">Total: <span class="text-[#FFC300]">$${order.total_usd.toFixed(2)}</span></p>
            </div>
            <div class="bg-white/5 border border-white/10 rounded-lg p-3 text-right max-w-full">
                <span class="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Destino</span>
                <p class="text-xs text-gray-300 font-bold truncate">${order.shipping_info?.city || 'Ciudad'}, ${order.shipping_info?.state || 'Estado'}</p>
            </div>
        </div>
        
        <div class="mb-4">
            ${itemsHtml}
        </div>

        ${timelineHtml}
    </div>
    `;
}

// ==========================================
// CARGA Y CONEXIÓN CON BACKEND (PERFIL / KYC)
// ==========================================
async function loadBuyerProfile() {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    const deviceId = localStorage.getItem('gymen_device_id') || ''; 
    if (!token) return; 

    try {
        const response = await fetch(`${API_BASE_URL}/api/store/athlete/profile`, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            const p = data.profile;
            
            // 1. Llenar Identidad Legal (KYC)
            if (p.kyc_cedula_url) {
                document.getElementById('kyc-form-container').classList.add('hidden');
                document.getElementById('kyc-readonly-container').classList.remove('hidden');
                document.getElementById('doc-number').removeAttribute('required');

                const badge = document.getElementById('kyc-status-badge');
                badge.innerText = "Verificado";
                badge.className = "text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full";

                const fullName = p.full_name || p.name || 'Atleta Autorizado';
                document.getElementById('readonly-fullname').innerText = fullName;
                document.getElementById('readonly-doc').innerText = `${p.doc_type || 'V'}-${p.doc_number || ''}`;
            } else {
                if (p.doc_type) document.getElementById('doc-type').value = p.doc_type;
                if (p.doc_number) document.getElementById('doc-number').value = p.doc_number;
            }

            // 2. Llenar formulario de Logística (Siempre editable)
            if (p.shipping_state) document.getElementById('ship-state').value = p.shipping_state;
            if (p.shipping_municipality) document.getElementById('ship-municipality').value = p.shipping_municipality;
            if (p.shipping_city) document.getElementById('ship-city').value = p.shipping_city;
            if (p.preferred_courier) document.getElementById('ship-courier').value = p.preferred_courier;
        }
    } catch (error) {
        console.error("Error cargando el perfil:", error);
    }
}

// ==========================================
// GUARDAR FORMULARIO DE LOGÍSTICA
// ==========================================
document.getElementById('buyer-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const msg = document.getElementById('form-msg');
    const originalText = btn.innerText;
    
    btn.innerText = "ACTUALIZANDO...";
    btn.disabled = true;
    msg.classList.add('hidden');

    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    const deviceId = localStorage.getItem('gymen_device_id') || ''; 
    const formData = new FormData();
    
    formData.append('docType', document.getElementById('doc-type').value);
    formData.append('docNumber', document.getElementById('doc-number').value);
    formData.append('state', document.getElementById('ship-state').value);
    formData.append('municipality', document.getElementById('ship-municipality').value);
    formData.append('city', document.getElementById('ship-city').value);
    formData.append('courier', document.getElementById('ship-courier').value);

    const isKycVisible = !document.getElementById('kyc-form-container').classList.contains('hidden');
    if (isKycVisible) {
        const imageFile = document.getElementById('cedula-upload').files[0];
        if (imageFile) formData.append('cedula_image', imageFile);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/store/athlete/profile`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            msg.innerText = "¡Preferencias Guardadas con Éxito!";
            msg.className = "text-center text-xs font-bold uppercase tracking-widest mt-4 text-green-400";
            msg.classList.remove('hidden');
            
            if (isKycVisible) setTimeout(() => location.reload(), 1500);
        } else {
            msg.innerText = data.error || "Error al actualizar perfil.";
            msg.className = "text-center text-xs font-bold uppercase tracking-widest mt-4 text-red-500";
            msg.classList.remove('hidden');
        }
    } catch (error) {
        msg.innerText = "Error de red al conectar con el servidor.";
        msg.className = "text-center text-xs font-bold uppercase tracking-widest mt-4 text-red-500";
        msg.classList.remove('hidden');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});
