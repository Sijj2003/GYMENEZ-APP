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
 * Inyecta la función de feedback visual transaccional de la marca
 */
function showUIFeedback(msg, type = 'success') {
    const box = document.getElementById('message-box');
    if (!box) return;
    box.textContent = msg;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${
        type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'
    }`;
    box.style.opacity = '1';
    box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translate(-50%, -20px)';
    }, 4000);
}

/**
 * Conmuta reactivamente los paneles del formulario en la interfaz gráfica
 */
function switchPaymentMethod(method) {
    const btnPagoMovil = document.getElementById('tab-btn-pago-movil');
    const btnStripe = document.getElementById('tab-btn-stripe');
    const pnlPagoMovil = document.getElementById('panel-pago-movil');
    const pnlStripe = document.getElementById('panel-stripe');

    if (!btnPagoMovil || !btnStripe || !pnlPagoMovil || !pnlStripe) return;

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

function redirectToStripeWhatsapp() {
    const wsMsg = "Hola, deseo realizar el pago de mi servicio GYMENEZ a traves de TDC/TDD internacional en dolares. solicito link de pago a traves de stripe.";
    window.open(`https://wa.me/584148780392?text=${encodeURIComponent(wsMsg)}`, '_blank');
}

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
        // 🛡️ REQUISITO: Verificar de forma preventiva si existe un bloqueo por solicitud pendiente
        const resCheck = await fetch(`${API_BASE_URL}/api/payments/check-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (resCheck.ok) {
            const dataCheck = await resCheck.json();
            if (dataCheck.has_pending) {
                // Inyectar atómicamente pantalla de bloqueo Bento Premium
                document.getElementById('payment-loader').classList.add('hidden');
                const mainWorkspace = document.getElementById('payment-workspace');
                if (mainWorkspace) {
                    mainWorkspace.innerHTML = `
                        <div class="premium-glass rounded-[32px] p-8 md:p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-6 fade-in-up w-full col-span-full border-t border-[#FFC300]/20">
                            <div class="w-16 h-16 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-full flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(255,195,0,0.1)]">⏳</div>
                            <h3 class="text-2xl font-black uppercase tracking-tighter text-white">Solicitud en Proceso</h3>
                            <p class="text-gray-400 text-xs font-medium leading-relaxed uppercase tracking-wide">Tiene una solicitud en proceso. Espere a que sea procesada para realizar otra solicitud.</p>
                            <a href="/apps/start/inicio.html" class="px-8 py-4 bg-[#FFC300] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg hover:scale-[1.02] transition-all">Volver al Hub</a>
                        </div>
                    `;
                    mainWorkspace.classList.remove('hidden');
                    mainWorkspace.classList.add('flex');
                }
                return;
            }
        }

        const resRate = await fetch(`${API_BASE_URL}/api/bcv-rate`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataRate = await resRate.json();

        if (resRate.ok && dataRate.success) {
            globalRateBCV = parseFloat(dataRate.rate);
            
            // CORRECCIÓN SINCRO FINANCIERA: ULTRA recalibrado de $25.00 a $9.99 según backend maestro
            globalPriceUSD = globalActiveTier === 'ULTRA' ? 9.99 : 4.99; 
            const totalBs = round(globalPriceUSD * globalRateBCV, 2);

            document.getElementById('summary-plan-name').textContent = globalActiveTier;
            document.getElementById('summary-price-usd').textContent = `$${globalPriceUSD.toFixed(2)}`;
            document.getElementById('summary-bcv').textContent = `${globalRateBCV.toFixed(2)} Bs / USD`;
            document.getElementById('summary-total-bs').textContent = `${totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs`;

            document.getElementById('payment-loader').classList.add('hidden');
            const ws = document.getElementById('payment-workspace');
            ws.classList.remove('hidden');
            ws.classList.add('flex');

            // CORRECCIÓN DE BUG: 'pago-mobil' cambiado a 'pago-movil' con 'v' para enlazar con la función
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
