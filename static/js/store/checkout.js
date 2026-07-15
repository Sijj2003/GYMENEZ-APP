const TOKEN_KEY = 'gymen_auth_token';
let currentPaymentMethod = 'pago_movil';
let cartTotal = 0;
let cartItems = [];
let isShippingComplete = false;

document.addEventListener('DOMContentLoaded', () => {
    cartItems = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
    
    if (cartItems.length === 0) {
        document.getElementById('empty-cart-msg').classList.remove('hidden');
    } else {
        document.getElementById('checkout-container').classList.remove('hidden');
        renderCartSummary();
        loadShippingProfile();
        fetchPaymentMethods();
    }
});

// ==========================================
// 1. DIBUJAR RESUMEN DEL CARRITO
// ==========================================
function renderCartSummary() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    cartTotal = 0;

    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        cartTotal += itemTotal;

        container.innerHTML += `
            <div class="flex gap-4 items-center bg-[#0a0a0f] p-3 rounded-xl border border-white/5">
                <div class="w-16 h-16 bg-white/5 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                    <img src="${item.image_url}" alt="${item.name}" class="max-h-full object-contain">
                </div>
                <div class="flex-grow min-w-0">
                    <p class="text-sm font-bold text-white truncate">${item.name}</p>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest">${item.store_name}</p>
                    <p class="text-xs text-gray-400 mt-1">Cant: ${item.quantity} x $${item.price.toFixed(2)}</p>
                </div>
                <div class="font-black text-white">$${itemTotal.toFixed(2)}</div>
            </div>
        `;
    });

    document.getElementById('summary-subtotal').innerText = `$${cartTotal.toFixed(2)}`;
    document.getElementById('summary-total').innerText = `$${cartTotal.toFixed(2)}`;
}

// ==========================================
// 2. VERIFICAR LOGÍSTICA (PERFIL)
// ==========================================
async function loadShippingProfile() {
    const token = localStorage.getItem(TOKEN_KEY);
    const deviceId = localStorage.getItem('gymen_device_id') || ''; 

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/athlete/profile', {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'X-Device-ID': deviceId 
            }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            const p = data.profile;
            
            // 🐛 CORRECCIÓN: Ahora validamos con 'kyc_cedula_url' que es la variable real de tu BD
            if (p.store_profile_completed && p.kyc_cedula_url) {
                isShippingComplete = true;
                document.getElementById('shipping-info').classList.remove('hidden');
                document.getElementById('shipping-warning').classList.add('hidden'); // Asegurarnos de ocultar la alerta
                document.getElementById('ship-dest').innerText = `${p.shipping_city}, ${p.shipping_state}`;
                document.getElementById('ship-agency').innerText = p.preferred_courier;
            } else {
                document.getElementById('shipping-warning').classList.remove('hidden');
                disableCheckout("Debes completar tu perfil y KYC.");
            }
        }
    } catch (error) {
        console.error("Error cargando perfil", error);
    }
}

// ==========================================
// 3. CARGAR CUENTAS BANCARIAS (ZERO TRUST)
// ==========================================
async function fetchPaymentMethods() {
    const token = localStorage.getItem(TOKEN_KEY);
    const deviceId = localStorage.getItem('gymen_device_id') || ''; 

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/payment-methods', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId // 🛡️ SOLUCIÓN: Agregada llave del dispositivo
            }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            document.getElementById('loading-payment').classList.add('hidden');
            
            // Inyectar Datos Pago Móvil
            const pm = data.methods.pago_movil;
            document.getElementById('pm-banco').innerText = pm.banco;
            document.getElementById('pm-tlf').innerText = pm.telefono;
            document.getElementById('pm-doc').innerText = pm.documento;
            document.getElementById('pm-nombre').innerText = pm.nombre;

            // Inyectar Datos Binance
            const bin = data.methods.binance;
            document.getElementById('bin-id').innerText = bin.pay_id;
            document.getElementById('bin-email').innerText = bin.email;

            // Mostrar el por defecto
            selectPayment('pago_movil');
        }
    } catch (error) {
        document.getElementById('loading-payment').innerText = "Error cargando los métodos de pago.";
    }
}

// ==========================================
// 4. CAMBIAR PESTAÑA DE PAGO
// ==========================================
window.selectPayment = function(method) {
    currentPaymentMethod = method;
    
    const btnPm = document.getElementById('btn-pm');
    const btnBinance = document.getElementById('btn-binance');
    const dataPm = document.getElementById('data-pago-movil');
    const dataBinance = document.getElementById('data-binance');

    // Reset styles
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
}

// ==========================================
// 5. ENVIAR ORDEN AL SERVIDOR
// ==========================================
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isShippingComplete) {
        alert("Completa tu perfil de envío y KYC en 'Mi Hub' antes de continuar.");
        return;
    }

    const btn = document.getElementById('btn-submit-order');
    const msg = document.getElementById('checkout-msg');
    const reference = document.getElementById('pay-reference').value;
    
    btn.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div> Procesando...`;
    btn.disabled = true;
    msg.classList.add('hidden');

    const token = localStorage.getItem(TOKEN_KEY);
    const deviceId = localStorage.getItem('gymen_device_id') || ''; 

    const payload = {
        items: cartItems,
        totalAmount: cartTotal,
        paymentMethod: currentPaymentMethod,
        reference: reference
    };

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/checkout', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId, // 🛡️ SOLUCIÓN: Agregada llave del dispositivo
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // ¡COMPRA EXITOSA!
            // 1. Limpiar Carrito
            localStorage.removeItem('gymenez_cart');
            
            // 2. Mostrar Mensaje de Éxito
            document.getElementById('checkout-container').innerHTML = `
                <div class="col-span-12 text-center py-24 glass-panel rounded-[2rem] border border-emerald-500/30 bg-emerald-500/5">
                    <div class="text-7xl mb-6">✅</div>
                    <h2 class="text-4xl font-[900] uppercase italic tracking-tighter text-emerald-400 mb-4">¡Orden Recibida!</h2>
                    <p class="text-gray-300 text-lg max-w-xl mx-auto mb-8">Tu número de referencia <strong>${reference}</strong> ha sido enviado a nuestro equipo administrativo para su verificación.</p>
                    <a href="/store/account.html" class="bg-white/10 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white/20 transition">Ver en Mis Pedidos</a>
                </div>
            `;
        } else {
            msg.innerText = data.error || "Error al procesar la orden.";
            msg.className = "text-center text-xs font-bold uppercase tracking-widest mt-4 text-red-500";
            msg.classList.remove('hidden');
            resetBtn(btn);
        }
    } catch (error) {
        msg.innerText = "Fallo de conexión. Intenta de nuevo.";
        msg.className = "text-center text-xs font-bold uppercase tracking-widest mt-4 text-red-500";
        msg.classList.remove('hidden');
        resetBtn(btn);
    }
});

function disableCheckout(reason) {
    const btn = document.getElementById('btn-submit-order');
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btn.innerText = reason;
}

function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = `
        <span>Procesar Orden Segura</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
    `;
}
