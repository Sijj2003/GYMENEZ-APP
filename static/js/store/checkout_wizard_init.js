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
