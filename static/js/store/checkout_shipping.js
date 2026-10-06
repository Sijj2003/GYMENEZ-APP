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
