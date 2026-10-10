// ====================================================================
// 🏢 MOTOR DEL CENTRO DE NEGOCIOS (B2B ZERO-TRUST)
// ====================================================================

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymenez_partner_token';
let selectedModel = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchBusinessSettings();
    setupDescriptionListener(); // Escucha cambios en el Escaparate
});

// ====================================================================
// 1. CARGA INICIAL DESDE EL BACKEND
// ====================================================================
async function fetchBusinessSettings() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/settings`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            initializeBusinessCenter(data.settings);
            
            // Inyectar descripción pública si existe
            const descInput = document.querySelector('textarea');
            if (descInput && data.settings.store_description) {
                descInput.value = data.settings.store_description;
            }
        }
    } catch (error) {
        console.error("Error cargando configuración del negocio:", error);
    }
}

function initializeBusinessCenter(settings) {
    // A. Widget de Crédito de Activación
    const creditWidget = document.getElementById('activation-credit-widget');
    if (settings.activation_credit_remaining > 0) {
        creditWidget.classList.remove('hidden');
        document.getElementById('credit-amount').innerText = `$${settings.activation_credit_remaining.toFixed(2)}`;
        
        const percentage = (settings.activation_credit_remaining / 100) * 100;
        document.getElementById('credit-progress').style.width = `${percentage}%`;
    } else {
        creditWidget.classList.add('hidden'); // Ocultar si llegó a 0
    }

    // B. Widget de Bóveda (Wallet Lock - Zero Trust)
    if (settings.has_wallet_configured) {
        document.getElementById('wallet-binance').setAttribute('readonly', true);
        document.getElementById('wallet-bank-name').setAttribute('readonly', true);
        document.getElementById('wallet-bank-account').setAttribute('readonly', true);
        
        document.getElementById('btn-save-wallet').classList.add('hidden');
        document.getElementById('wallet-locked-msg').classList.remove('hidden');
        document.getElementById('wallet-locked-msg').classList.add('flex');
    }

    // C. Modelo de Rentabilidad (Contract Lock - Zero Trust)
    if (settings.active_commission_model) {
        document.getElementById('active-model-badge').classList.remove('hidden');
        document.getElementById('model-locked-panel').classList.remove('hidden');
        
        // Bloquear grilla visualmente
        const grid = document.getElementById('models-grid');
        grid.style.opacity = '0.5';
        grid.style.pointerEvents = 'none';
    }
}

// ====================================================================
// 2. LÓGICA DE BÓVEDA (SELLADO EN BACKEND)
// ====================================================================
async function saveWallets() {
    const binance = document.getElementById('wallet-binance').value.trim();
    const bank = document.getElementById('wallet-bank-name').value.trim();
    const acc = document.getElementById('wallet-bank-account').value.trim();

    if (!binance && (!bank || !acc)) {
        alert("Debes configurar al menos Binance Pay o tu Cuenta Bancaria completa para sellar la bóveda.");
        return;
    }

    const confirm = window.confirm("ATENCIÓN: Por protocolos Zero-Trust y Anti-Lavado de Dinero (AML), estas cuentas no podrán ser modificadas desde este panel una vez guardadas. ¿Confirmas que los datos pertenecen estrictamente a la Razón Social / Titular de la tienda?");
    
    if (!confirm) return;

    const token = localStorage.getItem(TOKEN_KEY);
    const btn = document.getElementById('btn-save-wallet');
    btn.innerHTML = "Sellando Bóveda...";
    btn.classList.add('pointer-events-none', 'opacity-80');

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/settings/wallet`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ binance: binance, bank_name: bank, bank_account: acc })
        });
        
        const data = await res.json();
        alert(data.message);
        
        if (data.success) {
            window.location.reload(); 
        } else {
            btn.innerHTML = "Guardar Bóveda";
            btn.classList.remove('pointer-events-none', 'opacity-80');
        }
    } catch (error) {
        alert("Error de conexión al sellar la bóveda.");
        btn.innerHTML = "Guardar Bóveda";
        btn.classList.remove('pointer-events-none', 'opacity-80');
    }
}

// ====================================================================
// 3. LÓGICA DEL CONTRATO (GENERACIÓN DE PDF EN BACKEND)
// ====================================================================
function openContractModal(modelName) {
    selectedModel = modelName;
    const modal = document.getElementById('contract-modal');
    const title = document.getElementById('contract-title');
    const body = document.getElementById('contract-body');

    title.innerText = modelName;

    let contractText = `
        <p><strong>REGLAMENTO B2B - ANEXO DE RENTABILIDAD Y COSTOS OPERATIVOS</strong></p>
        <p>El presente Anexo rige los términos exclusivos bajo los cuales Gymenez Store procesará el cobro de la Tasa Operativa (Take Rate) y las comisiones de pasarelas de pago asociadas al modelo <strong>${modelName}</strong> elegido voluntariamente por la Tienda.</p>
    `;

    if (modelName === 'Neto Garantizado') {
        contractText += `<p><strong>Cláusula 1 (Mecánica):</strong> La Tienda establece que el margen de ganancia líquida sobre el precio base del producto es inamovible. Gymenez Store inflará algorítmicamente el "Precio de Vitrina" para garantizar que el Cliente Final absorba el 10% de intermediación tecnológica y los recargos de las plataformas bancarias o procesadores.</p>`;
    } else if (modelName === 'Absorción B2B') {
        contractText += `<p><strong>Cláusula 1 (Mecánica):</strong> La Tienda establece un precio de venta fijo y competitivo en el catálogo. La Tienda asume explícitamente el pago de la intermediación tecnológica (10%) y el costo de la pasarela de pago seleccionada por el Cliente. Estos montos serán deducidos matemáticamente en el panel de Escrow antes de la liquidación de fondos.</p>`;
    } else {
        contractText += `<p><strong>Cláusula 1 (Mecánica):</strong> La Tienda asume el cobro del 10% de intermediación de plataforma, mientras que el Cliente Final asume exclusivamente los recargos o tarifas por uso de pasarelas (Service Fee) según el método de pago seleccionado en el Checkout.</p>`;
    }

    contractText += `<p><strong>Cláusula 2 (Generación y Vinculación):</strong> La aceptación de este anexo ordena al motor de Gymenez generar un Documento PDF sellado con los datos fiscales (RIF/CI) de la Tienda. Dicho documento es irrevocable e inmutable. Para modificar este modelo en el futuro, la Tienda deberá someterse al proceso manual de 24 horas estipulado en las normativas del panel corporativo.</p>`;

    body.innerHTML = contractText;
    
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); }, 10);
}

function closeContractModal() {
    const modal = document.getElementById('contract-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
    selectedModel = null;
}

async function signContract() {
    const token = localStorage.getItem(TOKEN_KEY);
    const btn = document.getElementById('btn-sign-contract');
    
    btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Generando PDF en Servidor...`;
    btn.classList.add('pointer-events-none', 'opacity-80');

    try {
        const res = await fetch(`${API_BASE_URL}/api/partner/settings/sign_contract`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: selectedModel })
        });
        
        const data = await res.json();
        alert(data.message);
        
        if (data.success) {
            window.location.reload(); 
        } else {
            closeContractModal();
            btn.innerHTML = `Firmar y Sellar Documento`;
            btn.classList.remove('pointer-events-none', 'opacity-80');
        }
    } catch (error) {
        alert("Error de conexión al generar el contrato.");
        closeContractModal();
        btn.innerHTML = `Firmar y Sellar Documento`;
        btn.classList.remove('pointer-events-none', 'opacity-80');
    }
}

// ====================================================================
// 4. LÓGICA DEL ESCAPARATE PÚBLICO (AUTO-GUARDADO)
// ====================================================================
function setupDescriptionListener() {
    const descInput = document.querySelector('textarea');
    if (!descInput) return;

    let timeoutId;
    
    descInput.addEventListener('input', () => {
        clearTimeout(timeoutId);
        // Auto-guardar 1.5 segundos después de que dejen de escribir
        timeoutId = setTimeout(() => {
            saveStoreDescription(descInput.value.trim());
        }, 1500);
    });
}

async function saveStoreDescription(text) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
        await fetch(`${API_BASE_URL}/api/partner/settings/profile`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description: text })
        });
        // No mostramos alert aquí para que sea un auto-guardado silencioso y fluido
    } catch (error) {
        console.error("Error auto-guardando la descripción:", error);
    }
}
