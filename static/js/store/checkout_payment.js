// ==========================================
// 6. DATOS DE PAGO Y ORDEN FINAL
// ==========================================
function setupPaymentUI(methods) {
    document.getElementById('loading-payment').classList.add('hidden');
    
    if (methods.pago_movil) {
        document.getElementById('pm-banco').innerText = methods.pago_movil.banco;
        document.getElementById('pm-tlf').innerText = methods.pago_movil.telefono;
        document.getElementById('pm-doc').innerText = methods.pago_movil.documento;
        document.getElementById('pm-nombre').innerText = methods.pago_movil.nombre;
    }
    if (methods.binance) {
        document.getElementById('bin-id').innerText = methods.binance.pay_id;
        document.getElementById('bin-email').innerText = methods.binance.email;
    }
    selectPayment('pago_movil');
}

window.selectPayment = function(method) {
    currentPaymentMethod = method;
    
    const btnPm = document.getElementById('btn-pm');
    const btnBinance = document.getElementById('btn-binance');
    const dataPm = document.getElementById('data-pago-movil');
    const dataBinance = document.getElementById('data-binance');
    const btnProcess = document.getElementById('btn-process-order');

    btnPm.className = "flex-1 py-4 px-4 rounded-2xl border-2 border-white/5 bg-[#12121a] text-gray-400 hover:text-white hover:border-white/20 font-black text-[10px] uppercase tracking-widest transition";
    btnBinance.className = "flex-1 py-4 px-4 rounded-2xl border-2 border-white/5 bg-[#12121a] text-gray-400 hover:text-white hover:border-white/20 font-black text-[10px] uppercase tracking-widest transition";
    dataPm.classList.add('hidden');
    dataBinance.classList.add('hidden');

    if (method === 'pago_movil') {
        btnPm.className = "flex-1 py-4 px-4 rounded-2xl border-2 border-[#FFC300] bg-[#FFC300]/10 text-[#FFC300] font-black text-[10px] uppercase tracking-widest transition shadow-inner";
        dataPm.classList.remove('hidden');
        
        if (isBcvValid && currentBcvRate > 0) {
            if(btnProcess) btnProcess.querySelector('span').innerText = `Pagar Bs. ${formatMoney(cartTotal * currentBcvRate)}`;
        } else {
            if(btnProcess) btnProcess.querySelector('span').innerText = `Procesar Compra`;
        }
    } else {
        btnBinance.className = "flex-1 py-4 px-4 rounded-2xl border-2 border-[#FCD535] bg-[#FCD535]/10 text-[#FCD535] font-black text-[10px] uppercase tracking-widest transition shadow-inner";
        dataBinance.classList.remove('hidden');
        if(btnProcess) btnProcess.querySelector('span').innerText = `Procesar Compra`;
    }
    validateFinalButton();
};

document.getElementById('pay-reference').addEventListener('input', validateFinalButton);

function validateFinalButton() {
    const ref = document.getElementById('pay-reference').value.trim();
    const btn = document.getElementById('btn-process-order');
    if (ref.length >= 4 && isShippingComplete) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

// 🛡️ SUBMIT FINAL DE LA ORDEN AL BACKEND PYTHON Y FIREBASE
document.getElementById('form-checkout-final').addEventListener('submit', async (e) => {
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
    
    // Capturamos los nuevos campos del banco
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
        // Mandamos los datos al backend
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

            // 🎯 LÓGICA DE POLLING CUIDADOSO (Para proteger el worker de PythonAnywhere)
            let intentos = 0;
            const maxIntentos = 3; // 3 intentos x 9 segundos = 27 segundos máximo (+9 iniciales = 36s)

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
                            // 🎉 BOT APROBÓ
                            localStorage.removeItem('gymenez_cart');
                            localStorage.removeItem('gymen_vault_expires_at');
                            
                            document.getElementById('vault-view').classList.add('hidden');
                            document.getElementById('summary-panel').classList.add('opacity-0'); 
                            document.getElementById('success-view').classList.remove('hidden');
                            document.getElementById('success-ref').innerText = reference;
                            
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            return; // Terminamos la verificación
                        } 
                        else if (statusData.status === 'rejected') {
                            // ❌ BOT RECHAZÓ
                            alert(statusData.bot_verification_msg || "El banco rechazó la transacción. Verifica los datos e intenta de nuevo.");
                            
                            resetBtn(btn);
                            startVaultTimer(new Date().getTime() + 60000); 
                            document.getElementById('btn-cancel-vault').disabled = false;
                            return; // Terminamos la verificación
                        }
                    }

                    // Si el estado sigue siendo 'pending_verification', sumamos un intento
                    intentos++;
                    
                    if (intentos < maxIntentos) {
                        // Esperamos 9 segundos antes de volver a preguntar
                        setTimeout(verificarEstadoOrden, 9000); 
                    } else {
                        // ⏳ LÍMITE DE INTENTOS ALCANZADO: SE ACTIVA EL FALLBACK AMARILLO
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

            // Iniciar la primera consulta después de 9 segundos
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
