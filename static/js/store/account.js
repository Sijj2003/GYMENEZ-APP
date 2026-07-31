// ==========================================
// CONFIGURACIÓN DE SEGURIDAD (SSO & SHIELD)
// ==========================================
const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

let globalAgencies = [];// Memoria para la cascada logística
let myStoreOrders = [];

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
    initAccountData();
});

// ==========================================
// CONTROLADOR MAESTRO DE CARGA
// ==========================================
async function initAccountData() {
    loadBuyerOrders(); // Cargar órdenes de inmediato
    await loadShippingAgencies(); // Cargar catálogo de envíos primero
    loadBuyerProfile(); // Llenar perfil (necesita las agencias cargadas)
}

// ==========================================
// LÓGICA DE NAVEGACIÓN Y SESIÓN
// ==========================================
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'bg-white/5', 'text-white'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btnElement.classList.add('active', 'text-white', 'bg-white/5');
}

window.logoutAthlete = function() {
    if(confirm("¿Estás seguro que deseas cerrar tu sesión segura?")) {
        localStorage.removeItem('userSession');
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem('gymenez_pending_action');
        window.location.href = '/apps/start/login.html';
    }
}

// ==========================================
// TIMELINE DE ÓRDENES
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
            myStoreOrders = data.orders; // 👈 Guardamos las órdenes para el recibo
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
                <p class="text-red-500 text-[10px] font-black uppercase tracking-widest">No pudimos conectar con el ecosistema de órdenes.</p>
            </div>
        `;
    }
}

function buildOrderTimeline(order) {
    const s = order.status;
    const isPending = s === 'pending_verification';
    const isProcessing = s === 'processing';
    const isShipped = s === 'shipped';
    const isDelivered = s === 'delivered';
    const isDenied = s === 'denied' || s === 'rejected';

    const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Reciente';

    // LÓGICA DE COLORES DEL TIMELINE
    let hLine = 'h-[15%]';
    let s1 = 'STATE_ACTIVE', s2 = 'STATE_PENDING', s3 = 'STATE_PENDING', s4 = 'STATE_PENDING';
    
    if (isProcessing) { hLine = 'h-[45%]'; s1 = 'STATE_COMPLETED'; s2 = 'STATE_ACTIVE'; }
    else if (isShipped) { hLine = 'h-[75%]'; s1 = 'STATE_COMPLETED'; s2 = 'STATE_COMPLETED'; s3 = 'STATE_ACTIVE'; }
    else if (isDelivered) { hLine = 'h-full'; s1 = 'STATE_COMPLETED'; s2 = 'STATE_COMPLETED'; s3 = 'STATE_COMPLETED'; s4 = 'STATE_COMPLETED'; }
    else if (isDenied) { hLine = 'h-0'; s1 = 'STATE_ERROR'; }

    // Generador de Nodos (Círculos)
    function getNodeHTML(state, title, subtitle) {
        let circleHtml = '';
        let textClass = '';
        if (state === 'STATE_COMPLETED') {
            circleHtml = '<div class="absolute -left-[31px] md:-left-[39px] top-1 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 md:border-4 border-[#050508] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] z-10"></div>';
            textClass = 'text-gray-300';
        } else if (state === 'STATE_ACTIVE') {
            circleHtml = '<div class="absolute -left-[31px] md:-left-[39px] top-1 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 md:border-4 border-[#050508] bg-[#FFC300] shadow-[0_0_10px_rgba(255,195,0,0.5)] animate-pulse z-10"></div>';
            textClass = 'text-[#FFC300]';
        } else if (state === 'STATE_ERROR') {
            circleHtml = '<div class="absolute -left-[31px] md:-left-[39px] top-1 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 md:border-4 border-[#050508] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10"></div>';
            textClass = 'text-red-500';
        } else {
            circleHtml = '<div class="absolute -left-[31px] md:-left-[39px] top-1 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 md:border-4 border-[#050508] bg-white/20 z-10"></div>';
            textClass = 'text-gray-600';
        }
        return `
        <div class="relative">
            ${circleHtml}
            <span class="text-xs md:text-sm font-bold ${textClass} block">${title}</span>
            <span class="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest font-bold block mt-0.5">${subtitle}</span>
        </div>`;
    }

    const timelineHtml = `
        <div class="flex flex-col gap-6 mb-8 border-l-2 border-white/10 ml-2 md:ml-4 pl-6 md:pl-8 relative py-2">
            <div class="absolute top-0 left-[-2px] w-[2px] ${hLine} bg-[#FFC300] shadow-[0_0_10px_rgba(255,195,0,0.5)] transition-all duration-1000"></div>
            ${getNodeHTML(s1, isDenied ? 'Orden Cancelada' : 'Pago Confirmado', isDenied ? 'Rechazado por el sistema' : (isPending ? 'Auditando transferencia' : 'Auditado por finanzas'))}
            ${getNodeHTML(s2, 'En Preparación', 'Empacando tus artículos')}
            ${getNodeHTML(s3, 'Enviado', order.shipping_info?.tracking_number ? 'Guía: <span class="text-emerald-400 font-black">' + order.shipping_info.tracking_number + '</span>' : 'En tránsito nacional')}
            ${getNodeHTML(s4, 'Entregado', 'Listo en destino')}
        </div>
    `;

    const itemsHtml = order.items && Array.isArray(order.items) 
        ? order.items.map(i => `<span class="inline-block bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-300 mr-2 mb-2 shadow-inner">${i.qty || i.quantity || 1}x ${i.name.substring(0,35)}${i.name.length>35?'...':''}</span>`).join('') 
        : '<span class="text-xs text-gray-500">Productos no listados</span>';

    const receiptButton = (isShipped || isDelivered) 
        ? `<button onclick="generateReceipt('${order.id}')" class="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest text-white transition hover:text-[#FFC300] hover:border-[#FFC300]/50 shadow-md">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-4h2v4zm0-6h-2V7h2v3z"/></svg>
            Descargar Recibo PDF
        </button>`
        : '';

    const shortId = order.id.slice(-6).toUpperCase();
    
    // CREAMOS UN ID SEGURO Y ÚNICO PARA QUE NO ABRAN TODOS AL MISMO TIEMPO
    const uniqueContainerId = 'ord_' + order.id;

    // AQUÍ INICIA LA TARJETA MODO LISTA (CERRADA POR DEFECTO)
    return `
    <div class="bg-[#050508]/50 border border-white/5 hover:border-[#FFC300]/30 rounded-[1.5rem] overflow-hidden transition-all duration-300 group hover:shadow-[0_0_20px_rgba(255,195,0,0.1)] mb-4">
        
        <!-- Cabecera Resumen (Visible estando cerrado: Fecha, Codigo y Monto) -->
        <div class="p-5 md:p-6 cursor-pointer flex items-center justify-between gap-4" onclick="toggleOrderDetails('${uniqueContainerId}')">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#FFC300] transition-colors shadow-inner flex-shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                </div>
                <div>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Orden #${shortId}</p>
                    <p class="text-sm md:text-base font-bold text-white">${orderDate}</p>
                </div>
            </div>
            <div class="flex items-center gap-4 md:gap-6">
                <div class="text-right">
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Total</p>
                    <p class="text-base md:text-lg font-black text-white">$${parseFloat(order.total_usd).toFixed(2)}</p>
                </div>
                <!-- Icono apuntando hacia abajo indicando que está cerrado -->
                <div class="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-gray-400 transform rotate-0 transition-all duration-300 flex-shrink-0" id="icon-${uniqueContainerId}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
        </div>

        <!-- Acordeón Desplegable (CERRADO por defecto usando style="max-height: 0px") -->
        <div id="details-${uniqueContainerId}" class="overflow-hidden transition-all duration-500 ease-in-out bg-white/[0.02]" style="max-height: 0px;">
            <div class="p-5 md:p-8 border-t border-white/5">
                
                <!-- Resumen de Productos -->
                <div class="mb-8">
                    <h5 class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Artículos Adquiridos</h5>
                    <div class="flex flex-wrap">${itemsHtml}</div>
                </div>

                <!-- TIMELINE VERTICAL PREMIUM -->
                ${timelineHtml}

                <!-- FOOTER DE LA ORDEN (Courier y PDF) -->
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 bg-[#050508] p-4 md:p-5 rounded-2xl border border-white/5">
                    <div class="flex items-center gap-2 w-full sm:w-auto text-gray-400 text-xs">
                        <svg class="w-4 h-4 text-[#FFC300]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>Courier: <strong class="text-white">${order.shipping_info?.courier || 'Envío Standard'}</strong></span>
                    </div>
                    ${receiptButton}
                </div>
            </div>
        </div>
    </div>
    `;
}

// ==========================================
// CASCADA LOGÍSTICA INTELIGENTE (Agencias)
// ==========================================
async function loadShippingAgencies() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/shipping/agencies`);
        const data = await res.json();
        globalAgencies = data.agencies || data;
        setupShippingCascade();
    } catch (error) {
        console.error("Error al cargar agencias de envío", error);
    }
}

function setupShippingCascade() {
    const courierSelect = document.getElementById('ship-courier');
    const stateSelect = document.getElementById('ship-state');
    const agencySelect = document.getElementById('ship-agency');

    // Llenar couriers únicos
    const availableCouriers = [...new Set(globalAgencies.map(a => a.courier))].sort();
    courierSelect.innerHTML = '<option value="">Elige Courier...</option>';
    availableCouriers.forEach(c => courierSelect.innerHTML += `<option value="${c}">${c}</option>`);

    courierSelect.addEventListener('change', (e) => {
        const courier = e.target.value;
        stateSelect.innerHTML = '<option value="">Elige un Estado...</option>';
        agencySelect.innerHTML = '<option value="">Elige un Estado primero...</option>';
        agencySelect.disabled = true;

        if (!courier) { stateSelect.disabled = true; return; }

        const availableStates = [...new Set(globalAgencies.filter(a => a.courier === courier).map(a => a.state))].sort();
        availableStates.forEach(state => stateSelect.innerHTML += `<option value="${state}">${state}</option>`);
        stateSelect.disabled = false;
    });

    stateSelect.addEventListener('change', (e) => {
        const courier = courierSelect.value;
        const state = e.target.value;
        agencySelect.innerHTML = '<option value="">Selecciona tu Sucursal...</option>';

        if (!state) { agencySelect.disabled = true; return; }

        const filteredAgencies = globalAgencies.filter(a => a.courier === courier && a.state === state);
        filteredAgencies.forEach(agency => {
            agencySelect.innerHTML += `<option value="${agency.id}">${agency.name} - ${agency.address.substring(0,35)}...</option>`;
        });
        agencySelect.disabled = false;
    });
}

// ==========================================
// CARGAR PERFIL DEL USUARIO
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
            
            // 1. Llenar KYC
            if (p.kyc_cedula_url) {
                document.getElementById('kyc-form-container').classList.add('hidden');
                document.getElementById('kyc-readonly-container').classList.remove('hidden');
                document.getElementById('doc-number').removeAttribute('required');

                const badge = document.getElementById('kyc-status-badge');
                badge.innerText = "Aprobado Oficial";
                badge.className = "text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30";

                document.getElementById('readonly-fullname').innerText = p.full_name || p.name || 'Atleta Autorizado';
                document.getElementById('readonly-doc').innerText = `${p.doc_type || 'V'}-${p.doc_number || ''}`;
            } else {
                if (p.doc_type) document.getElementById('doc-type').value = p.doc_type;
                if (p.doc_number) document.getElementById('doc-number').value = p.doc_number;
            }

            // 2. Pre-llenar cascada logística dinámicamente
            if (p.preferred_courier) {
                const courierSelect = document.getElementById('ship-courier');
                courierSelect.value = p.preferred_courier;
                courierSelect.dispatchEvent(new Event('change')); // Forzar despliegue de estados
                
                if (p.shipping_state) {
                    const stateSelect = document.getElementById('ship-state');
                    // Esperar a que se llene el DOM
                    setTimeout(() => {
                        stateSelect.value = p.shipping_state;
                        stateSelect.dispatchEvent(new Event('change')); // Forzar despliegue de sucursales
                        
                        if (p.shipping_municipality) {
                            setTimeout(() => {
                                document.getElementById('ship-agency').value = p.shipping_municipality;
                            }, 50);
                        }
                    }, 50);
                }
            }
        }
    } catch (error) {
        console.error("Error cargando el perfil:", error);
    }
}

// ==========================================
// GUARDAR PERFIL (KYC + LOGÍSTICA)
// ==========================================
document.getElementById('buyer-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const msg = document.getElementById('form-msg');
    const originalText = btn.innerText;
    
    btn.innerHTML = `<span class="animate-pulse">Asegurando Perfil...</span>`;
    btn.disabled = true;
    msg.classList.add('hidden');

    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    const deviceId = localStorage.getItem('gymen_device_id') || ''; 
    const formData = new FormData();
    
    // Obtener datos del form
    const docType = document.getElementById('doc-type').value;
    const docNumber = document.getElementById('doc-number').value;
    const courier = document.getElementById('ship-courier').value;
    const state = document.getElementById('ship-state').value;
    const agencySelect = document.getElementById('ship-agency');
    const agencyId = agencySelect.value;
    const agencyName = agencySelect.options[agencySelect.selectedIndex]?.text.split(' - ')[0] || '';

    // Validar cascada
    if (!courier || !state || !agencyId) {
        msg.innerText = "Por favor, completa toda la ruta de envío.";
        msg.className = "text-center text-[10px] font-black uppercase tracking-widest mt-4 text-red-500";
        msg.classList.remove('hidden');
        btn.innerText = originalText;
        btn.disabled = false;
        return;
    }

    formData.append('docType', docType);
    formData.append('docNumber', docNumber);
    formData.append('courier', courier);
    formData.append('state', state);
    formData.append('municipality', agencyId); // ID de la agencia
    formData.append('city', agencyName); // Nombre de la agencia

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
            msg.innerText = "¡Bóveda Logística Actualizada!";
            msg.className = "text-center text-[10px] font-black uppercase tracking-widest mt-4 text-emerald-400";
            msg.classList.remove('hidden');
            
            if (isKycVisible && document.getElementById('cedula-upload').files[0]) {
                setTimeout(() => location.reload(), 1500);
            }
        } else {
            msg.innerText = data.error || "Error al actualizar perfil.";
            msg.className = "text-center text-[10px] font-black uppercase tracking-widest mt-4 text-red-500";
            msg.classList.remove('hidden');
        }
    } catch (error) {
        msg.innerText = "Falla de red en la transmisión.";
        msg.className = "text-center text-[10px] font-black uppercase tracking-widest mt-4 text-red-500";
        msg.classList.remove('hidden');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// ==========================================
// 🧾 GENERADOR PROFESIONAL DE RECIBOS LOGÍSTICOS
// ==========================================
function generateReceipt(orderId) {
    const order = myStoreOrders.find(o => o.id === orderId);
    if (!order) return;

    if (order.status !== 'shipped' && order.status !== 'delivered') {
        alert("El recibo estará disponible cuando la orden sea procesada por el Courier.");
        return;
    }

    const date = new Date(order.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
    const tracking = order.shipping_info?.tracking_number || 'Pendiente de asignación';
    const courier = order.shipping_info?.courier || 'MRW';
    const state = order.shipping_info?.state || 'Estado no registrado';
    
    // 👇 NUEVO: Buscamos la dirección exacta en la memoria de Agencias
    const agencyId = order.shipping_info?.municipality;
    let agencyName = order.shipping_info?.city || 'Agencia Destino';
    let agencyAddress = '';
    
    if (agencyId && globalAgencies && globalAgencies.length > 0) {
        const foundAgency = globalAgencies.find(a => a.id === agencyId);
        if (foundAgency) {
            agencyName = foundAgency.name;
            agencyAddress = foundAgency.address;
        }
    }
    
    // Extracción robusta de los items
    let itemsArray = [];
    if (order.items && order.items.length > 0) {
        itemsArray = order.items;
    } else if (order.store_splits) {
        Object.values(order.store_splits).forEach(split => {
            if (split.items) itemsArray = itemsArray.concat(split.items);
        });
    }

    if (itemsArray.length === 0) {
        itemsArray = [{ name: 'Equipamiento Fitness', qty: 1, price: order.total_usd, storeName: 'Gymenez Store' }];
    }

    const itemsRows = itemsArray.map(item => `
        <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 12px 0; color: #333333; font-weight: bold;">${item.qty || item.quantity || 1}x</td>
            <td style="padding: 12px 10px; color: #111111;">
                ${item.name || 'Producto'} <br>
                <span style="font-size: 10px; color: #888888; text-transform: uppercase;">Tienda: ${item.storeName || item.store_name || 'Gymenez Store'}</span>
            </td>
            <td style="padding: 12px 0; text-align: right; color: #111111; font-weight: bold;">$${(item.price * (item.qty || 1)).toFixed(2)}</td>
        </tr>
    `).join('');

    const exchangeRate = order.exchange_rate || 0;
    const totalVes = order.total_ves || (order.total_usd * exchangeRate);

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Compra #${order.id.slice(-6).toUpperCase()}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap');
                body { font-family: 'Inter', sans-serif; background-color: #f9fafb; margin: 0; padding: 40px; color: #111111; }
                .receipt-container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                .header { border-bottom: 3px solid #FFC300; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                .logo { font-size: 28px; font-weight: 900; font-style: italic; text-transform: uppercase; margin: 0; }
                .logo span { color: #FFC300; }
                .title { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888; font-weight: bold; margin-top: 5px; }
                .order-data { text-align: right; }
                .order-data h2 { margin: 0; font-size: 18px; color: #111111; }
                .order-data p { margin: 5px 0 0; font-size: 12px; color: #555555; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; }
                .info-box h4 { margin: 0 0 5px; font-size: 10px; text-transform: uppercase; color: #888888; letter-spacing: 1px; }
                .info-box p { margin: 0; font-size: 13px; font-weight: bold; color: #111111; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { text-align: left; padding: 10px 0; border-bottom: 2px solid #111111; font-size: 11px; text-transform: uppercase; color: #555555; }
                
                .totals { text-align: right; border-top: 2px solid #111111; padding-top: 20px; }
                .totals p { margin: 5px 0; font-size: 14px; color: #555555; }
                .totals .grand-total { font-size: 24px; font-weight: 900; color: #111111; margin-top: 10px; }
                .totals .ves-total { font-size: 12px; font-weight: bold; color: #888888; }
                
                .footer { text-align: center; margin-top: 50px; font-size: 11px; color: #888888; line-height: 1.6; border-top: 1px solid #eeeeee; padding-top: 20px; }
                .footer strong { color: #111111; }
                
                @media print {
                    body { background: white; padding: 0; }
                    .receipt-container { box-shadow: none; max-width: 100%; padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <div>
                        <h1 class="logo">GYMENEZ <span>STORE</span></h1>
                        <div class="title">Nota de Entrega / Recibo de Compra</div>
                    </div>
                    <div class="order-data">
                        <h2>#${order.id.slice(-6).toUpperCase()}</h2>
                        <p>${date}</p>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-box">
                        <h4>Facturado A</h4>
                        <p>${order.buyer_name || 'Atleta Gymenez'}</p>
                        <p style="font-size: 11px; font-weight: normal; margin-top: 2px;">C.I: ${order.buyer_doc || 'No registrada'}</p>
                    </div>
                    <!-- 👇 NUEVA ESTRUCTURA DEL RECUADRO LOGÍSTICO -->
                    <div class="info-box">
                        <h4>Información Logística</h4>
                        <p>${courier} - ${agencyName}</p>
                        ${agencyAddress ? `<p style="font-size: 10px; font-weight: normal; margin-top: 4px; color: #555555; line-height: 1.4;">${agencyAddress} (Edo. ${state})</p>` : `<p style="font-size: 10px; font-weight: normal; margin-top: 4px; color: #555555;">Edo. ${state}</p>`}
                        <p style="font-size: 11px; font-weight: normal; margin-top: 8px;">N° Guía: <strong style="font-size: 13px; color: #111111;">${tracking}</strong></p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 10%;">Cant</th>
                            <th style="width: 60%; padding-left: 10px;">Descripción / Producto</th>
                            <th style="width: 30%; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div class="totals">
                    <p>Referencia de Pago: <strong>${order.payment_reference || 'N/A'}</strong></p>
                    <p>Tasa BCV Referencial: <strong>Bs. ${exchangeRate.toFixed(2)}</strong></p>
                    <div class="grand-total">Total: $${parseFloat(order.total_usd).toFixed(2)}</div>
                    <div class="ves-total">Equivalente: Bs. ${totalVes.toFixed(2)}</div>
                </div>

                <div class="footer">
                    Este documento constituye un recibo de control logístico interno y comprobante de compra para nuestros clientes.<br>
                    Para garantías, dudas o devoluciones, contáctanos: <br>
                    <strong>+58 (414) 878-0392</strong> | <strong>performance@gymenez.com</strong>
                </div>
            </div>
            
            <script>
                window.onload = function() { 
                    setTimeout(() => window.print(), 500); 
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
