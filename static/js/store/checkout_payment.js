// ====================================================================
// 💳 MÓDULO 6: GESTIÓN DE PAGO Y ORDEN FINAL (Premium Inline UI)
// ====================================================================

// Usamos el objeto global window para evitar choques de variables declaradas en otros archivos
window.availablePaymentMethods = window.availablePaymentMethods || {};
window.currentPaymentMethod = window.currentPaymentMethod || 'pago_movil'; 

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

    setupReferenceInputSanitizer();
    selectPaymentMethod('pago_movil');
};

/**
 * 🎨 Transición fluida entre métodos de pago en línea (UI Premium)
 */
window.selectPaymentMethod = function(method) {
    window.currentPaymentMethod = method;

    const cards = {
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

    [dataPm, dataBinance, dataIntl].forEach(el => el && el.classList.add('hidden'));

    if (window.currentPaymentMethod === 'pago_movil') {
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
        if (btnText) btnText.innerText = `Pagar ${montoStr}`;

        // MOSTRAR BOTONES NATIVOS
        if (btnText) btnText.parentElement.style.display = '';
        const cancelBtn = document.getElementById('btn-cancel-vault');
        if (cancelBtn) cancelBtn.style.display = '';

    } else if (window.currentPaymentMethod === 'binance') {
        dataBinance?.classList.remove('hidden');
        verificationInputs?.classList.remove('hidden');
        originContainer?.classList.add('hidden'); 
        refContainer?.classList.remove('hidden');
        
        if (bancoOrigen) bancoOrigen.required = false;
        if (tlfOrigen) tlfOrigen.required = false;
        if (refInput) {
            refInput.required = true;
            refInput.placeholder = "Ej: GYMPERFORMANCE"; 
        }
        if (refLabel) refLabel.innerText = "Usuario (Nickname) Binance de Envío"; 
        
        if (btnText) btnText.innerText = `Confirmar Pago USDT`;

        // MOSTRAR BOTONES NATIVOS
        if (btnText) btnText.parentElement.style.display = '';
        const cancelBtn = document.getElementById('btn-cancel-vault');
        if (cancelBtn) cancelBtn.style.display = '';

    } else if (window.currentPaymentMethod === 'paypal') {
        dataIntl?.classList.remove('hidden');
        verificationInputs?.classList.add('hidden'); 
        
        if (bancoOrigen) bancoOrigen.required = false;
        if (tlfOrigen) tlfOrigen.required = false;
        if (refInput) refInput.required = false;

        // OCULTAR LOS BOTONES NATIVOS PARA QUE NO CHOQUEN CON PAYPAL
        if (btnText) btnText.parentElement.style.display = 'none';
        const cancelBtn = document.getElementById('btn-cancel-vault');
        if (cancelBtn) cancelBtn.style.display = 'none';
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
            if(window.currentPaymentMethod === 'pago_movil') {
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

    if (window.currentPaymentMethod === 'paypal') {
        btn.disabled = false;
        return;
    }

    const refInput = document.getElementById('pay-reference');
    const ref = refInput ? refInput.value.trim() : '';
    const isShippingReady = typeof isShippingComplete !== 'undefined' ? isShippingComplete : true;

    if (window.currentPaymentMethod === 'pago_movil') {
        const banco = document.getElementById('pay-banco-origen')?.value;
        const tlf = document.getElementById('pay-telefono-origen')?.value.trim();
        const isOriginComplete = Boolean(banco) && Boolean(tlf);
        
        btn.disabled = !(/^\d{4,}$/.test(ref) && isShippingReady && isOriginComplete);
    } 
    else if (window.currentPaymentMethod === 'binance') {
        btn.disabled = !(ref.length >= 6 && isShippingReady);
    }
}

// ====================================================================
// 🛡️ SUBMIT FINAL DE LA ORDEN Y POLLING DE VERIFICACIÓN
// ====================================================================
document.getElementById('form-checkout-final')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Redirección Internacional simulada
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
    const reference = document.getElementById('pay-reference').value.trim();
    const token = localStorage.getItem(typeof TOKEN_KEY !== 'undefined' ? TOKEN_KEY : 'jwt_token') || localStorage.getItem('jwt_token');
    
    btn.innerHTML = `<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Procesando...</span>`;
    btn.disabled = true;
    
    const cancelBtn = document.getElementById('btn-cancel-vault');
    if (cancelBtn) cancelBtn.disabled = true; 
    
    if (typeof vaultInterval !== 'undefined') clearInterval(vaultInterval);

    const cleanItems = (typeof cartItems !== 'undefined' ? cartItems : []).map(item => ({
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

    const toggleFreeShipping = document.getElementById('toggle-free-shipping');
    const wantsFreeShipping = toggleFreeShipping ? toggleFreeShipping.checked : false;
    
    const telefonoOrigen = document.getElementById('pay-telefono-origen') ? document.getElementById('pay-telefono-origen').value.trim() : '';
    const bancoOrigen = document.getElementById('pay-banco-origen') ? document.getElementById('pay-banco-origen').value : '';

    if (window.currentPaymentMethod === 'pago_movil' && (!telefonoOrigen || !bancoOrigen)) {
        if (typeof Swal !== 'undefined') Swal.fire("Atención", "Por favor indique el Banco y Teléfono desde el cual realizó el pago.", "warning");
        else alert("Por favor indique el Banco y Teléfono desde el cual realizó el pago.");
        resetBtn(btn);
        if (typeof startVaultTimer === 'function') startVaultTimer(new Date().getTime() + 60000); 
        if (cancelBtn) cancelBtn.disabled = false;
        return;
    }

    const payload = {
        items: cleanItems,
        totalAmount: typeof cartTotal !== 'undefined' ? cartTotal : 0,
        paymentMethod: window.currentPaymentMethod,
        reference: reference,
        wants_free_shipping: wantsFreeShipping,
        telefono_origen: telefonoOrigen,
        banco_origen: bancoOrigen
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

        // ====================================================================
        // 🛑 LÍNEA DEFENSIVA ANTI-DOBLE MENSAJE
        // ====================================================================
        if (response.status === 401 || response.status === 403) {
            return; // Detenemos el script aquí en silencio.
        }

        // Parseamos JSON solo UNA vez
        const data = await response.json();

        if (response.ok && data.success) {
            const orderId = data.order_id;
            btn.innerHTML = `<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Verificando Banco...</span>`;

            let intentos = 0;
            const maxIntentos = 3; 

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
                            if (successRef) successRef.innerText = reference;
                            
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            return; 
                        } 
                        else if (statusData.status === 'rejected') {
                            if (typeof Swal !== 'undefined') Swal.fire("Transacción Rechazada", statusData.bot_verification_msg || "El banco rechazó la transacción. Verifica los datos e intenta de nuevo.", "error");
                            else alert(statusData.bot_verification_msg || "El banco rechazó la transacción.");
                            
                            resetBtn(btn);
                            if (typeof startVaultTimer === 'function') startVaultTimer(new Date().getTime() + 60000); 
                            if (cancelBtn) cancelBtn.disabled = false;
                            return; 
                        }
                    }

                    intentos++;
                    
                    if (intentos < maxIntentos) {
                        setTimeout(verificarEstadoOrden, 9000); 
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
                                <h2 class="text-3xl md:text-4xl font-[900] uppercase tracking-tight text-white mb-4 relative z-10">Verificación Demorada</h2>
                                <p class="text-gray-400 text-sm max-w-md mx-auto mb-10 leading-relaxed font-medium relative z-10">
                                    Tu inventario está reservado bajo la ref: <strong class="text-white bg-white/10 px-2 py-1 rounded">${reference}</strong>. Los servidores bancarios tienen alta latencia.<br><br>
                                    El pago será validado manualmente en breve y te notificaremos.
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
                    if (typeof Swal !== 'undefined') Swal.fire("Interrupción", "Se interrumpió la conexión al validar. Tu orden está a salvo, verifica su estado en tu cuenta.", "info");
                    else alert("Se interrumpió la conexión al validar.");
                    window.location.href = '/store/account.html';
                }
            };

            setTimeout(verificarEstadoOrden, 9000);

        } else {
            if (typeof Swal !== 'undefined') Swal.fire("Error", data.error || "Transacción rechazada por el servidor.", "warning");
            else alert(data.error || "Transacción rechazada por el servidor.");
            resetBtn(btn);
            if (typeof startVaultTimer === 'function') startVaultTimer(new Date().getTime() + 60000); 
            if (cancelBtn) cancelBtn.disabled = false;
        }
    } catch (error) {
        console.error("Error de red:", error);
        if (typeof Swal !== 'undefined') Swal.fire("Error de Conexión", "Pérdida de conexión segura. Intente nuevamente.", "error");
        else alert("Pérdida de conexión segura. Intente nuevamente.");
        resetBtn(btn);
        if (typeof startVaultTimer === 'function') startVaultTimer(new Date().getTime() + 60000); 
        if (cancelBtn) cancelBtn.disabled = false;
    }
});

// ====================================================================
// ❌ BOTÓN CANCELAR (Salir de la bóveda/cronómetro)
// ====================================================================
document.getElementById('btn-cancel-vault')?.addEventListener('click', () => {
    if (typeof vaultInterval !== 'undefined') clearInterval(vaultInterval);
    
    const vaultSection = document.getElementById('checkout-vault-section') || document.querySelector('.vault-container') || document.getElementById('vault-view');
    if (vaultSection) {
        vaultSection.classList.add('hidden');
    }

    const summarySection = document.getElementById('checkout-summary-section') || document.querySelector('.summary-container') || document.getElementById('summary-panel');
    if (summarySection) {
        summarySection.classList.remove('hidden');
        summarySection.classList.remove('opacity-0');
    }
});

/**
 * 🔄 Restaura el botón final tras un fallo
 */
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
            // 🎨 ESTILO: Resalta en oro para el modo oscuro
            style: {
                layout: 'vertical',
                color:  'gold',
                shape:  'pill',
                label:  'pay'
            },

            createOrder: async function(data, actions) {
                const token = localStorage.getItem('jwt_token') || localStorage.getItem('gymen_auth_token');
                
                // 📦 LEER DIRECTO DE MEMORIA
                const cartData = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
                const itemsToProcess = cartData.items || cartData || [];

                // 🛡️ FORMATEO ESTRICTO: Forzar 2 decimales y real_id para evitar error 400
                const cleanItems = itemsToProcess.map(item => {
                    const finalPrice = Number(parseFloat(item.price).toFixed(2));
                    return {
                        id: String(item.id),
                        real_id: String(item.real_id || item.product_id || item.id),
                        price: finalPrice, 
                        qty: parseInt(item.quantity || item.qty || 1)
                    };
                });

                if (cleanItems.length === 0) {
                    if (typeof Swal !== 'undefined') Swal.fire('Error', 'El carrito está vacío.', 'error');
                    return null; 
                }

                const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
                const apiUrl = `${baseUrl}/api/store/checkout/paypal/create`;
                
                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ items: cleanItems })
                    });
                    
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const orderData = await response.json();
                    
                    if (!orderData.success) {
                        if (typeof Swal !== 'undefined') Swal.fire('Error', orderData.error, 'error');
                        return null;
                    }
                    return orderData.paypal_order_id; 
                } catch (error) {
                    console.error("Error creando orden:", error);
                    if (typeof Swal !== 'undefined') Swal.fire('Error del Servidor', 'No se pudo crear la orden.', 'error');
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

                    // 🛡️ FORMATEO ESTRICTO DE CAPTURA
                    const cleanItems = itemsToProcess.map(item => {
                        const finalPrice = Number(parseFloat(item.price).toFixed(2));
                        return {
                            id: String(item.id),
                            real_id: String(item.real_id || item.product_id || item.id),
                            price: finalPrice,
                            qty: parseInt(item.quantity || item.qty || 1)
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

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
                    if (typeof Swal !== 'undefined') Swal.fire('Error del Servidor', 'El pago se procesó en PayPal, pero falló el registro. Contáctanos con tu ID de transacción.', 'error');
                }
            },

            // 🛑 NUEVO: MANEJO DE CANCELACIÓN
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
