// ====================================================================
// 💳 MÓDULO 6: GESTIÓN DE PAGO Y ORDEN FINAL (Premium Inline UI)
// ====================================================================

window.availablePaymentMethods = window.availablePaymentMethods || {};
window.currentPaymentMethod = window.currentPaymentMethod || null; 

// 🍎 NUEVO: Variable global para almacenar el intent_id temporal del C2P
window.c2pIntentId = null; 
window.c2pExternalRef = null;

/**
 * 🛠️ Configura los datos iniciales y muestra el formulario
 */
window.setupPaymentUI = function(methods) {
    document.getElementById('loading-payment')?.classList.add('hidden');
    const formCheckout = document.getElementById('form-checkout-final');
    
    if(formCheckout) {
        formCheckout.classList.remove('hidden');
        setTimeout(() => formCheckout.classList.remove('opacity-0'), 50);
    }

    window.availablePaymentMethods = methods || {};

    if (methods.pago_movil) {
        if (document.getElementById('pm-banco')) document.getElementById('pm-banco').innerText = methods.pago_movil.banco;
        if (document.getElementById('pm-tlf')) document.getElementById('pm-tlf').innerText = methods.pago_movil.telefono;
        if (document.getElementById('pm-doc')) document.getElementById('pm-doc').innerText = methods.pago_movil.documento;
        if (document.getElementById('pm-nombre')) document.getElementById('pm-nombre').innerText = methods.pago_movil.nombre;
    }
    
    if (methods.binance) {
        if (document.getElementById('bin-id')) document.getElementById('bin-id').innerText = methods.binance.pay_id;
        if (document.getElementById('bin-email')) document.getElementById('bin-email').innerText = methods.binance.email;
    }

    const binanceCard = document.getElementById('card-binance');
    if (binanceCard && !binanceCard.querySelector('.badge-recomendado')) {
        const badge = document.createElement('div');
        badge.className = 'badge-recomendado absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] z-20 animate-pulse';
        badge.innerText = 'Recomendado';
        binanceCard.appendChild(badge);
    }

    setupReferenceInputSanitizer();
    updatePaymentFormFields(); 
};

/**
 * 🎨 Transición fluida entre métodos de pago en línea (UI Premium)
 */
window.selectPaymentMethod = function(method) {
    window.currentPaymentMethod = method;
    window.c2pIntentId = null; // 🍎 Reiniciamos el intent si cambia de método

    const cards = {
        'c2p': { card: 'card-c2p', check: 'check-c2p', color: '#FFC300' }, 
        'pago_movil': { card: 'card-pm', check: 'check-pm', color: '#FFC300' },
        'binance': { card: 'card-binance', check: 'check-binance', color: '#FCD535' },
        'paypal': { card: 'card-intl', check: 'check-intl', color: '#60A5FA' } 
    };

    Object.keys(cards).forEach(key => {
        const cardEl = document.getElementById(cards[key].card);
        const checkEl = document.getElementById(cards[key].check);
        const dotEl = checkEl?.firstElementChild;

        if (!cardEl || !checkEl || !dotEl) return;

        if (key === method) {
            cardEl.className = `payment-card cursor-pointer relative w-full p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden group shadow-[0_0_20px_rgba(0,0,0,0.3)] border-[${cards[key].color}] bg-[${cards[key].color}]/10`;
            checkEl.className = `w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 border-[${cards[key].color}]`;
            dotEl.className = `w-2.5 h-2.5 rounded-full transition-transform duration-300 scale-100 bg-[${cards[key].color}]`;
            
            cardEl.querySelector('span.text-xs')?.classList.add('text-white');
            cardEl.querySelector('span.text-xs')?.classList.remove('text-gray-400');
        } else {
            cardEl.className = "payment-card cursor-pointer relative w-full p-5 rounded-2xl border-2 border-white/5 bg-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden group";
            checkEl.className = "w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center transition-all duration-300";
            dotEl.className = "w-2.5 h-2.5 rounded-full bg-transparent transition-transform duration-300 scale-0";
            
            cardEl.querySelector('span.text-xs')?.classList.remove('text-white');
            cardEl.querySelector('span.text-xs')?.classList.add('text-gray-400');
        }
    });

    updatePaymentFormFields();
    
    if (typeof renderCartSummary === 'function') {
        renderCartSummary();
    }
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
    
    const cedulaContainer = document.getElementById('c2p-cedula-container'); 
    const tokenContainer = document.getElementById('c2p-token-container'); 
    
    const bancoOrigen = document.getElementById('pay-banco-origen');
    const tlfOrigen = document.getElementById('pay-telefono-origen');
    const docOrigen = document.getElementById('pay-documento-origen'); 
    const tokenC2P = document.getElementById('pay-token-c2p');       
    
    const refLabel = document.getElementById('lbl-reference');
    const refInput = document.getElementById('pay-reference');
    
    const btnRequestSMS = document.getElementById('btn-request-sms');
    const btnSubmitContainer = document.getElementById('btn-process-order')?.parentElement;
    
    const btnText = document.getElementById('btn-process-text');
    const cancelBtn = document.getElementById('btn-cancel-vault');

    [dataPm, dataBinance, dataIntl].forEach(el => el && el.classList.add('hidden'));

    if (!window.currentPaymentMethod) {
        verificationInputs?.classList.add('hidden');
        if (btnText) btnText.innerText = `Seleccione Método de Pago`;
        if (btnText) btnText.parentElement.disabled = true;
        if (btnSubmitContainer) btnSubmitContainer.style.display = '';
        if (btnRequestSMS) btnRequestSMS.classList.add('hidden');
        if (cancelBtn) cancelBtn.style.display = ''; 
        return;
    }

    if (window.currentPaymentMethod === 'c2p') {
        verificationInputs?.classList.remove('hidden');
        originContainer?.classList.remove('hidden');
        refContainer?.classList.add('hidden');    
        dataPm?.classList.add('hidden');          
        
        // 🍎 C2P: Mostramos cédula, ocultamos token hasta el click
        cedulaContainer?.classList.remove('hidden');
        tokenContainer?.classList.add('hidden'); 
        
        if (bancoOrigen) bancoOrigen.required = true;
        if (tlfOrigen) tlfOrigen.required = true;
        if (docOrigen) docOrigen.required = true;
        if (tokenC2P) { tokenC2P.required = true; tokenC2P.value = ''; }
        if (refInput) refInput.required = false;

        let totalPmUsd = 0;
        cartItems.forEach(item => {
            const qty = item.quantity || item.qty || 1;
            const pmPrice = parseFloat(item.pmPrice || item.basePrice || item.price);
            totalPmUsd += (pmPrice * qty);
        });

        const montoStr = (typeof isBcvValid !== 'undefined' && isBcvValid && typeof currentBcvRate !== 'undefined') 
            ? `Bs. ${formatMoney(totalPmUsd * currentBcvRate)}` 
            : `Procesar Compra`;
        if (btnText) btnText.innerText = `Debitar ${montoStr}`; 

        if (btnSubmitContainer) btnSubmitContainer.style.display = 'none';
        if (btnRequestSMS) btnRequestSMS.classList.remove('hidden');
        if (cancelBtn) cancelBtn.style.display = ''; 
        
    } else if (window.currentPaymentMethod === 'pago_movil') {
        dataPm?.classList.remove('hidden');
        verificationInputs?.classList.remove('hidden');
        originContainer?.classList.remove('hidden');
        cedulaContainer?.classList.add('hidden'); 
        tokenContainer?.classList.add('hidden'); 
        refContainer?.classList.remove('hidden');
        
        if (bancoOrigen) bancoOrigen.required = true;
        if (tlfOrigen) tlfOrigen.required = true;
        if (docOrigen) docOrigen.required = false;
        if (tokenC2P) tokenC2P.required = false;
        if (refInput) {
            refInput.required = true;
            refInput.placeholder = "Últimos dígitos (Ej: 1234)";
        }
        if (refLabel) refLabel.innerText = "N° de Referencia Bancaria";

        let totalPmUsd = 0;
        cartItems.forEach(item => {
            const qty = item.quantity || item.qty || 1;
            const pmPrice = parseFloat(item.pmPrice || item.basePrice || item.price);
            totalPmUsd += (pmPrice * qty);
        });

        const montoStr = (typeof isBcvValid !== 'undefined' && isBcvValid && typeof currentBcvRate !== 'undefined') 
            ? `Bs. ${formatMoney(totalPmUsd * currentBcvRate)}` 
            : `Procesar Compra`;
        if (btnText) btnText.innerText = `Reportar ${montoStr}`;

        if (btnSubmitContainer) btnSubmitContainer.style.display = '';
        if (btnRequestSMS) btnRequestSMS.classList.add('hidden');
        if (cancelBtn) cancelBtn.style.display = ''; 

    } else if (window.currentPaymentMethod === 'binance') {
        dataBinance?.classList.remove('hidden');
        verificationInputs?.classList.remove('hidden');
        originContainer?.classList.add('hidden'); 
        refContainer?.classList.remove('hidden');
        cedulaContainer?.classList.add('hidden');
        tokenContainer?.classList.add('hidden');
        
        if (bancoOrigen) bancoOrigen.required = false;
        if (tlfOrigen) tlfOrigen.required = false;
        if (docOrigen) docOrigen.required = false;
        if (tokenC2P) tokenC2P.required = false;
        
        if (refInput) {
            refInput.required = true;
            refInput.placeholder = "Ej: GYMPERFORMANCE"; 
        }
        if (refLabel) refLabel.innerText = "Usuario (Nickname) Binance de Envío"; 
        
        let totalBinanceUsd = 0;
        cartItems.forEach(item => {
            const qty = item.quantity || item.qty || 1;
            const bestPrice = parseFloat(item.price);
            totalBinanceUsd += (bestPrice * qty);
        });

        if (btnText) btnText.innerText = `Confirmar Pago $${formatMoney(totalBinanceUsd)} USDT`;

        if (btnSubmitContainer) btnSubmitContainer.style.display = '';
        if (btnRequestSMS) btnRequestSMS.classList.add('hidden');
        if (cancelBtn) cancelBtn.style.display = ''; 

    } else if (window.currentPaymentMethod === 'paypal') {
        dataIntl?.classList.remove('hidden');
        verificationInputs?.classList.add('hidden'); 
        cedulaContainer?.classList.add('hidden');
        tokenContainer?.classList.add('hidden');
        
        if (bancoOrigen) bancoOrigen.required = false;
        if (tlfOrigen) tlfOrigen.required = false;
        if (docOrigen) docOrigen.required = false;
        if (tokenC2P) tokenC2P.required = false;
        if (refInput) refInput.required = false;

        if (btnSubmitContainer) btnSubmitContainer.style.display = 'none';
        if (btnRequestSMS) btnRequestSMS.classList.add('hidden');
        if (cancelBtn) cancelBtn.style.display = ''; 
    }

    validateFinalButton();
}

function setupReferenceInputSanitizer() {
    const refInput = document.getElementById('pay-reference');
    const bancoSelect = document.getElementById('pay-banco-origen');
    const tlfInput = document.getElementById('pay-telefono-origen');
    const docInput = document.getElementById('pay-documento-origen');
    const tokenInput = document.getElementById('pay-token-c2p');
    const docTypeSelect = document.getElementById('c2p-doc-type');

    if (refInput) {
        refInput.addEventListener('input', (e) => {
            if(window.currentPaymentMethod === 'pago_movil') {
                e.target.value = e.target.value.replace(/\D/g, ''); 
            }
            validateFinalButton();
        });
    }

    if (tokenInput) {
        tokenInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, ''); 
            validateFinalButton();
        });
    }

    if (bancoSelect) bancoSelect.addEventListener('change', validateFinalButton);
    if (tlfInput) tlfInput.addEventListener('input', validateFinalButton);
    if (docInput) docInput.addEventListener('input', validateFinalButton);
    if (docTypeSelect) docTypeSelect.addEventListener('change', validateFinalButton);
}

function validateFinalButton() {
    const btn = document.getElementById('btn-process-order');
    const btnReqSMS = document.getElementById('btn-request-sms');
    
    if (!window.currentPaymentMethod) {
        if(btn) btn.disabled = true;
        if(btnReqSMS) btnReqSMS.disabled = true;
        return;
    }

    if (window.currentPaymentMethod === 'paypal') {
        if(btn) btn.disabled = false;
        return;
    }

    const refInput = document.getElementById('pay-reference');
    const ref = refInput ? refInput.value.trim() : '';
    const isShippingReady = typeof isShippingComplete !== 'undefined' ? isShippingComplete : true;

    if (window.currentPaymentMethod === 'c2p') {
        const banco = document.getElementById('pay-banco-origen')?.value;
        const tlf = document.getElementById('pay-telefono-origen')?.value.trim();
        const docNum = document.getElementById('pay-documento-origen')?.value.trim();
        const token = document.getElementById('pay-token-c2p')?.value.trim();
        
        // Habilitar "Solicitar SMS" solo con banco, teléfono y cédula.
        const isDataReadyForSMS = Boolean(banco) && tlf.length >= 10 && docNum.length >= 6;
        if (btnReqSMS) btnReqSMS.disabled = !(isShippingReady && isDataReadyForSMS);
        
        // Habilitar Procesar Compra solo cuando haya token y un intentId válido.
        const isOriginComplete = isDataReadyForSMS && token.length >= 6 && window.c2pIntentId;
        if(btn) btn.disabled = !(isShippingReady && isOriginComplete);
    } 
    else if (window.currentPaymentMethod === 'pago_movil') {
        const banco = document.getElementById('pay-banco-origen')?.value;
        const tlf = document.getElementById('pay-telefono-origen')?.value.trim();
        const isOriginComplete = Boolean(banco) && Boolean(tlf);
        
        if(btn) btn.disabled = !(/^\d{4,}$/.test(ref) && isShippingReady && isOriginComplete);
    } 
    else if (window.currentPaymentMethod === 'binance') {
        if(btn) btn.disabled = !(ref.length >= 6 && isShippingReady);
    }
}

// ====================================================================
// 🍎 LÓGICA PASO 1: SOLICITUD DE INTENTO SMS C2P
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    const btnReqSMS = document.getElementById('btn-request-sms');
    
    if (btnReqSMS) {
        btnReqSMS.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const originalHTML = btnReqSMS.innerHTML;
            btnReqSMS.innerHTML = `<svg class="w-5 h-5 animate-spin text-black" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Solicitando al Banco...`;
            btnReqSMS.disabled = true;

            try {
                let finalPayloadTotalUsd = 0;
                (typeof cartItems !== 'undefined' ? cartItems : []).forEach(item => {
                    const qty = item.quantity || item.qty || 1;
                    const pmPrice = parseFloat(item.pmPrice || item.basePrice || item.price);
                    finalPayloadTotalUsd += (pmPrice * qty);
                });

                // FUSIONAMOS PREFIJO + NÚMERO
                const docType = document.getElementById('c2p-doc-type')?.value || 'V';
                const docNum = document.getElementById('pay-documento-origen').value.trim();
                const documentoCompleto = `${docType}${docNum}`;

                const payload = {
                    paymentMethod: 'c2p',
                    totalAmount: finalPayloadTotalUsd,
                    banco_origen: document.getElementById('pay-banco-origen').value,
                    telefono_origen: document.getElementById('pay-telefono-origen').value.trim(),
                    documento_origen: documentoCompleto
                };

                const token = localStorage.getItem(typeof TOKEN_KEY !== 'undefined' ? TOKEN_KEY : 'jwt_token') || localStorage.getItem('jwt_token');

                const response = await fetch(`${typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : ''}/api/store/checkout/c2p/request`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    window.c2pIntentId = result.intentId;
                    window.c2pExternalRef = result.externalRef;

                    // Mostrar éxito visual y revelar campo token
                    btnReqSMS.style.display = 'none';
                    document.getElementById('c2p-token-container')?.classList.remove('hidden');
                    
                    const btnSubmitContainer = document.getElementById('btn-process-order')?.parentElement;
                    if (btnSubmitContainer) btnSubmitContainer.style.display = '';

                    const tokenInput = document.getElementById('pay-token-c2p');
                    if (tokenInput) tokenInput.focus();

                    validateFinalButton();

                    if (typeof Swal !== 'undefined' && result.otpRequested) {
                        Swal.fire({
                            toast: true, position: 'top-end', icon: 'success',
                            title: 'Clave solicitada', text: 'Revisa tus SMS o la app del banco.',
                            showConfirmButton: false, timer: 4000
                        });
                    }
                } else {
                    throw new Error(result.error || 'El banco rechazó la solicitud.');
                }
            } catch (error) {
                if (typeof Swal !== 'undefined') Swal.fire("Banco Rechazó Petición", error.message, "error");
                else alert(`Error C2P: ${error.message}`);
                btnReqSMS.innerHTML = originalHTML;
                btnReqSMS.disabled = false;
            }
        });
    }
});


// ====================================================================
// 🛡️ LÓGICA PASO 2: SUBMIT FINAL DE LA ORDEN Y POLLING
// ====================================================================
document.getElementById('form-checkout-final')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!window.currentPaymentMethod) {
        if (typeof Swal !== 'undefined') Swal.fire("Atención", "Por favor seleccione un método de pago.", "warning");
        else alert("Por favor seleccione un método de pago.");
        return;
    }
    
    if(window.currentPaymentMethod === 'paypal') {
        const btnText = document.getElementById('btn-process-text');
        if (btnText) btnText.innerText = "Redirigiendo...";
        setTimeout(() => {
            if (typeof Swal !== 'undefined') Swal.fire("En Desarrollo", "Apertura de pasarela internacional en desarrollo...", "info");
            else alert("Apertura de pasarela internacional en desarrollo...");
            if (btnText) btnText.innerText = "Ir a Pasarela Segura";
        }, 1500);
        return;
    }

    const btn = document.getElementById('btn-process-order');
    const reference = window.currentPaymentMethod === 'c2p' ? "C2P-AUTO" : document.getElementById('pay-reference').value.trim();
    const token = localStorage.getItem(typeof TOKEN_KEY !== 'undefined' ? TOKEN_KEY : 'jwt_token') || localStorage.getItem('jwt_token');
    
    btn.innerHTML = `<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Procesando...</span>`;
    btn.disabled = true;
    
    const cancelBtn = document.getElementById('btn-cancel-vault');
    if (cancelBtn) cancelBtn.disabled = true; 
    
    if (typeof vaultInterval !== 'undefined') clearInterval(vaultInterval);

    const cleanItems = (typeof cartItems !== 'undefined' ? cartItems : []).map(item => {
        const itemBestPrice = parseFloat(item.price);
        const itemMaxPrice = parseFloat(item.basePrice || item.price);
        const itemPmPrice = parseFloat(item.pmPrice || item.basePrice || item.price); 
        
        return {
            id: item.id,
            real_id: item.real_id || item.id,
            name: item.name,
            price: itemBestPrice,
            pmPrice: itemPmPrice,      
            basePrice: itemMaxPrice,
            qty: item.quantity || item.qty || 1,
            storeName: item.storeName || item.store_name || 'Gymenez Store',
            weight_kg: item.weight_kg || 1,
            free_shipping: item.free_shipping === true || item.free_shipping === 'true',
            is_on_demand: item.is_on_demand === true || item.is_on_demand === 'true',
            free_shipping_threshold: parseFloat(item.free_shipping_threshold || 0)
        };
    });

    const toggleFreeShipping = document.getElementById('toggle-free-shipping');
    const wantsFreeShipping = toggleFreeShipping ? toggleFreeShipping.checked : false;
    
    const telefonoOrigen = document.getElementById('pay-telefono-origen') ? document.getElementById('pay-telefono-origen').value.trim() : '';
    const bancoOrigen = document.getElementById('pay-banco-origen') ? document.getElementById('pay-banco-origen').value : '';
    let documentoOrigen = document.getElementById('pay-documento-origen') ? document.getElementById('pay-documento-origen').value.trim() : '';
    
    // 🍎 FUSIONAR PREFIJO SI ES C2P
    if (window.currentPaymentMethod === 'c2p') {
        const docType = document.getElementById('c2p-doc-type')?.value || 'V';
        documentoOrigen = `${docType}${documentoOrigen}`;
    }

    const tokenC2P = document.getElementById('pay-token-c2p') ? document.getElementById('pay-token-c2p').value.trim() : '';

    if (window.currentPaymentMethod === 'c2p') {
        if (!telefonoOrigen || !bancoOrigen || !documentoOrigen || !tokenC2P || !window.c2pIntentId) {
            if (typeof Swal !== 'undefined') Swal.fire("Atención", "Faltan datos de seguridad bancaria para el débito.", "warning");
            resetBtn(btn);
            if (cancelBtn) cancelBtn.disabled = false;
            return;
        }
    }

    if (window.currentPaymentMethod === 'pago_movil' && (!telefonoOrigen || !bancoOrigen)) {
        if (typeof Swal !== 'undefined') Swal.fire("Atención", "Indique Banco y Teléfono desde el cual pagó.", "warning");
        resetBtn(btn);
        if (cancelBtn) cancelBtn.disabled = false;
        return;
    }

    let finalPayloadTotalUsd = 0;
    cleanItems.forEach(item => {
        if (window.currentPaymentMethod === 'binance') {
            finalPayloadTotalUsd += (item.price * item.qty);
        } else if (window.currentPaymentMethod === 'pago_movil' || window.currentPaymentMethod === 'c2p') {
            finalPayloadTotalUsd += (item.pmPrice * item.qty);
        } else {
            finalPayloadTotalUsd += (item.basePrice * item.qty);
        }
    });

    const payload = {
        items: cleanItems,
        totalAmount: finalPayloadTotalUsd, 
        paymentMethod: window.currentPaymentMethod,
        reference: reference,
        wants_free_shipping: wantsFreeShipping,
        telefono_origen: telefonoOrigen,
        banco_origen: bancoOrigen,
        documento_origen: documentoOrigen, // Ya fusionado si es C2P
        c2p_token: tokenC2P,
        intentId: window.c2pIntentId,        
        externalRef: window.c2pExternalRef   
    };

    try {
        const response = await fetch(`${typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : ''}/api/store/checkout`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': typeof deviceId !== 'undefined' ? deviceId : 'web',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // 🍎 CORRECCIÓN 1: Evitar que el status 401/403 congele la pantalla sin avisar
        if (response.status === 401 || response.status === 403) {
            if (typeof Swal !== 'undefined') Swal.fire("Sesión de Seguridad", "Por favor inicia sesión nuevamente.", "error");
            resetBtn(btn);
            if (cancelBtn) cancelBtn.disabled = false;
            return;
        }

        const data = await response.json();

        if (response.ok && data.success) {
            const orderId = data.order_id;
            btn.innerHTML = `<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Verificando Banco...</span>`;

            let intentos = 0;
            const maxIntentos = window.currentPaymentMethod === 'c2p' ? 10 : 3; 

            const verificarEstadoOrden = async () => {
                try {
                    const statusRes = await fetch(`${typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : ''}/api/store/checkout/status/${orderId}`, {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (statusRes.ok) {
                        const statusData = await statusRes.json();

                        if (statusData.status === 'approved') {
                            localStorage.removeItem('gymenez_cart');
                            localStorage.removeItem('gymen_vault_expires_at');
                            
                            document.getElementById('vault-view')?.classList.add('hidden');
                            document.getElementById('summary-panel')?.classList.add('opacity-0'); 
                            
                            const successView = document.getElementById('success-view');
                            if (successView) successView.classList.remove('hidden');
                            
                            const successRef = document.getElementById('success-ref');
                            if (successRef) {
                                successRef.innerText = statusData.payment_details?.vexpay_transaction_id || reference;
                            }
                            
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            return; 
                        } 
                        else if (statusData.status === 'rejected') {
                            if (typeof Swal !== 'undefined') Swal.fire("Transacción Rechazada", statusData.rejection_reason || "El banco rechazó la transacción.", "error");
                            
                            resetBtn(btn);
                            if (cancelBtn) cancelBtn.disabled = false;
                            
                            // 🍎 Resetear el C2P tras rechazo en el Polling
                            window.c2pIntentId = null;
                            const btnReqSMS = document.getElementById('btn-request-sms');
                            if (btnReqSMS && window.currentPaymentMethod === 'c2p') {
                                btnReqSMS.style.display = '';
                                btnReqSMS.disabled = false;
                                document.getElementById('c2p-token-container')?.classList.add('hidden');
                                const btnSubmitContainer = document.getElementById('btn-process-order')?.parentElement;
                                if (btnSubmitContainer) btnSubmitContainer.style.display = 'none';
                                const tokenInput = document.getElementById('pay-token-c2p');
                                if (tokenInput) tokenInput.value = '';
                                validateFinalButton();
                            }
                            return; 
                        }
                    }

                    intentos++;
                    
                    if (intentos < maxIntentos) {
                        const retryTime = window.currentPaymentMethod === 'c2p' ? 5000 : 9000;
                        setTimeout(verificarEstadoOrden, retryTime); 
                    } else {
                        localStorage.removeItem('gymenez_cart');
                        localStorage.removeItem('gymen_vault_expires_at');
                        
                        document.getElementById('vault-view')?.classList.add('hidden');
                        document.getElementById('summary-panel')?.classList.add('opacity-0'); 
                        
                        const successView = document.getElementById('success-view');
                        if (successView) {
                            successView.classList.remove('hidden');
                            successView.className = "col-span-1 lg:col-span-12 text-center py-24 md:py-32 bg-white/5 rounded-[3rem] border border-[#FFC300]/30 shadow-2xl relative overflow-hidden backdrop-blur-xl mt-4 w-full";
                            successView.innerHTML = `
                                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div class="w-1/2 h-1/2 bg-[#FFC300]/10 blur-[80px] rounded-full"></div>
                                </div>
                                <div class="w-20 h-20 mx-auto bg-[#FFC300]/10 border-2 border-[#FFC300] text-[#FFC300] rounded-full flex items-center justify-center mb-6 relative z-10">
                                    <svg class="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </div>
                                <h2 class="text-3xl md:text-4xl font-[900] uppercase tracking-tight text-white mb-4 relative z-10">Verificación en Proceso</h2>
                                <p class="text-gray-400 text-sm max-w-md mx-auto mb-10 leading-relaxed font-medium relative z-10">
                                    Tu inventario está reservado bajo la ref: <strong class="text-white bg-white/10 px-2 py-1 rounded">${window.c2pExternalRef || reference}</strong>.<br><br>
                                    El banco ha tomado más tiempo del usual para confirmar el SMS o el débito. Te notificaremos el resultado final en tu cuenta.
                                </p>
                                <a href="/store/account.html" class="inline-block relative z-10 bg-[#FFC300] text-black px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-[0_10px_30px_rgba(255,195,0,0.2)]">
                                    Ver Mis Órdenes
                                </a>
                            `;
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }

                } catch (error) {
                    console.error("Error consultando estado:", error);
                    window.location.href = '/store/account.html';
                }
            };

            const initialWait = window.currentPaymentMethod === 'c2p' ? 4000 : 9000;
            setTimeout(verificarEstadoOrden, initialWait);

        } else {
            // 🍎 CORRECCIÓN 2: Manejo de rechazo síncrono INMEDIATO (Fase 2 fallida)
            if (typeof Swal !== 'undefined') Swal.fire("Transacción Rechazada", data.error || "El banco rechazó la transacción.", "warning");
            
            resetBtn(btn);
            if (cancelBtn) cancelBtn.disabled = false;
            
            // Reconstruir la interfaz para que el usuario pueda pedir otro SMS
            if (window.currentPaymentMethod === 'c2p') {
                window.c2pIntentId = null; // Matamos la intención fallida
                const btnReqSMS = document.getElementById('btn-request-sms');
                if (btnReqSMS) {
                    btnReqSMS.style.display = '';
                    btnReqSMS.disabled = false;
                }
                document.getElementById('c2p-token-container')?.classList.add('hidden');
                
                const btnSubmitContainer = document.getElementById('btn-process-order')?.parentElement;
                if (btnSubmitContainer) btnSubmitContainer.style.display = 'none';
                
                const tokenInput = document.getElementById('pay-token-c2p');
                if (tokenInput) tokenInput.value = '';
                
                validateFinalButton();
            }
        }
    } catch (error) {
        console.error("Error de red:", error);
        if (typeof Swal !== 'undefined') Swal.fire("Error de Conexión", "Problemas de red comunicando con el servidor.", "error");
        resetBtn(btn);
        if (cancelBtn) cancelBtn.disabled = false;
        
        // 🍎 CORRECCIÓN 3: Resetear la interfaz C2P incluso si falla la red
        if (window.currentPaymentMethod === 'c2p') {
            window.c2pIntentId = null;
            const btnReqSMS = document.getElementById('btn-request-sms');
            if (btnReqSMS) {
                btnReqSMS.style.display = '';
                btnReqSMS.disabled = false;
            }
            document.getElementById('c2p-token-container')?.classList.add('hidden');
            const btnSubmitContainer = document.getElementById('btn-process-order')?.parentElement;
            if (btnSubmitContainer) btnSubmitContainer.style.display = 'none';
            const tokenInput = document.getElementById('pay-token-c2p');
            if (tokenInput) tokenInput.value = '';
            validateFinalButton();
        }
    }
}); // <-- ¡AQUÍ ESTABA EL PARÉNTESIS FALTANTE QUE CAUSABA EL ERROR!

// ====================================================================
// ❌ BOTÓN CANCELAR (Salir de la bóveda/cronómetro)
// ====================================================================
document.getElementById('btn-cancel-vault')?.addEventListener('click', () => {
    if (typeof vaultInterval !== 'undefined') clearInterval(vaultInterval);
    window.currentPaymentMethod = null;
    window.c2pIntentId = null; 
    const vaultSection = document.getElementById('checkout-vault-section') || document.querySelector('.vault-container') || document.getElementById('vault-view');
    if (vaultSection) vaultSection.classList.add('hidden');
    const summarySection = document.getElementById('checkout-summary-section') || document.querySelector('.summary-container') || document.getElementById('summary-panel');
    if (summarySection) {
        summarySection.classList.remove('hidden');
        summarySection.classList.remove('opacity-0');
    }
});

window.resetBtn = function(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = `
        <span id="btn-process-text">Procesar Compra</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
    `;
};

// ====================================================================
// 💳 INICIALIZACIÓN DE LA PASARELA PAYPAL (SMART BUTTONS)
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
    if (typeof paypal !== 'undefined') {
        paypal.Buttons({
            style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'pay' },

            createOrder: async function(data, actions) {
                const token = localStorage.getItem('jwt_token') || localStorage.getItem('gymen_auth_token');
                const cartData = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
                const itemsToProcess = cartData.items || cartData || [];

                const cleanItems = itemsToProcess.map(item => {
                    const itemBestPrice = Number(parseFloat(item.price).toFixed(2));
                    const itemMaxPrice = Number(parseFloat(item.basePrice || item.price).toFixed(2));
                    const itemPmPrice = Number(parseFloat(item.pmPrice || item.basePrice || item.price).toFixed(2)); 
                    
                    const taintedId = String(item.real_id || item.product_id || item.id);
                    const cleanBaseId = taintedId.includes('_') ? taintedId.split('_')[0] : taintedId;

                    return {
                        id: cleanBaseId,              
                        variant_id: String(item.id),  
                        real_id: cleanBaseId,         
                        name: item.name || 'Producto',
                        price: itemBestPrice,
                        pmPrice: itemPmPrice,         
                        basePrice: itemMaxPrice,
                        qty: parseInt(item.quantity || item.qty || 1),
                        storeName: item.storeName || item.store_name || 'Gymenez Store',
                        weight_kg: item.weight_kg || 1,
                        free_shipping: item.free_shipping === true || item.free_shipping === 'true',
                        is_on_demand: item.is_on_demand === true || item.is_on_demand === 'true',
                        free_shipping_threshold: parseFloat(item.free_shipping_threshold || 0)
                    };
                });

                if (cleanItems.length === 0) {
                    if (typeof Swal !== 'undefined') Swal.fire('Error', 'El carrito está vacío.', 'error');
                    return null; 
                }

                const wantsFreeShipping = document.getElementById('toggle-free-shipping') ? document.getElementById('toggle-free-shipping').checked : false;
                const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
                const apiUrl = `${baseUrl}/api/store/checkout/paypal/create`;
                
                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ 
                            items: cleanItems,
                            wants_free_shipping: wantsFreeShipping 
                        })
                    });
                    
                    if (!response.ok) {
                        const errorRawText = await response.text();
                        console.error("⛔ PYTHON DENEGÓ LA ORDEN:", errorRawText);
                        let errorMessage = `HTTP ${response.status}`;
                        try {
                            errorMessage = JSON.parse(errorRawText).error || errorMessage;
                        } catch(e) {
                            errorMessage = errorRawText.substring(0, 100);
                        }
                        throw new Error(errorMessage);
                    }
                    
                    const orderData = await response.json();
                    
                    if (!orderData.success) {
                        if (typeof Swal !== 'undefined') Swal.fire('Error de Backend', orderData.error, 'error');
                        return null;
                    }
                    return orderData.paypal_order_id; 
                } catch (error) {
                    console.error("Error creando orden:", error);
                    if (typeof Swal !== 'undefined') Swal.fire('Error del Servidor', `Python rechazó los productos: ${error.message}`, 'error');
                    return null;
                }
            },

            onApprove: async function(data, actions) {
                const token = localStorage.getItem('jwt_token') || localStorage.getItem('gymen_auth_token');

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Procesando pago...',
                        text: 'Asegurando tu orden con cifrado bancario.',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });
                }

                try {
                    const cartData = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
                    const itemsToProcess = cartData.items || cartData || [];

                    const cleanItems = itemsToProcess.map(item => {
                        const itemBestPrice = Number(parseFloat(item.price).toFixed(2));
                        const itemMaxPrice = Number(parseFloat(item.basePrice || item.price).toFixed(2));
                        const itemPmPrice = Number(parseFloat(item.pmPrice || item.basePrice || item.price).toFixed(2)); 
                        
                        const taintedId = String(item.real_id || item.product_id || item.id);
                        const cleanBaseId = taintedId.includes('_') ? taintedId.split('_')[0] : taintedId;

                        return {
                            id: cleanBaseId,
                            variant_id: String(item.id),
                            real_id: cleanBaseId,
                            name: item.name || 'Producto',
                            price: itemBestPrice,
                            pmPrice: itemPmPrice,         
                            basePrice: itemMaxPrice,
                            qty: parseInt(item.quantity || item.qty || 1),
                            storeName: item.storeName || item.store_name || 'Gymenez Store',
                            weight_kg: item.weight_kg || 1,
                            free_shipping: item.free_shipping === true || item.free_shipping === 'true',
                            is_on_demand: item.is_on_demand === true || item.is_on_demand === 'true',
                            free_shipping_threshold: parseFloat(item.free_shipping_threshold || 0)
                        };
                    });
                    
                    const wantsFreeShipping = document.getElementById('toggle-free-shipping') ? document.getElementById('toggle-free-shipping').checked : false;
                    const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
                    const captureUrl = `${baseUrl}/api/store/checkout/paypal/capture`;
                    
                    const response = await fetch(captureUrl, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ 
                            paypal_order_id: data.orderID,
                            user_id: typeof currentUser !== 'undefined' ? currentUser.uid : null,
                            items: cleanItems,
                            wants_free_shipping: wantsFreeShipping
                        })
                    });

                    if (!response.ok) {
                        const errorRawText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorRawText.substring(0, 100)}`);
                    }
                    
                    const captureData = await response.json();

                    if (captureData.success) {
                        if (typeof Swal !== 'undefined') Swal.close();
                        localStorage.removeItem('gymenez_cart');
                        localStorage.removeItem('gymen_vault_expires_at');
                        if (typeof vaultInterval !== 'undefined') clearInterval(vaultInterval);
                        
                        document.getElementById('vault-view')?.classList.add('hidden');
                        document.getElementById('summary-panel')?.classList.add('opacity-0');
                        
                        const successView = document.getElementById('success-view');
                        if (successView) {
                            successView.classList.remove('hidden');
                            successView.className = "col-span-1 lg:col-span-12 text-center py-24 md:py-32 bg-white/5 rounded-[3rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden backdrop-blur-xl mt-4 w-full";
                        }
                        const successRef = document.getElementById('success-ref');
                        if (successRef) successRef.innerText = data.orderID;
                        
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        if (typeof Swal !== 'undefined') Swal.fire('Pago Rechazado', captureData.error || 'Hubo un problema.', 'error');
                    }
                } catch (error) {
                    console.error("Error crítico en onApprove:", error);
                    if (typeof Swal !== 'undefined') Swal.fire('Error del Servidor', 'El pago se procesó, pero falló el registro en Gymenez Store.', 'error');
                }
            },

            onCancel: function (data) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Pago Cancelado',
                        text: 'Has cerrado la ventana de PayPal. Tus productos siguen reservados.',
                        icon: 'info',
                        confirmButtonColor: '#FFC300',
                        confirmButtonText: 'Entendido'
                    });
                }
            },
            onError: function (err) {
                console.error('Error PayPal:', err);
            }
        }).render('#paypal-button-container');
    }
});
