// ====================================================================
// 💳 MÓDULO 6: GESTIÓN DE PAGO Y ORDEN FINAL (Experiencia Premium)
// ====================================================================

let availablePaymentMethods = {};
let currentPaymentMethod = 'pago_movil'; // Por defecto

/**
 * 🛠️ Configura los datos iniciales y muestra el formulario
 */
function setupPaymentUI(methods) {
    document.getElementById('loading-payment')?.classList.add('hidden');
    const formCheckout = document.getElementById('form-checkout-final');
    
    if(formCheckout) {
        formCheckout.classList.remove('hidden');
        // Pequeño timeout para permitir que la clase display block aplique antes de la opacidad
        setTimeout(() => formCheckout.classList.remove('opacity-0'), 50);
    }

    availablePaymentMethods = methods || {};

    // Cargar datos bancarios
    if (methods.pago_movil) {
        if (document.getElementById('pm-banco')) document.getElementById('pm-banco').innerText = methods.pago_movil.banco;
        if (document.getElementById('pm-tlf')) document.getElementById('pm-tlf').innerText = methods.pago_movil.telefono;
        if (document.getElementById('pm-doc')) document.getElementById('pm-doc').innerText = methods.pago_movil.documento;
        if (document.getElementById('pm-nombre')) document.getElementById('pm-nombre').innerText = methods.pago_movil.nombre;
    }
    
    // Cargar datos de Binance
    if (methods.binance) {
        if (document.getElementById('bin-id')) document.getElementById('bin-id').innerText = methods.binance.pay_id;
        if (document.getElementById('bin-email')) document.getElementById('bin-email').innerText = methods.binance.email;
    }

    setupReferenceInputSanitizer();
    // Inicializar visualmente la opción por defecto
    selectPaymentMethod('pago_movil');
}

/**
 * 🎨 Transición fluida entre métodos de pago en línea (UI Premium)
 */
window.selectPaymentMethod = function(method) {
    currentPaymentMethod = method;

    // 1. Resetear estilos de todas las tarjetas
    const cards = {
        'pago_movil': { card: 'card-pm', check: 'check-pm', color: '#FFC300' },
        'binance': { card: 'card-binance', check: 'check-binance', color: '#FCD535' }, // Amarillo Binance
        'paypal': { card: 'card-intl', check: 'check-intl', color: '#60A5FA' } // Azul PayPal/Stripe
    };

    Object.keys(cards).forEach(key => {
        const cardEl = document.getElementById(cards[key].card);
        const checkEl = document.getElementById(cards[key].check);
        const dotEl = checkEl?.firstElementChild;

        if (!cardEl || !checkEl || !dotEl) return;

        if (key === method) {
            // Estado Seleccionado
            cardEl.className = `payment-card cursor-pointer relative w-full p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden group shadow-[0_0_20px_rgba(0,0,0,0.3)] border-[${cards[key].color}] bg-[${cards[key].color}]/10`;
            checkEl.className = `w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-[${cards[key].color}]`;
            dotEl.className = `w-2.5 h-2.5 rounded-full transition-transform duration-300 scale-100 bg-[${cards[key].color}]`;
            
            // Cambiar color del texto al activo
            cardEl.querySelector('span.text-xs').classList.add('text-white');
            cardEl.querySelector('span.text-xs').classList.remove('text-gray-400');
        } else {
            // Estado Inactivo
            cardEl.className = "payment-card cursor-pointer relative w-full p-5 rounded-2xl border-2 border-white/5 bg-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden group";
            checkEl.className = "w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center transition-all duration-300";
            dotEl.className = "w-2.5 h-2.5 rounded-full bg-transparent transition-transform duration-300 scale-0";
            
            // Texto inactivo
            cardEl.querySelector('span.text-xs').classList.remove('text-white');
            cardEl.querySelector('span.text-xs').classList.add('text-gray-400');
        }
    });

    // 2. Gestionar la visualización dinámica del formulario (Efecto slide)
    updatePaymentFormFields();
};

/**
 * 🔄 Ajusta los inputs y los textos dependiendo del método seleccionado
 */
function updatePaymentFormFields() {
    const dataPm = document.getElementById('data-pago-movil');
    const dataBinance = document.getElementById('data-binance');
    const dataIntl = document.getElementById('data-intl');
    
    const originContainer = document.getElementById('payment-origin-data');
    const refContainer = document.getElementById('reference-container');
    const verificationInputs = document.getElementById('verification-inputs');
    
    const bancoOrigen = document.getElementById('pay-banco-origen');
    const tlfOrigen = document.getElementById('pay-telefono-origen');
    const refLabel = document.getElementById('lbl-reference');
    const refInput = document.getElementById('pay-reference');
    const btnText = document.getElementById('btn-process-text');

    // Ocultar todos los datos primero
    [dataPm, dataBinance, dataIntl].forEach(el => el && el.classList.add('hidden'));

    if (currentPaymentMethod === 'pago_movil') {
        dataPm?.classList.remove('hidden');
        verificationInputs?.classList.remove('hidden');
        originContainer?.classList.remove('hidden');
        refContainer?.classList.remove('hidden');
        
        if (bancoOrigen) bancoOrigen.required = true;
        if (tlfOrigen) tlfOrigen.required = true;
        if (refInput) {
            refInput.required = true;
            refInput.placeholder = "Últimos dígitos (Ej: 1234)";
        }
        if (refLabel) refLabel.innerText = "N° de Referencia Bancaria";

        const montoStr = (typeof isBcvValid !== 'undefined' && isBcvValid && typeof currentBcvRate !== 'undefined') 
            ? `Bs. ${formatMoney(cartTotal * currentBcvRate)}` 
            : `Procesar Compra`;
        btnText.innerText = `Pagar ${montoStr}`;

    } else if (currentPaymentMethod === 'binance') {
        dataBinance?.classList.remove('hidden');
        verificationInputs?.classList.remove('hidden');
        originContainer?.classList.add('hidden'); // No necesitamos banco emisor
        refContainer?.classList.remove('hidden');
        
        if (bancoOrigen) bancoOrigen.required = false;
        if (tlfOrigen) tlfOrigen.required = false;
        if (refInput) {
            refInput.required = true;
            refInput.placeholder = "Ej: 2938471029";
        }
        if (refLabel) refLabel.innerText = "TxID / Order ID de Binance";
        
        btnText.innerText = `Confirmar Pago USDT`;

    } else if (currentPaymentMethod === 'paypal') {
        dataIntl?.classList.remove('hidden');
        // Para PayPal/Tarjetas, usualmente no pedimos referencia, enviamos directo a pasarela
        verificationInputs?.classList.add('hidden'); 
        
        if (bancoOrigen) bancoOrigen.required = false;
        if (tlfOrigen) tlfOrigen.required = false;
        if (refInput) refInput.required = false;

        btnText.innerText = `Ir a Pasarela Segura`;
    }

    validateFinalButton();
}

/**
 * 🔢 Sanitizador estricto para referencias numéricas
 */
function setupReferenceInputSanitizer() {
    const refInput = document.getElementById('pay-reference');
    const bancoSelect = document.getElementById('pay-banco-origen');
    const tlfInput = document.getElementById('pay-telefono-origen');

    if (refInput) {
        refInput.addEventListener('input', (e) => {
            // Solo restringir a números si es Pago Móvil
            if(currentPaymentMethod === 'pago_movil') {
                e.target.value = e.target.value.replace(/\D/g, ''); 
            }
            validateFinalButton();
        });
    }

    if (bancoSelect) bancoSelect.addEventListener('change', validateFinalButton);
    if (tlfInput) tlfInput.addEventListener('input', validateFinalButton);
}

/**
 * 🔒 Valida dinámicamente si el botón final debe estar habilitado
 */
function validateFinalButton() {
    const btn = document.getElementById('btn-process-order');
    if (!btn) return;

    // Si es PayPal/TDC, se habilita directo para ir a la pasarela
    if (currentPaymentMethod === 'paypal') {
        btn.disabled = false;
        return;
    }

    const refInput = document.getElementById('pay-reference');
    const ref = refInput ? refInput.value.trim() : '';
    const isShippingReady = typeof isShippingComplete !== 'undefined' ? isShippingComplete : true;

    if (currentPaymentMethod === 'pago_movil') {
        const banco = document.getElementById('pay-banco-origen')?.value;
        const tlf = document.getElementById('pay-telefono-origen')?.value.trim();
        const isOriginComplete = Boolean(banco) && Boolean(tlf);
        
        btn.disabled = !(/^\d{4,}$/.test(ref) && isShippingReady && isOriginComplete);
    } 
    else if (currentPaymentMethod === 'binance') {
        // Binance TXID suele ser alfanumérico y largo
        btn.disabled = !(ref.length >= 6 && isShippingReady);
    }
}

// ====================================================================
// 🛡️ SUBMIT FINAL (Adaptado)
// ====================================================================
document.getElementById('form-checkout-final')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Si es PayPal/TDC simulamos redirección a pasarela externa (Stripe/PayPal)
    if(currentPaymentMethod === 'paypal') {
        const btnText = document.getElementById('btn-process-text');
        btnText.innerText = "Redirigiendo...";
        setTimeout(() => {
            alert("Apertura de pasarela internacional en desarrollo...");
            btnText.innerText = "Ir a Pasarela Segura";
        }, 1500);
        return;
    }

    const btn = document.getElementById('btn-process-order');
    const reference = document.getElementById('pay-reference').value.trim();
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    btn.innerHTML = `<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Procesando...</span>`;
    btn.disabled = true;
    document.getElementById('btn-cancel-vault').disabled = true; 
    
    if (typeof vaultInterval !== 'undefined') clearInterval(vaultInterval);

    const cleanItems = cartItems.map(item => ({
        id: item.id,
        real_id: item.real_id || item.id,
        name: item.name,
        price: item.price,
        qty: item.quantity || item.qty || 1,
        storeName: item.storeName || item.store_name || 'Gymenez Store',
        weight_kg: item.weight_kg || 1,
        free_shipping: item.free_shipping === true || item.free_shipping === 'true',
        is_on_demand: item.is_on_demand === true || item.is_on_demand === 'true',
        free_shipping_threshold: parseFloat(item.free_shipping_threshold || 0)
    }));

    const wantsFreeShipping = document.getElementById('toggle-free-shipping')?.checked || false;
    
    const telefonoOrigen = document.getElementById('pay-telefono-origen') ? document.getElementById('pay-telefono-origen').value.trim() : '';
    const bancoOrigen = document.getElementById('pay-banco-origen') ? document.getElementById('pay-banco-origen').value : '';

    const payload = {
        items: cleanItems,
        totalAmount: cartTotal,
        paymentMethod: currentPaymentMethod,
        reference: reference,
        wants_free_shipping: wantsFreeShipping,
        telefono_origen: telefonoOrigen,
        banco_origen: bancoOrigen
    };

    // EL RESTO DEL CÓDIGO FETCH SE MANTIENE EXACTAMENTE IGUAL (Lógica del worker de PythonAnywhere, polling, etc)
    // Pega aquí la continuación del try/catch de fetch de tu script original.
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/store/checkout`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': typeof deviceId !== 'undefined' ? deviceId : 'web',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // ... (resto de tu lógica original de Polling / Success View se mantiene intacta) ...
