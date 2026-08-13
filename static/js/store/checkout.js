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

// 💱 Variables de Divisas (Tasa BCV)
let currentBcvRate = 0;
let isBcvValid = false;

// 💰 Formateador de moneda (Estilo VE: 1.000.000,00)
function formatMoney(amount) {
    return Number(amount).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 🛡️ Variables de la Bóveda Segura
let vaultInterval = null;
let isCartLocked = false;
let hasAcceptedMultiStore = false;

document.addEventListener('DOMContentLoaded', () => {
    cartItems = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
    
    if (cartItems.length === 0) {
        // Quitar el spinner de carga
        document.getElementById('checkout-loader').classList.add('hidden');
        // MOSTRAR el contenedor principal completo
        document.getElementById('checkout-content').classList.remove('hidden'); 
        // OCULTAR los paneles de formulario y pago
        const checkoutContainer = document.getElementById('checkout-container');
        if(checkoutContainer) checkoutContainer.classList.add('hidden');
        // MOSTRAR el aviso de "Tu bolsa está vacía"
        document.getElementById('empty-cart-msg').classList.remove('hidden');
    } else {
        initWizardData(); 
    }
});


// ==========================================
// 1. DIBUJAR RESUMEN DEL CARRITO (ARQUITECTURA COMPACTA Y ESTRICTA)
// ==========================================
function renderCartSummary() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    
    let rawTotal = 0;   
    let finalTotal = 0; 
    let hasOnDemand = false;
    const storeSet = new Set();
    
    // 🧠 1. AGRUPAR POR TIENDAS Y EXIGIR EL UMBRAL MÁS ALTO
    const storeTotals = {};
    cartItems.forEach(item => {
        const store = item.storeName || item.store_name || 'Gymenez Store';
        const qty = item.quantity || item.qty || 1;
        const fPrice = parseFloat(item.price);
        
        if (!storeTotals[store]) {
            storeTotals[store] = { total: 0, offersFreeShipping: false, threshold: 0 }; 
        }
        storeTotals[store].total += (fPrice * qty);
        
        if (item.free_shipping === true || item.free_shipping === 'true') {
            storeTotals[store].offersFreeShipping = true;
            const threshold = parseFloat(item.free_shipping_threshold || 0);
            if (threshold > storeTotals[store].threshold) storeTotals[store].threshold = threshold; 
        }
    });

    let storesWithFreeShippingEarned = 0;
    let pendingShippingHtml = '';

    for (const store in storeTotals) {
        if (storeTotals[store].offersFreeShipping) {
            if (storeTotals[store].total >= storeTotals[store].threshold) {
                storeTotals[store].earnedFreeShipping = true;
                storesWithFreeShippingEarned++;
            } else {
                storeTotals[store].earnedFreeShipping = false;
                const diff = storeTotals[store].threshold - storeTotals[store].total;
                // Upsell para que agreguen más productos
                pendingShippingHtml += `
                    <div class="mt-2 border-l-2 border-red-500 pl-3">
                        <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">${store}</span>
                        <span class="text-[10px] text-red-400 font-black uppercase">Agrega $${formatMoney(diff)} más para ganar Envío Gratis</span>
                    </div>
                `;
            }
        }
    }

    // 🧠 2. DIBUJAR PRODUCTOS
    cartItems.forEach((item, index) => {
        const qty = item.quantity || item.qty || 1;
        const bPrice = parseFloat(item.basePrice || item.price);
        const fPrice = parseFloat(item.price);
        
        const bPriceTotal = bPrice * qty;
        const fPriceTotal = fPrice * qty;
        const discountTotal = bPriceTotal - fPriceTotal;

        rawTotal += bPriceTotal;
        finalTotal += fPriceTotal;
        
        const store = item.storeName || item.store_name || 'Gymenez Store';
        storeSet.add(store);
        
        let displayName = item.name;
        let variantBadgeHtml = '';
        const variantMatch = item.name.match(/(.*)\s\((.*)\)$/);
        if (variantMatch) {
            displayName = variantMatch[1].trim();
            variantBadgeHtml = `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-inner inline-block">${variantMatch[2]}</span>`;
        }

        let logicBadges = '';
        // Solo mostramos "Envío Gratis" en el producto si LA TIENDA alcanzó la meta
        if (storeTotals[store].earnedFreeShipping && (item.free_shipping === true || item.free_shipping === 'true')) {
            logicBadges += `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-inner inline-block">🚚 Envío Gratis Aplicado</span>`;
        }
        if (item.is_on_demand === true || item.is_on_demand === 'true') {
            hasOnDemand = true;
            logicBadges += `<span class="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-inner inline-block">⚡ Bajo Pedido</span>`;
        }

        // 🍎 BOTONES SEPARADOS PARA EVITAR CLICS FALSOS
        const deleteBtnHtml = isCartLocked ? '' : `
        <button onclick="removeCheckoutItem(${index})" class="text-gray-500 hover:text-red-500 transition-colors p-1" title="Eliminar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>`;

        const controlsHtml = isCartLocked ? `
        <span class="text-[9px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1.5 shadow-inner">
            <svg class="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Reservado: ${qty}
        </span>` : `
        <div class="flex items-center bg-[#030305] rounded-full border border-white/10 h-7 shadow-inner">
            <button onclick="updateCheckoutItemQty(${index}, -1)" class="px-2.5 text-gray-400 hover:text-white transition font-black text-sm">-</button>
            <span class="text-[10px] font-black text-white w-3 text-center">${qty}</span>
            <button onclick="updateCheckoutItemQty(${index}, 1)" class="px-2.5 text-gray-400 hover:text-white transition font-black text-sm">+</button>
        </div>`;

        container.innerHTML += `
        <div class="bg-[#050508]/50 p-3 rounded-[1.5rem] border ${isCartLocked ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/5 hover:border-white/20'} mb-3 transition-all duration-300">
            <div class="flex gap-3">
                <div class="w-16 h-16 bg-white/5 rounded-xl border border-white/5 p-1 shrink-0 flex items-center justify-center">
                    <img src="${item.imageUrl || item.image_url}" class="max-h-full object-contain filter drop-shadow-md" alt="${displayName}">
                </div>
                
                <div class="flex-grow flex flex-col justify-between min-w-0">
                    <div class="flex justify-between items-start">
                        <div class="pr-2 min-w-0">
                            <h4 class="text-xs font-bold text-white leading-tight truncate w-full">${displayName}</h4>
                            <span class="text-[8px] text-[#FFC300] uppercase font-bold tracking-widest block truncate w-full">${store}</span>
                        </div>
                        <div class="shrink-0">
                            ${deleteBtnHtml}
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-1 mt-1">
                        ${variantBadgeHtml}
                        ${logicBadges}
                    </div>
                </div>
            </div>
            
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                ${controlsHtml}
                <div class="flex flex-col items-end">
                    ${discountTotal > 0 ? `<span class="text-[9px] text-gray-500 line-through leading-none mb-0.5 font-bold uppercase tracking-widest">Ref: $${formatMoney(bPriceTotal)}</span>` : ''}
                    <span class="font-black text-white text-sm tracking-tight leading-none">$${formatMoney(fPriceTotal)}</span>
                </div>
            </div>
        </div>`;
    });

    cartTotal = finalTotal;
    const totalSavings = rawTotal - finalTotal;

    // Actualizar Totales
    document.getElementById('summary-raw-total').innerText = `$${formatMoney(rawTotal)}`;
    document.getElementById('summary-total').innerText = `$${formatMoney(cartTotal)}`;
    
    const savingsRow = document.getElementById('summary-savings-row');
    if (savingsRow) {
        if (totalSavings > 0) {
            savingsRow.classList.remove('hidden');
            document.getElementById('summary-savings').innerText = `-$${formatMoney(totalSavings)}`;
        } else {
            savingsRow.classList.add('hidden');
        }
    }

    // 🧠 3. ALERTAS DE LOGÍSTICA (ESTRICTAS Y SIN TRAMPAS)
    const alertMulti = document.getElementById('alert-multi-store');
    const alertOnDemand = document.getElementById('alert-on-demand');
    const alertFreeShipping = document.getElementById('alert-free-shipping');
    const shippingLabel = document.getElementById('summary-shipping-label');

    if (alertMulti) storeSet.size > 1 ? alertMulti.classList.remove('hidden') : alertMulti.classList.add('hidden');
    if (alertOnDemand) hasOnDemand ? alertOnDemand.classList.remove('hidden') : alertOnDemand.classList.add('hidden');
    
    if (alertFreeShipping) {
        if (storesWithFreeShippingEarned > 0) {
            // SÍ LLEGARON A LA META: Mostrar el SWITCH
            alertFreeShipping.classList.remove('hidden');
            alertFreeShipping.className = "bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col gap-3 mt-4";
            alertFreeShipping.innerHTML = `
                <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                    <div class="pr-2">
                        <span class="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">¡Envío Gratis Desbloqueado!</span>
                        <p class="text-[10px] text-gray-400 leading-relaxed">Tu orden superó el mínimo requerido.</p>
                    </div>
                </div>
                <div class="flex items-center justify-between border-t border-emerald-500/20 pt-3 mt-1">
                    <span class="text-[10px] font-bold text-white uppercase tracking-widest">¿Activar Envío Gratis?</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="toggle-free-shipping" class="sr-only peer" checked>
                        <div class="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                </div>
                ${pendingShippingHtml}
            `;
            if(shippingLabel) shippingLabel.innerText = pendingShippingHtml ? "A Calcular / Híbrido" : "A Calcular / Gratis";

        } else if (pendingShippingHtml !== '') {
            // NINGUNA LLEGÓ A LA META: SE DESTRUYE EL SWITCH Y QUEDA EN COBRO A DESTINO.
            alertFreeShipping.classList.remove('hidden');
            alertFreeShipping.className = "bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex flex-col gap-3 mt-4";
            alertFreeShipping.innerHTML = `
                <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-[#FFC300] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <div class="pr-2 w-full">
                        <span class="block text-xs font-bold text-[#FFC300] uppercase tracking-widest mb-1">Envío Gratis No Alcanzado</span>
                        <p class="text-[10px] text-gray-400 leading-relaxed mb-3">Estás por debajo del mínimo requerido por el proveedor.</p>
                        ${pendingShippingHtml}
                        <p class="text-[10px] text-white font-bold leading-relaxed mt-4 pt-3 border-t border-red-500/20">
                            Si deseas continuar, tu pedido será enviado con Cobro a Destino.
                        </p>
                    </div>
                </div>
            `;
            if(shippingLabel) shippingLabel.innerText = "Cobro a Destino";
        } else {
            alertFreeShipping.classList.add('hidden');
            if(shippingLabel) shippingLabel.innerText = "Cobro a Destino";
        }
    }

    // Dibujado BCV
    const vesContainer = document.getElementById('summary-ves-container');
    const warningMsg = document.getElementById('bcv-warning-msg');
    const btnProcess = document.getElementById('btn-process-order');

    if (isBcvValid && currentBcvRate > 0) {
        const totalBs = formatMoney(cartTotal * currentBcvRate);
        if(document.getElementById('summary-total-ves')) document.getElementById('summary-total-ves').innerText = `Bs. ${totalBs}`;
        if(document.getElementById('bcv-rate-display')) document.getElementById('bcv-rate-display').innerText = `Tasa Oficial BCV: Bs. ${formatMoney(currentBcvRate)}`;
        if(vesContainer) vesContainer.classList.remove('hidden');
        if(warningMsg) warningMsg.classList.add('hidden');
        if(currentPaymentMethod === 'pago_movil' && btnProcess) btnProcess.querySelector('span').innerText = `Pagar Bs. ${totalBs}`;
    } else {
        if(vesContainer) vesContainer.classList.add('hidden');
        if(warningMsg) warningMsg.classList.remove('hidden');
        if(currentPaymentMethod === 'pago_movil' && btnProcess) btnProcess.querySelector('span').innerText = `Completar Compra (Calcular BCV)`;
    }

    if (cartItems.length === 0) {
        document.getElementById('checkout-content').classList.remove('hidden'); 
        document.getElementById('checkout-container').classList.add('hidden'); 
        document.getElementById('empty-cart-msg').classList.remove('hidden'); 
    } else {
        document.getElementById('checkout-container').classList.remove('hidden');
        document.getElementById('empty-cart-msg').classList.add('hidden');
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

// ==========================================
// 3. WIZARD: KYC Y LOGÍSTICA
// ==========================================
document.getElementById('form-kyc').addEventListener('submit', (e) => {
    e.preventDefault();
    const docType = document.getElementById('kyc-doc-type').value;
    const docNumber = document.getElementById('kyc-doc-number').value.trim();
    const imageFile = document.getElementById('kyc-image').files[0];

    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
        alert("La fotografía excede el límite de 2MB. Por favor comprima la imagen.");
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

    // 🧠 PAYLOAD PERFECTO PARA EL BACKEND (Maneja el Real ID y el Peso)
    const cleanItems = cartItems.map(item => ({
        id: item.id, // ID Único del carrito (Ej: prod123_Talla-M-Rojo)
        real_id: item.real_id || item.id, // ID Real en Firestore
        name: item.name,
        price: item.price,
        qty: item.quantity || item.qty || 1,
        storeName: item.storeName || item.store_name || 'Gymenez Store',
        weight_kg: item.weight_kg || 1 
    }));

    try {
        const res = await fetch(`${API_BASE_URL}/api/store/checkout/reserve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cleanItems })
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

// 🛡️ SUBMIT FINAL DE LA ORDEN AL BACKEND PYTHON
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
        // 🍎 PASAMOS ESTAS BANDERAS PARA QUE PYTHON SEPA QUÉ HACER
        free_shipping: item.free_shipping === true || item.free_shipping === 'true',
        is_on_demand: item.is_on_demand === true || item.is_on_demand === 'true'
    }));

    // 🍎 CAPTURAMOS LA DECISIÓN DEL CLIENTE (El Switch de Envío)
    const toggleFreeShipping = document.getElementById('toggle-free-shipping');
    const wantsFreeShipping = toggleFreeShipping ? toggleFreeShipping.checked : false;

    const payload = {
        items: cleanItems,
        totalAmount: cartTotal,
        paymentMethod: currentPaymentMethod,
        reference: reference,
        wants_free_shipping: wantsFreeShipping // 🍎 Mandamos la decisión al backend
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
            // COMPRA EXITOSA 
            localStorage.removeItem('gymenez_cart');
            localStorage.removeItem('gymen_vault_expires_at');
            
            document.getElementById('vault-view').classList.add('hidden');
            document.getElementById('summary-panel').classList.add('opacity-0'); 
            document.getElementById('success-view').classList.remove('hidden');
            document.getElementById('success-ref').innerText = reference;
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert(data.error || "Transacción rechazada por el servidor.");
            resetBtn(btn);
            startVaultTimer(new Date().getTime() + 60000); 
            document.getElementById('btn-cancel-vault').disabled = false;
        }
    } catch (error) {
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
