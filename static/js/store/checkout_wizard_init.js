// ==========================================
// 2. INICIALIZACIÓN Y PERSISTENCIA DE LA BÓVEDA (gymenez-checkout-init.js)
// ==========================================

async function initWizardData() {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');

    try {
        // 🚀 Carga en paralelo para optimizar la latencia
        const [profileRes, agenciesRes, paymentsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/store/athlete/profile`, { 
                headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId } 
            }),
            fetch(`${API_BASE_URL}/api/shipping/agencies`),
            fetch(`${API_BASE_URL}/api/store/payment-methods`, { 
                headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId } 
            })
        ]);

        // Procesamiento seguro de JSON
        const profileData = profileRes.ok ? await profileRes.json() : null;
        const agenciesData = agenciesRes.ok ? await agenciesRes.json() : null;
        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : null;

        if (agenciesData) {
            globalAgencies = agenciesData.agencies || agenciesData;
        }
        
        // 💱 Captura de Tasa BCV y Métodos de Pago
        if (paymentsData && paymentsData.success) {
            currentBcvRate = paymentsData.bcv_rate || 0;
            isBcvValid = paymentsData.bcv_valid || false; 
            if (typeof setupPaymentUI === 'function') {
                setupPaymentUI(paymentsData.methods);
            }
        }

        // Mostrar interfaz de checkout de forma segura
        document.getElementById('checkout-loader')?.classList.add('hidden');
        document.getElementById('checkout-content')?.classList.remove('hidden');
        document.getElementById('checkout-container')?.classList.remove('hidden');

        // 👤 Evaluar Estado de Identidad (KYC / Dirección)
        if (profileData && profileData.success) {
            evaluateUserProfile(profileData.profile);
        }

        // 🛡️ PERSISTENCIA DE LA BÓVEDA (En caso de recargar la página)
        const vaultExpiration = localStorage.getItem('gymen_vault_expires_at');
        if (vaultExpiration) {
            const now = new Date().getTime();
            const expTime = parseInt(vaultExpiration, 10);

            if (now < expTime) {
                isCartLocked = true;
                isShippingComplete = true; 
                document.getElementById('wizard-view')?.classList.add('hidden');
                document.getElementById('vault-view')?.classList.remove('hidden');
                
                if (typeof startVaultTimer === 'function') {
                    startVaultTimer(expTime);
                }
            } else {
                localStorage.removeItem('gymen_vault_expires_at');
            }
        }
        
        if (typeof renderCartSummary === 'function') {
            renderCartSummary(); 
        }

    } catch (error) {
        console.error("Error en pre-carga del Checkout:", error);
        alert("Fallo al sincronizar con la Bóveda Segura. Por favor recargue la página.");
    }
}

function evaluateUserProfile(p) {
    if (!p) return;

    if (p.store_profile_completed && p.kyc_cedula_url) {
        isShippingComplete = true;
        
        // Minimizar formulario KYC
        document.getElementById('kyc-form-container')?.classList.add('hidden');
        document.getElementById('kyc-success-msg')?.classList.remove('hidden');
        document.getElementById('link-edit-kyc')?.classList.remove('hidden');
        
        // Pre-Llenar Tarjeta de Logística Guardada
        const shippingContainer = document.getElementById('shipping-form-container');
        if (shippingContainer) {
            const courier = p.preferred_courier || 'Agencia';
            const city = p.shipping_city || '';
            const state = p.shipping_state || '';

            shippingContainer.innerHTML = `
                <div class="mt-2 p-5 bg-[#12121a] border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-inner">
                    <div>
                        <p class="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Destino Principal Guardado
                        </p>
                        <p class="text-sm text-white font-bold tracking-wide">${courier} - ${city}${state ? ', ' + state : ''}</p>
                    </div>
                    <a href="/store/account.html" class="text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-[#FFC300] transition">Cambiar</a>
                </div>
            `;
        }
        
        const step2Container = document.getElementById('step-2-card');
        step2Container?.classList.remove('step-locked');

        const badge = document.getElementById('badge-step-2');
        if (badge) {
            badge.innerHTML = '<svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
            badge.className = 'w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
        }

        document.getElementById('vault-entry-container')?.classList.remove('hidden');
    } else {
        if (typeof setupShippingCascade === 'function') {
            setupShippingCascade();
        }
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
