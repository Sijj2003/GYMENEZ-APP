// ==========================================
// 2. INICIALIZACIÓN Y PERSISTENCIA DE LA BÓVEDA
// ==========================================
async function initWizardData() {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');

    try {
        const [profileRes, agenciesRes, paymentsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/store/athlete/profile`, { headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId } }),
            fetch(`${API_BASE_URL}/api/shipping/agencies`),
            fetch(`${API_BASE_URL}/api/store/payment-methods`, { headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId } })
        ]);

        const profileData = await profileRes.json();
        const agenciesData = await agenciesRes.json();
        const paymentsData = await paymentsRes.json();

        if (agenciesRes.ok) globalAgencies = agenciesData.agencies || agenciesData;
        
        // CAPTURA DE TASA BCV DESDE EL BACKEND
        if (paymentsRes.ok && paymentsData.success) {
            currentBcvRate = paymentsData.bcv_rate || 0;
            isBcvValid = paymentsData.bcv_valid || false; 
            setupPaymentUI(paymentsData.methods);
        }

        document.getElementById('checkout-loader').classList.add('hidden');
        document.getElementById('checkout-content').classList.remove('hidden');
        document.getElementById('checkout-container').classList.remove('hidden');

        // Evaluar Identidad 
        if (profileRes.ok && profileData.success) {
            evaluateUserProfile(profileData.profile);
        }

        // 🛡️ PERSISTENCIA DE LA BÓVEDA (Si recarga la página)
        const vaultExpiration = localStorage.getItem('gymen_vault_expires_at');
        if (vaultExpiration) {
            const now = new Date().getTime();
            if (now < parseInt(vaultExpiration)) {
                isCartLocked = true;
                isShippingComplete = true; 
                document.getElementById('wizard-view').classList.add('hidden');
                document.getElementById('vault-view').classList.remove('hidden');
                startVaultTimer(parseInt(vaultExpiration));
            } else {
                localStorage.removeItem('gymen_vault_expires_at');
            }
        }
        
        renderCartSummary(); 

    } catch (error) {
        console.error("Error en pre-carga del Checkout:", error);
        alert("Fallo al sincronizar con la Bóveda Segura. Recargue la página.");
    }
}

function evaluateUserProfile(p) {
    if (p.store_profile_completed && p.kyc_cedula_url) {
        isShippingComplete = true;
        
        // Minimizar KYC
        document.getElementById('kyc-form-container').classList.add('hidden');
        document.getElementById('kyc-success-msg').classList.remove('hidden');
        document.getElementById('link-edit-kyc').classList.remove('hidden'); // Mostrar botón editar
        
        // Pre-Llenar Logística
        const step2Container = document.getElementById('step-2-card');
        document.getElementById('shipping-form-container').innerHTML = `
            <div class="mt-2 p-5 bg-[#12121a] border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-inner">
                <div>
                    <p class="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Destino Principal Guardado
                    </p>
                    <p class="text-sm text-white font-bold tracking-wide">${p.preferred_courier} - ${p.shipping_city}, ${p.shipping_state}</p>
                </div>
                <a href="/store/account.html" class="text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-[#FFC300] transition">Cambiar</a>
            </div>
        `;
        
        step2Container.classList.remove('step-locked');
        const badge = document.getElementById('badge-step-2');
        badge.innerHTML = '<svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
        badge.className = 'w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]';

        document.getElementById('vault-entry-container').classList.remove('hidden');
    } else {
        setupShippingCascade();
    }
}

function unlockStep(stepNumber) {
    const card = document.getElementById(`step-${stepNumber}-card`);
    const badge = document.getElementById(`badge-step-${stepNumber}`);
    if (card) card.classList.remove('step-locked');
    if (badge) {
        badge.className = 'w-8 h-8 rounded-full bg-[#FFC300] text-black flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(255,195,0,0.4)]';
    }
}

#paso 3 

function setupShippingCascade() {
    const courierSelect = document.getElementById('shipping-courier');
    const stateSelect = document.getElementById('shipping-state');
    const agencySelect = document.getElementById('shipping-agency');
    const btnSubmitShipping = document.getElementById('btn-submit-shipping');

    courierSelect.addEventListener('change', (e) => {
        const courier = e.target.value;
        stateSelect.innerHTML = '<option value="">Elige un Estado...</option>';
        agencySelect.innerHTML = '<option value="">Elige un Estado primero...</option>';
        agencySelect.disabled = true;
        btnSubmitShipping.disabled = true;

        if (!courier) {
            stateSelect.disabled = true;
            return;
        }

        const availableStates = [...new Set(globalAgencies.filter(a => a.courier === courier).map(a => a.state))].sort();
        availableStates.forEach(state => {
            stateSelect.innerHTML += `<option value="${state}">${state}</option>`;
        });
        
        stateSelect.disabled = false;
    });

    stateSelect.addEventListener('change', (e) => {
        const courier = courierSelect.value;
        const state = e.target.value;
        agencySelect.innerHTML = '<option value="">Selecciona tu Sucursal...</option>';
        btnSubmitShipping.disabled = true;

        if (!state) {
            agencySelect.disabled = true;
            return;
        }

        const filteredAgencies = globalAgencies.filter(a => a.courier === courier && a.state === state);
        filteredAgencies.forEach(agency => {
            agencySelect.innerHTML += `<option value="${agency.id}">${agency.name} - ${agency.address.substring(0,40)}...</option>`;
        });
        agencySelect.disabled = false;
    });

    agencySelect.addEventListener('change', (e) => {
        btnSubmitShipping.disabled = !e.target.value;
    });
}

document.getElementById('btn-submit-shipping').addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target;
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    const courier = document.getElementById('shipping-courier').value;
    const state = document.getElementById('shipping-state').value;
    const agencySelect = document.getElementById('shipping-agency');
    const agencyId = agencySelect.value;
    const agencyName = agencySelect.options[agencySelect.selectedIndex].text.split(' - ')[0];

    const formData = new FormData();
    formData.append('courier', courier);
    formData.append('state', state);
    formData.append('city', agencyName); 
    formData.append('municipality', agencyId);

    if (temporaryKycData) {
        formData.append('docType', temporaryKycData.docType);
        formData.append('docNumber', temporaryKycData.docNumber);
        if (temporaryKycData.imageFile) {
            formData.append('cedula_image', temporaryKycData.imageFile);
        }
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>';

    try {
        const res = await fetch(`${API_BASE_URL}/api/store/athlete/profile`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId },
            body: formData
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            isShippingComplete = true; 
            
            const badge = document.getElementById('badge-step-2');
            badge.innerHTML = '<svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
            badge.className = 'w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
            
            document.getElementById('shipping-form-container').classList.add('hidden');
            document.getElementById('vault-entry-container').classList.remove('hidden');
        } else {
            alert(data.error || "Fallo al registrar datos logísticos. Revise la información.");
            btn.disabled = false;
            btn.textContent = 'Reintentar Registro';
        }
    } catch (error) {
        alert("Fallo de comunicación con servidores de logística.");
        btn.disabled = false;
        btn.textContent = 'Confirmar Datos de Envío';
    }
});

// ==========================================
// 4. TRANSICIÓN A LA BÓVEDA Y PAYLOAD DE VARIANTES
// ==========================================
document.getElementById('btn-enter-vault').addEventListener('click', (e) => {
    const uniqueStores = new Set(cartItems.map(item => item.storeName || item.store_name || 'Gymenez Store'));
    
    if (uniqueStores.size > 1 && !hasAcceptedMultiStore) {
        document.getElementById('modal-stores-count').innerText = `${uniqueStores.size}`;
        const modal = document.getElementById('multi-store-modal');
        const modalContent = document.getElementById('multi-store-modal-content');
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95');
        }, 10);
        return; 
    }

    executeVaultEntry();
});

window.closeMultiStoreModal = function() {
    const modal = document.getElementById('multi-store-modal');
    const modalContent = document.getElementById('multi-store-modal-content');
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

window.acceptMultiStoreAndProceed = function() {
    hasAcceptedMultiStore = true; 
    closeMultiStoreModal();
    executeVaultEntry(); 
}

async function executeVaultEntry() {
    const btn = document.getElementById('btn-enter-vault');
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    btn.disabled = true;
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Reservando Inventario...</span>';

    // 🧠 PAYLOAD PERFECTO PARA EL BACKEND (Ahora incluye las banderas de logística)
    const cleanItems = cartItems.map(item => ({
        id: item.id, 
        real_id: item.real_id || item.id, 
        name: item.name,
        price: item.price,
        qty: item.quantity || item.qty || 1,
        storeName: item.storeName || item.store_name || 'Gymenez Store',
        weight_kg: item.weight_kg || 1,
        // 👇 ESCUDO 4 y 5: Le decimos a Python lo que el cliente tiene en su caché
        free_shipping: item.free_shipping === true || item.free_shipping === 'true',
        free_shipping_threshold: parseFloat(item.free_shipping_threshold || 0)
    }));

    // 👇 ESCUDO 5: Capturamos si el cliente activó el switch ANTES de entrar a la bóveda
    const toggleFreeShipping = document.getElementById('toggle-free-shipping');
    const wantsFreeShipping = toggleFreeShipping ? toggleFreeShipping.checked : false;

    try {
        const res = await fetch(`${API_BASE_URL}/api/store/checkout/reserve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            // 👇 Enviamos la variable wants_free_shipping al backend
            body: JSON.stringify({ 
                items: cleanItems,
                wants_free_shipping: wantsFreeShipping
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            // 🧠 Lógica Inteligente: Verificar si ya había un tiempo corriendo guardado en memoria
            let expiresAt = localStorage.getItem('gymen_vault_expires_at');
            
            // Si NO hay tiempo guardado o el tiempo que estaba ya expiró, creamos uno nuevo de 8 min
            if (!expiresAt || new Date().getTime() > parseInt(expiresAt)) {
                expiresAt = new Date().getTime() + (8 * 60 * 1000); 
                localStorage.setItem('gymen_vault_expires_at', expiresAt);
            } else {
                // Si recargó la página, rescatamos el tiempo exacto que le quedaba
                expiresAt = parseInt(expiresAt);
            }
            
            document.getElementById('wizard-view').classList.add('hidden');
            document.getElementById('vault-view').classList.remove('hidden');
            isCartLocked = true;
            renderCartSummary(); 
            startVaultTimer(expiresAt);

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // 👇 Si Python bloquea por precio o envíos cambiados, saldrá esta alerta roja
            alert(data.error || "Imposible reservar el inventario. Es probable que algún producto ya no tenga stock suficiente.");
            btn.disabled = false;
            btn.innerHTML = '<span>Proceder al Pago</span>';
        }
    } catch (error) {
        alert("Fallo de red al conectar con el inventario maestro.");
        btn.disabled = false;
        btn.innerHTML = '<span>Proceder al Pago</span>';
    }
}

// ==========================================
// 5. MOTOR DEL CRONÓMETRO Y CANCELACIÓN
// ==========================================
function startVaultTimer(expiresAt) {
    const timerEl = document.getElementById('vault-timer');
    clearInterval(vaultInterval);

    // Creamos la lógica en una función aislada
    function updateTimer() {
        const now = new Date().getTime();
        const distance = expiresAt - now;

        if (distance <= 0) {
            clearInterval(vaultInterval);
            handleVaultExpiration();
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Formateo 00:00
        timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Alerta roja en el último minuto
        if (distance < 60000) { 
            timerEl.classList.add('timer-danger');
        } else {
            timerEl.classList.remove('timer-danger');
        }
    }

    updateTimer(); // <-- Ejecución INMEDIATA para matar el parpadeo
    vaultInterval = setInterval(updateTimer, 1000);
}

async function handleVaultExpiration() {
    localStorage.removeItem('gymen_vault_expires_at');
    alert("⏳ ¡Sesión expirada! Los productos han sido devueltos a la tienda pública.");
    window.location.reload(); 
}

document.getElementById('btn-cancel-vault').addEventListener('click', async () => {
    const btn = document.getElementById('btn-cancel-vault');
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    btn.disabled = true;
    btn.innerText = 'Liberando...';
    clearInterval(vaultInterval);
    localStorage.removeItem('gymen_vault_expires_at');

    try {
        await fetch(`${API_BASE_URL}/api/store/checkout/release`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) { console.warn("Fallo en release manual."); }
    window.location.reload(); 
});

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
