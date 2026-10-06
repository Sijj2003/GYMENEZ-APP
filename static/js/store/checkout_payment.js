// ====================================================================
// 💳 MÓDULO 6: GESTIÓN DE PAGO Y ORDEN FINAL (checkout_payment_2.js)
// ====================================================================

// Almacenamiento local de métodos entregados por la API
let availablePaymentMethods = {};
let selectedTempMethod = 'pago_movil'; // Método seleccionado temporalmente en el modal

/**
 * 🛠️ Configura los datos dinámicos recibidos del Servidor (Tasa BCV y Cuentas Bancarias)
 * @param {Object} methods - Objeto con datos de pago_movil y binance
 */
function setupPaymentUI(methods) {
    document.getElementById('loading-payment')?.classList.add('hidden');
    availablePaymentMethods = methods || {};

    // Cargar datos bancarios si existen
    if (methods.pago_movil) {
        if (document.getElementById('pm-banco')) document.getElementById('pm-banco').innerText = methods.pago_movil.banco;
        if (document.getElementById('pm-tlf')) document.getElementById('pm-tlf').innerText = methods.pago_movil.telefono;
        if (document.getElementById('pm-doc')) document.getElementById('pm-doc').innerText = methods.pago_movil.documento;
        if (document.getElementById('pm-nombre')) document.getElementById('pm-nombre').innerText = methods.pago_movil.nombre;
    }
    
    // Cargar datos de Binance si existen
    if (methods.binance) {
        if (document.getElementById('bin-id')) document.getElementById('bin-id').innerText = methods.binance.pay_id;
        if (document.getElementById('bin-email')) document.getElementById('bin-email').innerText = methods.binance.email;
    }

    // Inicializar listeners de entrada numéricos
    setupReferenceInputSanitizer();
}

/**
 * 🔢 Sanitizador estricto para la referencia de pago (SOLO NÚMEROS)
 */
function setupReferenceInputSanitizer() {
    const refInput = document.getElementById('pay-reference');
    if (!refInput) return;

    // Bloquea letras, símbolos y espacios al escribir o pegar
    refInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, ''); // Remueve cualquier carácter no dígito
        validateFinalButton();
    });
}

/**
 * 🔲 Abre el Modal Centrado de Selección de Método de Pago
 */
window.openPaymentMethodModal = function() {
    const modal = document.getElementById('payment-method-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('payment-modal-card')?.classList.remove('scale-95', 'opacity-0');
    }, 10);
};

/**
 * ❌ Cierra el Modal de Selección de Método de Pago
 */
window.closePaymentMethodModal = function() {
    const modal = document.getElementById('payment-method-modal');
    const card = document.getElementById('payment-modal-card');
    if (!modal || !card) return;

    card.classList.add('scale-95', 'opacity-0');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

/**
 * 🎯 Marca visualmente la opción seleccionada dentro del Modal
 * @param {string} method - 'pago_movil' | 'binance' | 'card'
 */
window.selectModalPaymentOption = function(method) {
    if (method !== 'pago_movil') {
        // Opción temporalmente deshabilitada
        return;
    }

    selectedTempMethod = method;

    // Actualización de bordes y estados táctiles en el modal
    const optPm = document.getElementById('opt-pay-pm');
    const optBinance = document.getElementById('opt-pay-binance');
    const optCard = document.getElementById('opt-pay-card');

    if (optPm) {
        optPm.className = "w-full p-4 rounded-2xl border-2 border-[#FFC300] bg-[#FFC300]/10 text-white flex items-center justify-between transition cursor-pointer shadow-[0_0_15px_rgba(255,195,0,0.15)]";
    }
    if (optBinance) {
        optBinance.className = "w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-gray-500 flex items-center justify-between opacity-50 cursor-not-allowed";
    }
    if (optCard) {
        optCard.className = "w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-gray-500 flex items-center justify-between opacity-50 cursor-not-allowed";
    }
};

/**
 * ✅ Confirma la selección hecha en el Modal y despliega la UI de pago correspondiente
 */
window.confirmPaymentSelection = function() {
    currentPaymentMethod = selectedTempMethod;
    closePaymentMethodModal();

    const dataPm = document.getElementById('data-pago-movil');
    const dataBinance = document.getElementById('data-binance');
    const btnProcess = document.getElementById('btn-process-order');
    const activeBadge = document.getElementById('active-payment-badge');

    // Ocultar todos los paneles de datos
    if (dataPm) dataPm.classList.add('hidden');
    if (dataBinance) dataBinance.classList.add('hidden');

    if (currentPaymentMethod === 'pago_movil') {
        if (dataPm) dataPm.classList.remove('hidden');
        
        if (activeBadge) {
            activeBadge.innerText = "Método Activo: Pago Móvil (Bs)";
            activeBadge.className = "text-[10px] font-black uppercase tracking-widest text-[#FFC300] bg-[#FFC300]/10 px-3 py-1.5 rounded-full border border-[#FFC300]/30 inline-block mb-4";
        }

        // Actualización dinámica del texto del botón de compra según Tasa BCV
        if (isBcvValid && currentBcvRate > 0) {
            if (btnProcess) btnProcess.querySelector('span').innerText = `Pagar Bs. ${formatMoney(cartTotal * currentBcvRate)}`;
        } else {
            if (btnProcess) btnProcess.querySelector('span').innerText = `Procesar Compra`;
        }
    } else if (currentPaymentMethod === 'binance') {
        if (dataBinance) dataBinance.classList.remove('hidden');
        if (btnProcess) btnProcess.querySelector('span').innerText = `Procesar Compra (Binance)`;
    }

    validateFinalButton();
};

/**
 * 🔒 Valida si la referencia cumple la longitud mínima para habilitar el botón de compra
 */
function validateFinalButton() {
    const refInput = document.getElementById('pay-reference');
    const ref = refInput ? refInput.value.trim() : '';
    const btn = document.getElementById('btn-process-order');
    
    if (!btn) return;

    // Solo números, mínimo 4 dígitos y dirección registrada
    if (/^\d{4,}$/.test(ref) && isShippingComplete) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

// ====================================================================
// 🛡️ SUBMIT FINAL DE LA ORDEN Y POLLING DE VERIFICACIÓN (IDÉNTICO)
// ====================================================================
document.getElementById('form-checkout-final')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-process-order');
    const reference = document.getElementById('pay-reference').value.trim();
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    btn.innerHTML = `<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Procesando...</span>`;
    btn.disabled = true;
    document.getElementById('btn-cancel-vault').disabled = true; 
    clearInterval(vaultInterval); // Pausar reloj mientras se procesa

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

    const toggleFreeShipping = document.getElementById('toggle-free-shipping');
    const wantsFreeShipping = toggleFreeShipping ? toggleFreeShipping.checked : false;
    
    // Captura de datos de la cuenta emisora
    const telefonoOrigen = document.getElementById('pay-telefono-origen') ? document.getElementById('pay-telefono-origen').value.trim() : '';
    const bancoOrigen = document.getElementById('pay-banco-origen') ? document.getElementById('pay-banco-origen').value : '';

    if (currentPaymentMethod === 'pago_movil' && (!telefonoOrigen || !bancoOrigen)) {
        alert("Por favor indique el Banco y Teléfono desde el cual realizó el pago.");
        resetBtn(btn);
        startVaultTimer(new Date().getTime() + 60000); 
        document.getElementById('btn-cancel-vault').disabled = false;
        return;
    }

    const payload = {
        items: cleanItems,
        totalAmount: cartTotal,
        paymentMethod: currentPaymentMethod,
        reference: reference,
        wants_free_shipping: wantsFreeShipping,
        telefono_origen: telefonoOrigen,
        banco_origen: bancoOrigen
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/store/checkout`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const orderId = data.order_id;
            
            btn.innerHTML = `<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Verificando Banco...</span>`;

            // 🎯 Polling cuidadoso para PythonAnywhere Worker
            let intentos = 0;
            const maxIntentos = 3; 

            const verificarEstadoOrden = async () => {
                try {
                    const statusRes = await fetch(`${API_BASE_URL}/api/store/checkout/status/${orderId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (statusRes.ok) {
                        const statusData = await statusRes.json();

                        if (statusData.status === 'approved') {
                            localStorage.removeItem('gymenez_cart');
                            localStorage.removeItem('gymen_vault_expires_at');
                            
                            document.getElementById('vault-view').classList.add('hidden');
                            document.getElementById('summary-panel').classList.add('opacity-0'); 
                            document.getElementById('success-view').classList.remove('hidden');
                            document.getElementById('success-ref').innerText = reference;
                            
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            return; 
                        } 
                        else if (statusData.status === 'rejected') {
                            alert(statusData.bot_verification_msg || "El banco rechazó la transacción. Verifica los datos e intenta de nuevo.");
                            
                            resetBtn(btn);
                            startVaultTimer(new Date().getTime() + 60000); 
                            document.getElementById('btn-cancel-vault').disabled = false;
                            return; 
                        }
                    }

                    intentos++;
                    
                    if (intentos < maxIntentos) {
                        setTimeout(verificarEstadoOrden, 9000); 
                    } else {
                        // Fallback de alta latencia
                        localStorage.removeItem('gymenez_cart');
                        localStorage.removeItem('gymen_vault_expires_at');
                        
                        document.getElementById('vault-view').classList.add('hidden');
                        document.getElementById('summary-panel').classList.add('opacity-0'); 
                        
                        const successView = document.getElementById('success-view');
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
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }

                } catch (error) {
                    console.error("Error consultando estado:", error);
                    alert("Se interrumpió la conexión al validar. Tu orden está a salvo, verifica su estado en tu cuenta.");
                    window.location.href = '/store/account.html';
                }
            };

            setTimeout(verificarEstadoOrden, 9000);

        } else {
            alert(data.error || "Transacción rechazada por el servidor.");
            resetBtn(btn);
            startVaultTimer(new Date().getTime() + 60000); 
            document.getElementById('btn-cancel-vault').disabled = false;
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("Pérdida de conexión segura. Intente nuevamente.");
        resetBtn(btn);
        startVaultTimer(new Date().getTime() + 60000); 
        document.getElementById('btn-cancel-vault').disabled = false;
    }
});

function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = `
        <span>Procesar Compra</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
    `;
}
