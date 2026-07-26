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
    const isDenied = s === 'denied' || s === 'rejected'; // Agregamos rejected por si acaso

    const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Reciente';

    const timelineHtml = isDenied ? 
        `<div class="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mt-6">
            <p class="text-xs text-red-500 font-black uppercase tracking-widest text-center">❌ Orden Cancelada o Rechazada</p>
        </div>` 
        : 
        `<div class="relative mt-8 pt-2 pl-6 md:pl-10">
            <div class="timeline-item relative pb-8 ${isPending || isProcessing || isShipped || isDelivered ? 'active' : ''}">
                <div class="absolute -left-10 md:-left-14 top-0 w-8 h-8 rounded-full border-[6px] border-[#0a0a0f] ${isPending ? 'bg-[#FFC300]' : (isProcessing||isShipped||isDelivered ? 'bg-[#FFC300]' : 'bg-white/20')} z-10"></div>
                <h4 class="text-sm font-bold ${isPending ? 'text-white' : 'text-gray-400'}">Verificando Pago</h4>
                <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">${isPending ? 'Ref: '+order.payment_reference : 'Confirmado'}</p>
            </div>

            <div class="timeline-item relative pb-8 ${isProcessing || isShipped || isDelivered ? 'active' : ''}">
                <div class="absolute -left-10 md:-left-14 top-0 w-8 h-8 rounded-full border-[6px] border-[#0a0a0f] ${isProcessing ? 'bg-[#FFC300]' : (isShipped||isDelivered ? 'bg-[#FFC300]' : 'bg-white/20')} z-10"></div>
                <h4 class="text-sm font-bold ${isProcessing ? 'text-white' : 'text-gray-400'}">Procesando Envío</h4>
                <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Preparando paquete</p>
            </div>

            <div class="timeline-item relative pb-8 ${isShipped || isDelivered ? 'active-emerald' : ''}">
                <div class="absolute -left-10 md:-left-14 top-0 w-8 h-8 rounded-full border-[6px] border-[#0a0a0f] ${isShipped ? 'bg-emerald-500' : (isDelivered ? 'bg-emerald-500' : 'bg-white/20')} z-10"></div>
                <h4 class="text-sm font-bold ${isShipped ? 'text-white' : 'text-gray-400'}">En Tránsito</h4>
                <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">${order.shipping_info?.tracking_number ? `Guía: <span class="text-emerald-400 font-black">${order.shipping_info.tracking_number}</span>` : 'En camino'}</p>
            </div>

            <div class="timeline-item relative pb-2 ${isDelivered ? 'active-emerald' : ''}">
                <div class="absolute -left-10 md:-left-14 top-0 w-8 h-8 rounded-full border-[6px] border-[#0a0a0f] ${isDelivered ? 'bg-emerald-500' : 'bg-white/20'} z-10"></div>
                <h4 class="text-sm font-bold ${isDelivered ? 'text-emerald-400' : 'text-gray-400'}">Entregado</h4>
                <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Llegó a destino</p>
            </div>
        </div>`;

    const itemsHtml = order.items && Array.isArray(order.items) 
        ? order.items.map(i => `<span class="inline-block bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-300 mr-2 mb-2">${i.qty || i.quantity || 1}x ${i.name.substring(0,25)}</span>`).join('') 
        : '<span class="text-xs text-gray-500">Productos no listados</span>';

    // 👈 AQUÍ INYECTAMOS EL BOTÓN DE RECIBO SI ESTÁ ENVIADO O ENTREGADO
    const receiptButton = (isShipped || isDelivered) 
        ? `<button onclick="generateReceipt('${order.id}')" class="bg-[#12121a] text-white hover:bg-[#FFC300] hover:text-black hover:border-transparent px-4 py-3 md:py-2 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-inner"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span class="hidden md:inline">Ver Recibo</span></button>`
        : '';

    return `
    <div class="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl mb-8 group transition-all hover:border-[#FFC300]/20">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 mb-6 gap-4">
            <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">Orden del ${orderDate}</span>
                <p class="text-2xl font-[900] uppercase italic text-white leading-none mt-2">Total: <span class="text-[#FFC300]">$${parseFloat(order.total_usd).toFixed(2)}</span></p>
            </div>
            <div class="flex items-stretch md:items-center gap-3 w-full md:w-auto">
                ${receiptButton}
                <div class="flex-1 md:flex-none bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-right max-w-full">
                    <span class="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Destino Fijo</span>
                    <p class="text-xs text-gray-300 font-bold truncate">${order.shipping_info?.city || 'Ciudad'}, ${order.shipping_info?.state || 'Estado'}</p>
                </div>
            </div>
        </div>
        <div class="mb-4">${itemsHtml}</div>
        ${timelineHtml}
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
    
    // Extracción robusta de los items por si vienen del Checkout viejo o nuevo
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

    // Prevenir errores en órdenes donde no haya tasa registrada
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
                    <div class="info-box">
                        <h4>Información Logística</h4>
                        <p>Agencia: ${courier}</p>
                        <p style="font-size: 11px; font-weight: normal; margin-top: 2px;">Guía: <strong>${tracking}</strong></p>
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
