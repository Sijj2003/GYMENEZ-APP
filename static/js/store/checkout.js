// ====================================================================
// ⚙️ CONFIGURACIÓN DE RED Y MEMORIA DEL WIZARD
// ====================================================================
const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymen_auth_token';
const deviceId = localStorage.getItem('gymen_device_id') || ''; 

let currentPaymentMethod = 'pago_movil';
let cartTotal = 0;
let cartItems = [];
let isShippingComplete = false;
let globalAgencies = []; 
let temporaryKycData = null; 

// 🛡️ Variables de la Bóveda Segura
let vaultInterval = null;
let isCartLocked = false; 

document.addEventListener('DOMContentLoaded', () => {
    cartItems = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
    
    if (cartItems.length === 0) {
        document.getElementById('checkout-loader').classList.add('hidden');
        document.getElementById('checkout-content').classList.remove('hidden'); 
        document.getElementById('empty-cart-msg').classList.remove('hidden');
    } else {
        initWizardData(); // Inicia la carga paralela y verifica si hay reservas vivas
    }
});

// ==========================================
// 1. DIBUJAR RESUMEN DEL CARRITO (Dinámico/Bloqueado)
// ==========================================
function renderCartSummary() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    cartTotal = 0;

    cartItems.forEach((item, index) => {
        const qty = item.quantity || item.qty || 1;
        const itemTotal = item.price * qty;
        cartTotal += itemTotal;

        // Si estamos en la bóveda, bloqueamos la edición
        const deleteBtnHtml = isCartLocked ? '' : `
            <button onclick="removeCheckoutItem(${index})" class="absolute -top-2 -right-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg" title="Eliminar producto">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;

        const controlsHtml = isCartLocked ? `
            <div class="mt-1.5"><span class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Asegurado: ${qty} und</span></div>
        ` : `
            <div class="flex items-center gap-3 mt-1.5">
                <div class="flex items-center bg-white/5 rounded border border-white/10 h-6">
                    <button onclick="updateCheckoutItemQty(${index}, -1)" class="px-2 text-gray-400 hover:text-white hover:bg-white/10 transition font-bold">-</button>
                    <span class="text-[10px] font-black text-white w-5 text-center">${qty}</span>
                    <button onclick="updateCheckoutItemQty(${index}, 1)" class="px-2 text-gray-400 hover:text-white hover:bg-white/10 transition font-bold">+</button>
                </div>
                <span class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">x $${parseFloat(item.price).toFixed(2)}</span>
            </div>
        `;

        container.innerHTML += `
            <div class="flex gap-4 items-center bg-[#0a0a0f] p-3 rounded-xl border ${isCartLocked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'} relative group transition-all duration-300">
                ${deleteBtnHtml}
                <div class="w-16 h-16 bg-white/5 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                    <img src="${item.imageUrl || item.image_url}" alt="${item.name}" class="max-h-full object-contain">
                </div>
                <div class="flex-grow min-w-0 pr-2">
                    <p class="text-sm font-bold text-white truncate">${item.name}</p>
                    <p class="text-[10px] text-[#FFC300] uppercase tracking-widest">${item.storeName || item.store_name || 'Partner Oficial'}</p>
                    ${controlsHtml}
                </div>
                <div class="font-black text-white text-right flex-shrink-0">
                    $${itemTotal.toFixed(2)}
                </div>
            </div>
        `;
    });

    document.getElementById('summary-subtotal').innerText = `$${cartTotal.toFixed(2)}`;
    document.getElementById('summary-total').innerText = `$${cartTotal.toFixed(2)}`;

    if (cartItems.length === 0) {
        document.getElementById('checkout-content').classList.add('hidden');
        document.getElementById('checkout-container').classList.add('hidden');
        document.getElementById('empty-cart-msg').classList.remove('hidden');
    }
}

window.updateCheckoutItemQty = function(index, delta) {
    if (isCartLocked) return;
    let item = cartItems[index];
    let newQty = (item.quantity || item.qty || 1) + delta;
    if (newQty < 1) newQty = 1;
    const max = item.maxStock || item.max_stock || 99; 
    if (newQty > max) newQty = max;
    item.qty = newQty;
    item.quantity = newQty; 
    saveAndReRenderCart();
};

window.removeCheckoutItem = function(index) {
    if (isCartLocked) return;
    cartItems.splice(index, 1);
    saveAndReRenderCart();
};

function saveAndReRenderCart() {
    localStorage.setItem('gymenez_cart', JSON.stringify(cartItems));
    renderCartSummary();
    if(typeof updateCartCount === 'function') {
        updateCartCount(); 
    } else {
        const totalItems = cartItems.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
        const badgeDesktop = document.getElementById('cartCountDesktop');
        const badgeMobile = document.getElementById('cartCountMobile');
        if (badgeDesktop) badgeDesktop.innerText = totalItems;
        if (badgeMobile) {
            badgeMobile.innerText = totalItems;
            if(totalItems > 0) badgeMobile.classList.remove('hidden');
            else badgeMobile.classList.add('hidden');
        }
    }
}

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
        if (paymentsRes.ok && paymentsData.success) setupPaymentUI(paymentsData.methods);

        document.getElementById('checkout-loader').classList.add('hidden');
        document.getElementById('checkout-content').classList.remove('hidden');
        document.getElementById('checkout-container').classList.remove('hidden');

        // Evaluar Identidad 
        if (profileRes.ok && profileData.success) {
            evaluateUserProfile(profileData.profile);
        }

        // 🛡️ PERSISTENCIA DE LA BÓVEDA: ¿El usuario ya tenía una reserva activa?
        const vaultExpiration = localStorage.getItem('gymen_vault_expires_at');
        if (vaultExpiration) {
            const now = new Date().getTime();
            if (now < parseInt(vaultExpiration)) {
                // Recuperar la bóveda
                isCartLocked = true;
                isShippingComplete = true; // Asumimos que si llegó a la bóveda, ya configuró envío
                document.getElementById('wizard-view').classList.add('hidden');
                document.getElementById('vault-view').classList.remove('hidden');
                startVaultTimer(parseInt(vaultExpiration));
            } else {
                localStorage.removeItem('gymen_vault_expires_at');
            }
        }
        
        renderCartSummary(); // Renderizar final ya sea libre o bloqueado

    } catch (error) {
        console.error("Error en pre-carga del Checkout:", error);
        alert("Error de red conectando con la Bóveda Segura. Recarga la página.");
    }
}

function evaluateUserProfile(p) {
    if (p.store_profile_completed && p.kyc_cedula_url) {
        isShippingComplete = true;
        
        document.getElementById('kyc-form-container').classList.add('hidden');
        document.getElementById('kyc-success-msg').classList.remove('hidden');
        
        const step2Container = document.getElementById('step-2-card');
        document.getElementById('shipping-form-container').innerHTML = `
            <div class="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Destino Pre-configurado</p>
                <p class="text-sm text-white font-bold">${p.preferred_courier} - ${p.shipping_city}, ${p.shipping_state}</p>
            </div>
        `;
        step2Container.classList.remove('step-locked');
        document.getElementById('badge-step-2').innerHTML = '✓';
        document.getElementById('badge-step-2').classList.replace('text-gray-400', 'text-black');
        document.getElementById('badge-step-2').classList.replace('bg-white/10', 'bg-emerald-500');

        // Mostrar Botón para entrar a la bóveda
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
        badge.classList.remove('bg-white/10', 'text-gray-400');
        badge.classList.add('bg-[#FFC300]', 'text-black');
    }
}

// ==========================================
// 3. WIZARD: KYC Y LOGÍSTICA
// ==========================================
document.getElementById('form-kyc').addEventListener('submit', (e) => {
    e.preventDefault();
    const docType = document.getElementById('kyc-doc-type').value;
    const docNumber = document.getElementById('kyc-doc-number').value.trim();
    const imageFile = document.getElementById('kyc-image').files[0];

    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
        alert("La imagen excede el límite de 2MB.");
        return;
    }

    temporaryKycData = { docType, docNumber, imageFile };
    document.getElementById('kyc-form-container').classList.add('hidden');
    document.getElementById('kyc-success-msg').classList.remove('hidden');
    
    unlockStep(2);
    document.getElementById('step-2-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

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
    btn.textContent = 'Asegurando Perfil...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/store/athlete/profile`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId },
            body: formData
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            isShippingComplete = true; 
            document.getElementById('shipping-form-container').classList.add('hidden');
            document.getElementById('vault-entry-container').classList.remove('hidden');
        } else {
            alert(data.error || "Fallo al registrar datos logísticos.");
            btn.disabled = false;
            btn.textContent = 'Reintentar';
        }
    } catch (error) {
        alert("Fallo de comunicación perimetral.");
        btn.disabled = false;
        btn.textContent = 'Fijar Destino';
    }
});

// ==========================================
// 4. TRANSICIÓN A LA BÓVEDA (RESERVA DE STOCK)
// ==========================================
document.getElementById('btn-enter-vault').addEventListener('click', async (e) => {
    const btn = e.target;
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    btn.disabled = true;
    btn.innerHTML = 'Verificando Inventario... <div class="animate-spin inline-block w-4 h-4 border-2 border-black rounded-full border-t-transparent ml-2"></div>';

    const cleanItems = cartItems.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.quantity || item.qty || 1
    }));

    try {
        const res = await fetch(`${API_BASE_URL}/api/store/checkout/reserve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cleanItems })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            // Guardamos el tiempo futuro (+ 8 Minutos exactos)
            const expiresAt = new Date().getTime() + (8 * 60 * 1000);
            localStorage.setItem('gymen_vault_expires_at', expiresAt);
            
            // Cambiar UI a la Bóveda
            document.getElementById('wizard-view').classList.add('hidden');
            document.getElementById('vault-view').classList.remove('hidden');
            isCartLocked = true;
            renderCartSummary(); // Recarga carrito (ahora bloqueado visualmente)
            startVaultTimer(expiresAt);

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert(data.error || "No pudimos asegurar el stock. Alguien se te adelantó o ocurrió un error.");
            btn.disabled = false;
            btn.innerHTML = '<span>Asegurar Inventario y Pagar</span>';
        }
    } catch (error) {
        alert("Fallo de red al conectar con el inventario.");
        btn.disabled = false;
        btn.innerHTML = '<span>Asegurar Inventario y Pagar</span>';
    }
});

// ==========================================
// 5. MOTOR DEL CRONÓMETRO Y CANCELACIÓN
// ==========================================
function startVaultTimer(expiresAt) {
    const timerEl = document.getElementById('vault-timer');
    clearInterval(vaultInterval);

    vaultInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = expiresAt - now;

        if (distance < 0) {
            clearInterval(vaultInterval);
            handleVaultExpiration();
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (distance < 60000) { // Queda menos de 1 minuto
            timerEl.classList.add('timer-danger');
        }
    }, 1000);
}

async function handleVaultExpiration() {
    localStorage.removeItem('gymen_vault_expires_at');
    alert("⏳ ¡Tiempo agotado! Tu sesión expiró y los productos han regresado a la tienda. Intenta realizar la compra de nuevo.");
    window.location.reload(); // Obliga a limpiar UI y buscar stock fresco
}

document.getElementById('btn-cancel-vault').addEventListener('click', async () => {
    const btn = document.getElementById('btn-cancel-vault');
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    btn.disabled = true;
    btn.innerText = 'Devolviendo Productos...';
    clearInterval(vaultInterval);
    localStorage.removeItem('gymen_vault_expires_at');

    try {
        await fetch(`${API_BASE_URL}/api/store/checkout/release`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {
        console.warn("Fallo silencioso al liberar, el basurero del backend lo arreglará.");
    }
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

    btnPm.className = "flex-1 py-3 px-4 rounded-xl border-2 border-white/10 text-gray-400 hover:border-white/30 font-bold text-xs uppercase tracking-widest transition";
    btnBinance.className = "flex-1 py-3 px-4 rounded-xl border-2 border-white/10 text-gray-400 hover:border-white/30 font-bold text-xs uppercase tracking-widest transition";
    dataPm.classList.add('hidden');
    dataBinance.classList.add('hidden');

    if (method === 'pago_movil') {
        btnPm.className = "flex-1 py-3 px-4 rounded-xl border-2 border-[#FFC300] bg-[#FFC300]/10 text-[#FFC300] font-bold text-xs uppercase tracking-widest transition";
        dataPm.classList.remove('hidden');
    } else {
        btnBinance.className = "flex-1 py-3 px-4 rounded-xl border-2 border-[#FCD535] bg-[#FCD535]/10 text-[#FCD535] font-bold text-xs uppercase tracking-widest transition";
        dataBinance.classList.remove('hidden');
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

// 🛡️ SUBMIT FINAL DE LA ORDEN A LA BASE DE DATOS
document.getElementById('form-checkout-final').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-process-order');
    const reference = document.getElementById('pay-reference').value.trim();
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    btn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div> Procesando...`;
    btn.disabled = true;
    document.getElementById('btn-cancel-vault').disabled = true; // Desactivar cancelar
    clearInterval(vaultInterval); // Pausar reloj mientras procesamos

    const cleanItems = cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.quantity || item.qty || 1
    }));

    const payload = {
        items: cleanItems,
        totalAmount: cartTotal,
        paymentMethod: currentPaymentMethod,
        reference: reference
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
            // COMPRA COMPLETADA
            localStorage.removeItem('gymenez_cart');
            localStorage.removeItem('gymen_vault_expires_at');
            
            // Transición limpia de pantallas
            document.getElementById('vault-view').classList.add('hidden');
            document.getElementById('summary-panel').classList.add('opacity-0'); // Ocultar resumen de la derecha
            document.getElementById('success-view').classList.remove('hidden');
            document.getElementById('success-ref').innerText = reference;
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert(data.error || "Error al procesar la orden.");
            resetBtn(btn);
            // Si falló, reactivar reloj (Le damos 1 minuto extra por las dudas)
            startVaultTimer(new Date().getTime() + 60000); 
            document.getElementById('btn-cancel-vault').disabled = false;
        }
    } catch (error) {
        alert("Fallo de conexión. Intenta de nuevo.");
        resetBtn(btn);
        startVaultTimer(new Date().getTime() + 60000); 
        document.getElementById('btn-cancel-vault').disabled = false;
    }
});

function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = `
        <span>Completar Compra</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
    `;
}
