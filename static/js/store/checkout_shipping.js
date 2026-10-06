// ==========================================
// 3. WIZARD: KYC Y LOGÍSTICA (gymenez-checkout-shipping.js)
// ==========================================

const formKyc = document.getElementById('form-kyc');
if (formKyc) {
    formKyc.addEventListener('submit', (e) => {
        e.preventDefault();
        const docType = document.getElementById('kyc-doc-type')?.value;
        const docNumber = document.getElementById('kyc-doc-number')?.value.trim();
        const imageFileInput = document.getElementById('kyc-image');
        const imageFile = imageFileInput?.files?.[0];

        if (imageFile && imageFile.size > 2 * 1024 * 1024) {
            alert("La fotografía excede el límite de 2MB. Por favor comprima la imagen.");
            return;
        }

        temporaryKycData = { docType, docNumber, imageFile };
        
        document.getElementById('kyc-form-container')?.classList.add('hidden');
        document.getElementById('kyc-success-msg')?.classList.remove('hidden');
        
        if (typeof unlockStep === 'function') {
            unlockStep(2);
        }
        
        document.getElementById('step-2-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function setupShippingCascade() {
    const courierSelect = document.getElementById('shipping-courier');
    const stateSelect = document.getElementById('shipping-state');
    const agencySelect = document.getElementById('shipping-agency');
    const btnSubmitShipping = document.getElementById('btn-submit-shipping');

    if (!courierSelect || !stateSelect || !agencySelect) return;

    courierSelect.addEventListener('change', (e) => {
        const courier = e.target.value;
        agencySelect.innerHTML = '<option value="">Elige un Estado primero...</option>';
        agencySelect.disabled = true;
        if (btnSubmitShipping) btnSubmitShipping.disabled = true;

        if (!courier) {
            stateSelect.innerHTML = '<option value="">Elige un Estado...</option>';
            stateSelect.disabled = true;
            return;
        }

        const availableStates = [...new Set(
            (globalAgencies || [])
                .filter(a => a.courier === courier)
                .map(a => a.state)
        )].sort();

        let optionsHtml = '<option value="">Elige un Estado...</option>';
        availableStates.forEach(state => {
            optionsHtml += `<option value="${state}">${state}</option>`;
        });

        stateSelect.innerHTML = optionsHtml;
        stateSelect.disabled = false;
    });

    stateSelect.addEventListener('change', (e) => {
        const courier = courierSelect.value;
        const state = e.target.value;
        if (btnSubmitShipping) btnSubmitShipping.disabled = true;

        if (!state) {
            agencySelect.innerHTML = '<option value="">Selecciona tu Sucursal...</option>';
            agencySelect.disabled = true;
            return;
        }

        const filteredAgencies = (globalAgencies || []).filter(a => a.courier === courier && a.state === state);
        
        let optionsHtml = '<option value="">Selecciona tu Sucursal...</option>';
        filteredAgencies.forEach(agency => {
            const truncatedAddr = agency.address ? agency.address.substring(0, 40) + '...' : '';
            optionsHtml += `<option value="${agency.id}">${agency.name} - ${truncatedAddr}</option>`;
        });

        agencySelect.innerHTML = optionsHtml;
        agencySelect.disabled = false;
    });

    agencySelect.addEventListener('change', (e) => {
        if (btnSubmitShipping) btnSubmitShipping.disabled = !e.target.value;
    });
}

const btnSubmitShipping = document.getElementById('btn-submit-shipping');
if (btnSubmitShipping) {
    btnSubmitShipping.addEventListener('click', async (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
        
        const courierSelect = document.getElementById('shipping-courier');
        const stateSelect = document.getElementById('shipping-state');
        const agencySelect = document.getElementById('shipping-agency');

        if (!courierSelect || !stateSelect || !agencySelect || !agencySelect.value) return;

        const courier = courierSelect.value;
        const state = stateSelect.value;
        const agencyId = agencySelect.value;
        
        const selectedOption = agencySelect.options[agencySelect.selectedIndex];
        const agencyText = selectedOption ? selectedOption.text : '';
        const agencyName = agencyText.split(' - ')[0] || 'Agencia';

        const formData = new FormData();
        formData.append('courier', courier);
        formData.append('state', state);
        formData.append('city', agencyName); 
        formData.append('municipality', agencyId);

        if (typeof temporaryKycData !== 'undefined' && temporaryKycData) {
            if (temporaryKycData.docType) formData.append('docType', temporaryKycData.docType);
            if (temporaryKycData.docNumber) formData.append('docNumber', temporaryKycData.docNumber);
            if (temporaryKycData.imageFile) {
                formData.append('cedula_image', temporaryKycData.imageFile);
            }
        }

        btn.disabled = true;
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>';

        try {
            const res = await fetch(`${API_BASE_URL}/api/store/athlete/profile`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'X-Device-ID': deviceId 
                },
                body: formData
            });

            const data = res.ok ? await res.json() : null;
            
            if (res.ok && data && data.success) {
                isShippingComplete = true; 
                
                const badge = document.getElementById('badge-step-2');
                if (badge) {
                    badge.innerHTML = '<svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
                    badge.className = 'w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
                }
                
                document.getElementById('shipping-form-container')?.classList.add('hidden');
                document.getElementById('vault-entry-container')?.classList.remove('hidden');
            } else {
                alert(data?.error || "Fallo al registrar datos logísticos. Revise la información.");
                btn.disabled = false;
                btn.textContent = 'Reintentar Registro';
            }
        } catch (error) {
            console.error("Error al registrar envío/KYC:", error);
            alert("Fallo de comunicación con los servidores de logística.");
            btn.disabled = false;
            btn.textContent = 'Confirmar Datos de Envío';
        }
    });
}
