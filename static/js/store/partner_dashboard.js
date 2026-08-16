// ====================================================================
// 📊 MOTOR DE MÉTRICAS DEL DASHBOARD (B2B) - V2 (Accionable)
// ====================================================================

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymenez_partner_token';

document.addEventListener('DOMContentLoaded', () => {
    // Configurar el título con el mes actual (Ej: "Métricas de Agosto")
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('current-month-title').innerText = meses[new Date().getMonth()];
    
    fetchDashboardMetrics();
});

async function fetchDashboardMetrics() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        // Disparamos ambas peticiones AL MISMO TIEMPO (Más rápido)
        const [ordersRes, catalogRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/partner/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/api/partner/catalog`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const ordersData = await ordersRes.json();
        const catalogData = await catalogRes.json();

        const orders = (ordersRes.ok && ordersData.success) ? ordersData.orders : [];
        const catalog = (catalogRes.ok && catalogData.success) ? catalogData.products : [];

        calculateMetrics(orders, catalog);

    } catch (error) {
        console.error("Error al obtener métricas:", error);
    }
}

function calculateMetrics(orders, catalog) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlySales = 0;
    let netEscrow = 0;
    let pendingOrdersCount = 0;
    let lowStockCount = 0;

    // 1️⃣ CALCULAR MÉTRICAS FINANCIERAS Y OPERATIVAS
    orders.forEach(order => {
        const orderTotal = parseFloat(order.my_total_usd || 0);
        const globalStatus = order.global_payment_status;
        const shippingStatus = order.partner_shipping_status;
        
        // Ventas SOLO DEL MES ACTUAL
        if (order.created_at) {
            const orderDate = new Date(order.created_at);
            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                monthlySales += orderTotal;
            }
        }

        // Escrow (Retenido Seguro, sin importar de qué mes sea)
        if (globalStatus !== 'liquidated' && globalStatus !== 'cancelled') {
            netEscrow += orderTotal;
        }

        // Órdenes por Despachar (Sin importar el mes)
        if ((globalStatus === 'processing' || globalStatus === 'liquidated') && shippingStatus !== 'shipped') {
            pendingOrdersCount++;
        }
    });

    // 2️⃣ CALCULAR ALERTA DE INVENTARIO (≤ 3 unidades)
    catalog.forEach(prod => {
        const isDemand = (prod.is_on_demand === true || String(prod.is_on_demand).toLowerCase() === 'true');
        if (isDemand) return; // Si es bajo pedido, tiene stock infinito, lo ignoramos.

        let hasLowStock = false;

        if (prod.variants_matrix && prod.variants_matrix.length > 0) {
            // Si tiene variantes (tallas/colores), revisa si ALGUNA se está agotando
            hasLowStock = prod.variants_matrix.some(v => parseInt(v.stock || 0) <= 3);
        } else {
            // Si es producto general (como proteína)
            hasLowStock = parseInt(prod.stock || 0) <= 3;
        }

        if (hasLowStock) {
            lowStockCount++;
        }
    });

    // 3️⃣ DISPARAR ANIMACIONES DE NÚMEROS
    animateValue("metric-sales", 0, monthlySales, 1500, true);
    animateValue("metric-escrow", 0, netEscrow, 1500, true);
    animateValue("metric-orders", 0, pendingOrdersCount, 1500, false);
    animateValue("metric-stock", 0, lowStockCount, 1500, false);

    // Toque visual extra: Si hay riesgo de quiebre, poner el número en rojo sangre.
    const stockEl = document.getElementById("metric-stock");
    if (lowStockCount > 0 && stockEl) {
        stockEl.classList.remove('text-white');
        stockEl.classList.add('text-red-500');
    }
}

// Función de animación fluida (Interpolación Ease-Out)
function animateValue(id, start, end, duration, isCurrency) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = (easeProgress * (end - start) + start);
        
        if (isCurrency) {
            obj.innerHTML = `$${currentVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            obj.innerHTML = Math.floor(currentVal);
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            if (isCurrency) obj.innerHTML = `$${end.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            else obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}
