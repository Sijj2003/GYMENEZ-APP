import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ====================================================================
// ⚙️ CONFIGURACIÓN DE RED Y ESTADO
// ====================================================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

const firebaseConfig = {
    apiKey: "AIzaSyC7ESvLhYTydAn_ZjHVSkebTC-BhvnbzIw",
    authDomain: "gymenezapp.firebaseapp.com",
    projectId: "gymenezapp"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allOrders = [];
let activeOrderId = null;

// ==========================================
// 📢 UTILIDADES UI Y SEGURIDAD
// ==========================================
function getSecureHeaders() {
    const token = localStorage.getItem('gymen_admin_token'); 
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function formatDate(timestamp) {
    if (!timestamp) return 'Fecha Desconocida';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase();
}

// ==========================================
// 🗂️ LÓGICA DE PESTAÑAS (DOSSIER)
// ==========================================
function setupTabs() {
    document.querySelectorAll('.o-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Limpiar activos
            document.querySelectorAll('.o-tab-btn').forEach(b => {
                b.classList.remove('active', 'text-[#FFC300]', 'border-[#FFC300]');
                if (!b.classList.contains('text-red-500')) b.classList.add('text-gray-500');
            });
            document.querySelectorAll('.o-tab-content').forEach(c => {
                c.classList.remove('block');
                c.classList.add('hidden');
            });

            // Activar clickeado
            const targetId = btn.getAttribute('data-target');
            if (!btn.classList.contains('text-red-500')) {
                btn.classList.remove('text-gray-500');
                btn.classList.add('active', 'text-[#FFC300]', 'border-[#FFC300]');
            } else {
                btn.classList.add('active', 'border-red-500');
            }
            
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('block');
            }
        });
    });

    document.getElementById('btn-close-order')?.addEventListener('click', () => {
        document.getElementById('active-order').classList.add('hidden');
        document.getElementById('active-order').classList.remove('flex');
        document.getElementById('empty-state').classList.remove('hidden');
        activeOrderId = null;
        renderOrdersList(); // Quita el highlight de la lista
    });
}

// ==========================================
// 📡 RADAR B2B: CONEXIÓN FIREBASE
// ==========================================
async function initStoreRadar() {
    const token = localStorage.getItem('gymen_admin_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/pulse/token`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            await signInWithCustomToken(auth, data.firebase_token);
            
            const q = query(collection(db, "store_orders"), orderBy("created_at", "desc"));
            onSnapshot(q, (snapshot) => {
                allOrders = [];
                snapshot.forEach(doc => {
                    allOrders.push({ id: doc.id, ...doc.data() });
                });
                
                updatePartnersFilter();
                calculateKPIs();
                applyFiltersAndRender();

                // Actualizar dossier en vivo si está abierto
                if (activeOrderId) {
                    const updatedOrder = allOrders.find(o => o.id === activeOrderId);
                    if (updatedOrder) loadOrderDossier(updatedOrder);
                }
            });
        }
    } catch (e) {
        document.getElementById('orders-list').innerHTML = `<div class="p-4 text-center text-red-500 text-[10px] font-bold uppercase tracking-widest mt-10">Error de Conexión</div>`;
    }
}

// ==========================================
// 📊 RENDERIZADO, FILTROS Y KPIs
// ==========================================
function calculateKPIs() {
    let activeCount = 0;
    let alertCount = 0;
    let totalVolume = 0;

    allOrders.forEach(order => {
        if (['PENDING', 'TRANSIT'].includes(order.status)) activeCount++;
        if (['ISSUE'].includes(order.status)) alertCount++;
        if (['PENDING', 'TRANSIT', 'DELIVERED', 'LIQUIDATED'].includes(order.status)) {
            totalVolume += (order.total_amount || 0);
        }
    });

    document.getElementById('kpi-active').textContent = activeCount;
    document.getElementById('kpi-alerts').textContent = alertCount;
    document.getElementById('kpi-volume').textContent = formatCurrency(totalVolume);
}

function updatePartnersFilter() {
    const filterSelect = document.getElementById('filter-partner');
    const currentVal = filterSelect.value;
    
    // Extraer partners únicos
    const partners = [...new Set(allOrders.map(o => o.partner_name || 'Gymenez Store'))].filter(Boolean);
    
    let html = `<option value="ALL">Todos los Partners</option>`;
    partners.forEach(p => { html += `<option value="${p}">${p}</option>`; });
    
    filterSelect.innerHTML = html;
    filterSelect.value = partners.includes(currentVal) ? currentVal : 'ALL';
}

function applyFiltersAndRender() {
    const searchTerm = (document.getElementById('search-orders')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('filter-status')?.value || 'ALL';
    const partnerFilter = document.getElementById('filter-partner')?.value || 'ALL';

    const filtered = allOrders.filter(o => {
        const matchesSearch = o.id.toLowerCase().includes(searchTerm) || 
                              (o.customer_name || '').toLowerCase().includes(searchTerm) || 
                              (o.customer_email || '').toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter || (statusFilter === 'ISSUE' && ['CANCELLED', 'REFUNDED', 'ISSUE'].includes(o.status));
        const matchesPartner = partnerFilter === 'ALL' || (o.partner_name || 'Gymenez Store') === partnerFilter;

        return matchesSearch && matchesStatus && matchesPartner;
    });

    renderOrdersList(filtered);
}

function getStatusUI(status) {
    const map = {
        'PENDING': { label: 'Preparando', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
        'TRANSIT': { label: 'En Tránsito', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
        'DELIVERED': { label: 'Entregado', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        'LIQUIDATED': { label: 'Liquidado', color: 'bg-[#FFC300]/10 text-[#FFC300] border-[#FFC300]/20' },
        'CANCELLED': { label: 'Cancelado', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
        'REFUNDED': { label: 'Reembolsado', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
        'ISSUE': { label: 'Contingencia', color: 'bg-red-500/20 text-red-400 border-red-500/50' }
    };
    return map[status] || { label: 'Desconocido', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
}

function renderOrdersList(orders = allOrders) {
    const container = document.getElementById('orders-list');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-10">Sin coincidencias</div>`;
        return;
    }

    orders.forEach(order => {
        const isActive = order.id === activeOrderId;
        const uiStatus = getStatusUI(order.status);
        const partnerName = order.partner_name || 'Gymenez Store';
        const dateStr = formatDate(order.created_at);

        const itemHTML = `
            <div onclick="window.selectOrder('${order.id}')" class="p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col gap-2 ${isActive ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}">
                <div class="flex justify-between items-start">
                    <span class="font-black text-sm uppercase tracking-tight text-white truncate pr-2">#${order.id.slice(-6)}</span>
                    <span class="px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${uiStatus.color}">${uiStatus.label}</span>
                </div>
                
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-[11px] font-bold text-gray-300 truncate">${order.customer_name || 'Usuario B2C'}</p>
                        <p class="text-[9px] font-mono text-gray-500 uppercase mt-0.5">${partnerName}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] text-gray-500 font-bold mb-0.5">${dateStr.split(',')[0]}</p>
                        <p class="text-sm font-black text-[#FFC300]">${formatCurrency(order.total_amount)}</p>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// Eventos de Filtros
document.getElementById('search-orders')?.addEventListener('input', applyFiltersAndRender);
document.getElementById('filter-status')?.addEventListener('change', applyFiltersAndRender);
document.getElementById('filter-partner')?.addEventListener('change', applyFiltersAndRender);


// ==========================================
// 🔍 RADIOGRAFÍA: CARGAR DOSSIER DE ORDEN
// ==========================================
window.selectOrder = function(orderId) {
    activeOrderId = orderId;
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    applyFiltersAndRender(); // Actualiza highlights

    document.getElementById('empty-state').classList.add('hidden');
    const dossier = document.getElementById('active-order');
    dossier.classList.remove('hidden');
    dossier.classList.add('flex');

    loadOrderDossier(order);
    
    // Forzar pestaña principal
    document.querySelector('.o-tab-btn[data-target="o-content-details"]').click();
};

function loadOrderDossier(order) {
    const uiStatus = getStatusUI(order.status);
    
    // Headers
    document.getElementById('o-id').textContent = `#${order.id}`;
    document.getElementById('o-date').textContent = formatDate(order.created_at);
    document.getElementById('o-total').textContent = formatCurrency(order.total_amount);
    
    const statusBadge = document.getElementById('o-status-badge');
    statusBadge.textContent = uiStatus.label;
    statusBadge.className = `px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest ${uiStatus.color}`;
    
    document.getElementById('o-partner-badge').textContent = order.partner_name || 'Gymenez Store';

    // TAB 1: Facturación
    document.getElementById('o-customer-name').textContent = order.customer_name || 'Atleta Desconocido';
    document.getElementById('o-customer-email').textContent = order.customer_email || 'Sin correo registrado';

    // Render Carrito
    const cartContainer = document.getElementById('o-cart-items');
    cartContainer.innerHTML = '';
    const items = order.items || [];
    items.forEach(item => {
        cartContainer.insertAdjacentHTML('beforeend', `
            <div class="px-5 py-4 flex justify-between items-center bg-black/20">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover">` : '📦'}
                    </div>
                    <div>
                        <h5 class="text-xs font-bold text-white uppercase">${item.name}</h5>
                        <p class="text-[9px] text-gray-400 font-mono mt-0.5">Talla: ${item.size || 'N/A'} | SKU: ${item.sku || 'N/A'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-black text-white">${item.quantity}x ${formatCurrency(item.price)}</p>
                    <p class="text-[10px] text-[#FFC300] font-bold mt-0.5">${formatCurrency(item.quantity * item.price)}</p>
                </div>
            </div>
        `);
    });

    // Pasarela
    const fee = order.platform_fee || (order.total_amount * 0.05); // Default 5% si no existe
    const net = order.total_amount - fee;
    
    document.getElementById('o-pay-method').textContent = order.payment_method || 'API Integrada';
    document.getElementById('o-pay-ref').textContent = order.payment_ref || 'TRX-' + order.id.slice(-8);
    document.getElementById('o-pay-fee').textContent = formatCurrency(fee);
    document.getElementById('o-pay-net').textContent = formatCurrency(net);

    // TAB 2: Logística
    const shippingInfo = `Destinatario: ${order.shipping_name || order.customer_name}\nDirección: ${order.shipping_address || 'Retiro en Tienda'}\nTeléfono: ${order.shipping_phone || 'N/A'}\nNotas: ${order.shipping_notes || 'Ninguna'}`;
    document.getElementById('o-shipping-info').value = shippingInfo;
    document.getElementById('o-tracking-number').value = order.tracking_number || '';

    // Marcar radio button actual
    const radioBtn = document.querySelector(`input[name="logistics_status"][value="${order.status}"]`);
    if(radioBtn) radioBtn.checked = true;
    else {
        document.querySelectorAll('input[name="logistics_status"]').forEach(r => r.checked = false);
    }
}

// ==========================================
// 🛠️ ACCIONES DE API (UPDATE, REFUND, CANCEL)
// ==========================================
async function executeOrderAction(endpointSuffix, payload = {}, successMessage) {
    if (!activeOrderId) return false;
    
    try {
        // Ejecutamos la petición hacia tu backend Flask
        const res = await fetch(`${API_BASE_URL}/api/admin/store/order/${activeOrderId}/${endpointSuffix}`, {
            method: 'PUT',
            headers: getSecureHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showUIFeedback(successMessage, 'success');
            return true;
        } else {
            showUIFeedback(data.error || "Operación denegada", "error");
            return false;
        }
    } catch (e) {
        showUIFeedback("Falla en la red o servidor", "error");
        return false;
    }
}

// Wire-up Botones
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    initStoreRadar();

    // 1. Botón Actualizar Logística B2B
    document.getElementById('btn-update-logistics')?.addEventListener('click', async (e) => {
        const btn = e.target;
        const selectedStatus = document.querySelector('input[name="logistics_status"]:checked')?.value;
        const tracking = document.getElementById('o-tracking-number').value.trim();

        if (!selectedStatus) { showUIFeedback("Selecciona un estado logístico", "error"); return; }
        
        btn.textContent = "Procesando..."; btn.disabled = true;
        await executeOrderAction('logistics', { status: selectedStatus, tracking_number: tracking }, "Logística actualizada con éxito.");
        btn.textContent = "Actualizar Logística"; btn.disabled = false;
    });

    // 2. Botón Forzar Cancelación
    document.getElementById('btn-force-cancel')?.addEventListener('click', async () => {
        if(!confirm("⚠️ ATENCIÓN: Se cancelará la orden. El partner será notificado y no preparará el paquete. ¿Continuar?")) return;
        await executeOrderAction('cancel', {}, "Orden Cancelada Correctamente.");
    });

    // 3. Botón Marcar Refund
    document.getElementById('btn-force-refund')?.addEventListener('click', async () => {
        if(!confirm("⚠️ AUDITORÍA: ¿Confirmas que los fondos ya fueron devueltos al cliente por la pasarela?")) return;
        await executeOrderAction('refund', {}, "Estado marcado como Reembolsado.");
    });

    // 4. Botón Liquidar B2B
    document.getElementById('btn-mark-liquidated')?.addEventListener('click', async () => {
        if(!confirm("💰 FINANZAS: ¿Confirmas que el dinero de esta venta ya fue depositado al Partner Comercial?")) return;
        await executeOrderAction('liquidate', {}, "Orden Liquidada con el Partner.");
    });
});
