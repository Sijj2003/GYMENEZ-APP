// ====================================================================
// ⚙️ CONFIGURACIÓN DE RED Y MEMORIA DEL WIZARD
// ====================================================================
const TOKEN_KEY = 'gymen_auth_token';
const deviceId = localStorage.getItem('gymen_device_id') || ''; 

let currentPaymentMethod = 'pago_movil';
let cartTotal = 0;
let cartItems = [];
let isShippingComplete = false;
let globalAgencies = []; // Memoria para la cascada de estados/agencias
let temporaryKycData = null; // Memoria temporal del Paso 1

document.addEventListener('DOMContentLoaded', () => {
    cartItems = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
    
    if (cartItems.length === 0) {
        document.getElementById('checkout-loader').classList.add('hidden');
        document.getElementById('checkout-content').classList.remove('hidden'); // <-- AÑADIR ESTA LÍNEA
        document.getElementById('empty-cart-msg').classList.remove('hidden');
    } else {
        renderCartSummary();
        initWizardData(); // Inicia la carga paralela de datos
    }
});

// ==========================================
// 1. DIBUJAR RESUMEN DEL CARRITO (Tu diseño exacto)
// ==========================================
function renderCartSummary() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    cartTotal = 0;

    cartItems.forEach(item => {
        const itemTotal = item.price * (item.quantity || item.qty || 1);
        const qty = item.quantity || item.qty || 1;
        cartTotal += itemTotal;

        container.innerHTML += `
            <div class="flex gap-4 items-center bg-[#0a0a0f] p-3 rounded-xl border border-white/5">
                <div class="w-16 h-16 bg-white/5 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                    <img src="${item.imageUrl || item.image_url}" alt="${item.name}" class="max-h-full object-contain">
                </div>
                <div class="flex-grow min-w-0">
                    <p class="text-sm font-bold text-white truncate">${item.name}</p>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest">${item.storeName || item.store_name || 'Partner Oficial'}</p>
                    <p class="text-xs text-gray-400 mt-1">Cant: ${qty} x $${parseFloat(item.price).toFixed(2)}</p>
                </div>
                <div class="font-black text-white">$${itemTotal.toFixed(2)}</div>
            </div>
        `;
    });

    document.getElementById('summary-subtotal').innerText = `$${cartTotal.toFixed(2)}`;
    document.getElementById('summary-total').innerText = `$${cartTotal.toFixed(2)}`;
}

// ==========================================
// 2. EL GUARDIÁN INVISIBLE (Carga Paralela)
// ==========================================
async function initWizardData() {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');

    try {
        // Lanzamos las 3 peticiones críticas al mismo tiempo (Velocidad Apple)
        const [profileRes, agenciesRes, paymentsRes] = await Promise.all([
            fetch('https://sijj2003.pythonanywhere.com/api/store/athlete/profile', {
                headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId }
            }),
            fetch('https://sijj2003.pythonanywhere.com/api/shipping/agencies'),
            fetch('https://sijj2003.pythonanywhere.com/api/store/payment-methods', {
                headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId }
            })
        ]);

        const profileData = await profileRes.json();
        const agenciesData = await agenciesRes.json();
        const paymentsData = await paymentsRes.json();

        // Extraer Agencias
        if (agenciesRes.ok) globalAgencies = agenciesData.agencies || agenciesData;

        // Inyectar Métodos de Pago
        if (paymentsRes.ok && paymentsData.success) {
            setupPaymentUI(paymentsData.methods);
        }

        // Ocultar Skeletons y revelar Wizard
        document.getElementById('checkout-loader').classList.add('hidden');
        document.getElementById('checkout-content').classList.remove('hidden');
        document.getElementById('checkout-container').classList.remove('hidden'); // <--- ¡AÑADE ESTA LÍNEA AQUÍ!

        // Evaluar Identidad (KYC)
        if (profileRes.ok && profileData.success) {
            evaluateUserProfile(profileData.profile);
        }

    } catch (error) {
        console.error("Error en pre-carga del Checkout:", error);
        alert("Error de red conectando con la Bóveda Segura. Recarga la página.");
    }
}

function evaluateUserProfile(p) {
    // Si ya tiene perfil completo y KYC, le ahorramos los 2 primeros pasos
    if (p.store_profile_completed && p.kyc_cedula_url) {
        isShippingComplete = true;
        
        // PASO 1: Marcar completado visualmente
        document.getElementById('kyc-form-container').classList.add('hidden');
        document.getElementById('kyc-success-msg').classList.remove('hidden');
        
        // PASO 2: Resumir envío y bloquear form
        const step2Container = document.getElementById('step-2-card');
        step2Container.innerHTML = `
            <div class="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-4">
                    <div class="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-sm">✓</div>
                    <h3 class="text-lg font-bold uppercase italic flex items-center gap-2"><span class="text-emerald-500">Logística</span> y Envío</h3>
                </div>
                <a href="/store/account.html" class="text-[10px] text-[#FFC300] uppercase tracking-widest hover:underline">Cambiar Destino</a>
            </div>
            <div class="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Destino Pre-configurado</p>
                <p class="text-sm text-white font-bold">${p.preferred_courier} - ${p.shipping_city}, ${p.shipping_state}</p>
            </div>
        `;
        step2Container.classList.remove('step-locked');

        // PASO 3: Abrir candado de Pago
        unlockStep(3);
    } else {
        // Usuario Nuevo: Encender la cascada dinámica
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
// 3. PASO 1: WIZARD DE IDENTIDAD (KYC)
// ==========================================
document.getElementById('form-kyc').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const docType = document.getElementById('kyc-doc-type').value;
    const docNumber = document.getElementById('kyc-doc-number').value.trim();
    const imageFile = document.getElementById('kyc-image').files[0];

    // Validación estricta Frontend
    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
        alert("La imagen excede el límite de 2MB.");
        return;
    }

    // Congelar datos en memoria y abrir Paso 2
    temporaryKycData = { docType, docNumber, imageFile };
    
    document.getElementById('kyc-form-container').classList.add('hidden');
    document.getElementById('kyc-success-msg').classList.remove('hidden');
    
    unlockStep(2);
    document.getElementById('step-2-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ==========================================
// 4. PASO 2: CASCADA INTELIGENTE DE ENVÍOS
// ==========================================
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

// INYECCIÓN AL BACKEND: KYC + SHIPPING AL MISMO TIEMPO
document.getElementById('btn-submit-shipping').addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target;
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    const courier = document.getElementById('shipping-courier').value;
    const state = document.getElementById('shipping-state').value;
    const agencySelect = document.getElementById('shipping-agency');
    const agencyId = agencySelect.value;
    const agencyName = agencySelect.options[agencySelect.selectedIndex].text.split(' - ')[0];

    // FormData es obligatorio porque enviaremos la imagen de la cédula
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
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId // 🛡️ Zero Trust Activo
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            isShippingComplete = true; // Autorizado para comprar
            btn.textContent = 'Destino Fijado ✅';
            unlockStep(3);
            document.getElementById('step-3-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
// 5. PASO 3: BÓVEDA DE PAGOS Y ORDEN FINAL
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
    // Seleccionar pago móvil por defecto visualmente
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

// 🛡️ SUBMIT FINAL DE LA ORDEN
document.getElementById('form-checkout-final').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isShippingComplete) {
        alert("Error de seguridad: KYC o Logística incompleta.");
        return;
    }

    const btn = document.getElementById('btn-process-order');
    const reference = document.getElementById('pay-reference').value.trim();
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    btn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div> Procesando...`;
    btn.disabled = true;

    // Sanitización del payload
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
            // COMPRA EXITOSA (Purgar Memoria)
            localStorage.removeItem('gymenez_cart');
            
            // Inyectar UI de Éxito Exacta (Tu diseño original)
            document.getElementById('checkout-container').innerHTML = `
                <div class="col-span-12 text-center py-24 glass-panel rounded-[2rem] border border-emerald-500/30 bg-emerald-500/5">
                    <div class="text-7xl mb-6">✅</div>
                    <h2 class="text-4xl font-[900] uppercase italic tracking-tighter text-emerald-400 mb-4">¡Orden Recibida!</h2>
                    <p class="text-gray-300 text-lg max-w-xl mx-auto mb-8">Tu número de referencia <strong>${reference}</strong> ha sido enviado a nuestro equipo administrativo para su verificación.</p>
                    <a href="/store/account.html" class="bg-white/10 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white/20 transition">Ver en Mis Pedidos</a>
                </div>
            `;
            window.scrollTo(0,0);
        } else {
            alert(data.error || "Error al procesar la orden.");
            resetBtn(btn);
        }
    } catch (error) {
        alert("Fallo de conexión. Intenta de nuevo.");
        resetBtn(btn);
    }
});

function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = `
        <span>Procesar Orden Segura</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
    `;
}
