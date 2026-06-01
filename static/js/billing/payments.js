// ====================================================================
// 🛡️ NÚCLEO CORE - ARCHITECTURA CONTROLADORA DEL CHECKOUT DE PAGOS
// ====================================================================

// El identificador AUTH_TOKEN_KEY es heredado desde auth_middleware.js de forma global.

const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Memoria volátil segura del estado del checkout
let globalActiveTier = 'PLUS';
let globalRateBCV = 0.00;
let globalPriceUSD = 0.00;

/**
 * Conmuta reactivamente los paneles del formulario en la interfaz gráfica
 * @param {string} method - Identificador de la pestaña ('pago-movil' o 'stripe')
 */
function switchPaymentMethod(method) {
    const btnPagoMovil = document.getElementById('tab-btn-pago-movil');
    const btnStripe = document.getElementById('tab-btn-stripe');
    const pnlPagoMovil = document.getElementById('panel-pago-movil');
    const pnlStripe = document.getElementById('panel-stripe');

    if (!btnPagoMovil || !btnStripe || !pnlPagoMovil || !pnlStripe) return;

    // Resetear clases y estados visuales
    [btnPagoMovil, btnStripe].forEach(b => b.className = "flex-1 py-4 border-b-2 border-transparent text-gray-500 font-black uppercase tracking-widest text-[10px] transition-all text-center");
    
    pnlPagoMovil.classList.add('hidden');
    pnlStripe.classList.replace('flex', 'hidden');
    pnlStripe.classList.add('hidden');

    if (method === 'pago-movil') {
        btnPagoMovil.className = "flex-1 py-4 border-b-2 border-[#FFC300] text-[#FFC300] font-black uppercase tracking-widest text-[10px] transition-all text-center bg-white/[0.01] active-tab";
        pnlPagoMovil.classList.remove('hidden');
    } else {
        btnStripe.className = "flex-1 py-4 border-b-2 border-white text-white font-black uppercase tracking-widest text-[10px] transition-all text-center bg-white/[0.01] active-tab";
        pnlStripe.classList.remove('hidden');
        pnlStripe.classList.replace('hidden', 'flex');
    }
}

/**
 * REMEDIACIÓN CRÍTICA: Se corrige la palabra clave 'def' por 'function' (Sintaxis JS V8 estándar).
 * Ejecuta la redirección segura hacia el canal de soporte internacional de Stripe.
 */
function redirectToStripeWhatsapp() {
    const wsMsg = "Hola, deseo realizar el pago de mi servicio GYMENEZ a traves de TDC/TDD internacional en dolares. solicito link de pago a traves de stripe.";
    window.open(`https://wa.me/584148780392?text=${encodeURIComponent(wsMsg)}`, '_blank');
}

/**
 * Despacha el reporte de transacción atómica en Bolívares hacia el backend core
 */
async function handlePaymentSubmit(event) {
    event.preventDefault();
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const btnSubmit = document.getElementById('btn-submit-report');
    const bankVal = document.getElementById('form-bank').value;
    const refVal = document.getElementById('form-reference').value.trim();

    if (!bankVal || !refVal) {
        showUIFeedback("Por favor, complete los datos requeridos del Pago Móvil.", "error");
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = "PROPAGANDO TRANSACCIÓN...";
    }

    const payload = {
        plan: globalActiveTier,
        banco: bankVal,
        referencia: refVal
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/payments/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (res.ok && data.success) {
            showUIFeedback("Pago reportado con éxito. En espera de aprobación por el Core.", "success");
            setTimeout(() => {
                window.location.href = '/apps/start/inicio.html';
            }, 2500);
        } else {
            showUIFeedback(data.error || "Fallo en la validación transaccional.", "error");
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Reportar Transferencia Obligatoria";
            }
        }
    } catch (error) {
        console.error("Error crítico de red en pasarela:", error);
        showUIFeedback("Fallo perimetral de red conectando con la Bóveda.", "error");
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Reportar Transferencia Obligatoria";
        }
    }
}

// Inicializador del pipeline del checkout al cargar el DOM
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let tierParam = urlParams.get('tier');
    globalActiveTier = tierParam ? tierParam.toUpperCase() : 'PLUS';

    if (!['PLUS', 'ULTRA'].includes(globalActiveTier)) {
        globalActiveTier = 'PLUS';
    }

    try {
        const resRate = await fetch(`${API_BASE_URL}/api/bcv-rate`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataRate = await resRate.json();

        if (resRate.ok && dataRate.success) {
            // REMEDIACIÓN CRÍTICA: Se sustituye 'float()' por 'parseFloat()' nativo de JS.
            globalRateBCV = parseFloat(dataRate.rate);
            
            globalPriceUSD = globalActiveTier === 'ULTRA' ? 25.00 : 4.99; 
            const totalBs = round(globalPriceUSD * globalRateBCV, 2);

            document.getElementById('summary-plan-name').textContent = globalActiveTier;
            document.getElementById('summary-price-usd').textContent = `$${globalPriceUSD.toFixed(2)}`;
            document.getElementById('summary-bcv').textContent = `${globalRateBCV.toFixed(2)} Bs / USD`;
            document.getElementById('summary-total-bs').textContent = `${totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs`;

            document.getElementById('payment-loader').classList.add('hidden');
            const ws = document.getElementById('payment-workspace');
            ws.classList.remove('hidden');
            ws.classList.add('flex');

            switchPaymentMethod('pago-movil');
        } else {
            showUIFeedback("Incapacidad del Core para certificar la divisa cambiaria.", "error");
        }
    } catch (err) {
        console.error("Fallo de sincronización inicial:", err);
        document.getElementById('payment-loader').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error de comunicación con el Núcleo Financiero.</p>';
    }
});

function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}
