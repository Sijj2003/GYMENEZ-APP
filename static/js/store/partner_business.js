// ====================================================================
// 🏢 MOTOR DEL CENTRO DE NEGOCIOS (B2B ZERO-TRUST)
// ====================================================================

let selectedModel = null;
let backendTriggerUrl = "/api/partner/settings/sign_contract"; // Endpoint futuro

document.addEventListener('DOMContentLoaded', () => {
    // 1. Simular Carga de Datos desde API (En producción viene del Backend)
    const storeSettings = {
        activation_credit_remaining: 100.00, // Si pones 0, el widget desaparece
        has_wallet_configured: false,        // Si pones true, se bloquean los inputs
        active_commission_model: null        // Si ya hay uno ("Absorción B2B"), bloquea la grilla
    };

    initializeBusinessCenter(storeSettings);
});

function initializeBusinessCenter(settings) {
    // A. Widget de Crédito
    const creditWidget = document.getElementById('activation-credit-widget');
    if (settings.activation_credit_remaining > 0) {
        creditWidget.classList.remove('hidden');
        document.getElementById('credit-amount').innerText = `$${settings.activation_credit_remaining.toFixed(2)}`;
        // Simular progreso visual
        const percentage = (settings.activation_credit_remaining / 100) * 100;
        document.getElementById('credit-progress').style.width = `${percentage}%`;
    }

    // B. Widget de Bóveda (Wallet Lock)
    if (settings.has_wallet_configured) {
        document.getElementById('wallet-binance').setAttribute('readonly', true);
        document.getElementById('wallet-bank-name').setAttribute('readonly', true);
        document.getElementById('wallet-bank-account').setAttribute('readonly', true);
        
        document.getElementById('btn-save-wallet').classList.add('hidden');
        document.getElementById('wallet-locked-msg').classList.remove('hidden');
        document.getElementById('wallet-locked-msg').classList.add('flex');
    }

    // C. Modelo de Rentabilidad (Contract Lock)
    if (settings.active_commission_model) {
        document.getElementById('active-model-badge').classList.remove('hidden');
        document.getElementById('model-locked-panel').classList.remove('hidden');
        // Deshabilitar clicks en la grilla visualmente
        const grid = document.getElementById('models-grid');
        grid.style.opacity = '0.5';
        grid.style.pointerEvents = 'none';
    }
}

// ====================================================================
// LÓGICA DE BÓVEDA (WALLET)
// ====================================================================
function saveWallets() {
    const binance = document.getElementById('wallet-binance').value;
    const bank = document.getElementById('wallet-bank-name').value;
    const acc = document.getElementById('wallet-bank-account').value;

    if (!binance && (!bank || !acc)) {
        alert("Debes configurar al menos Binance Pay o tu Cuenta Bancaria para guardar la bóveda.");
        return;
    }

    // Confirmación Zero-Trust
    const confirm = window.confirm("ATENCIÓN: Por protocolos Anti-Lavado de Dinero, estas cuentas no podrán ser modificadas desde el panel una vez guardadas. ¿Confirmas que los datos pertenecen a la Razón Social de la tienda?");
    
    if(confirm) {
        // Aquí iría el fetch POST a tu API
        alert("Bóveda sellada exitosamente.");
        window.location.reload(); // Recargar para aplicar el Lock visual
    }
}

// ====================================================================
// LÓGICA DEL MODAL DE CONTRATOS INTELIGENTES
// ====================================================================
function openContractModal(modelName) {
    selectedModel = modelName;
    const modal = document.getElementById('contract-modal');
    const title = document.getElementById('contract-title');
    const body = document.getElementById('contract-body');

    title.innerText = modelName;

    // Inyectar el texto base. (En el PDF del backend, irá con RIF y nombres reales)
    let contractText = `
        <p><strong>REGLAMENTO B2B - ANEXO DE RENTABILIDAD Y COSTOS OPERATIVOS</strong></p>
        <p>El presente Anexo rige los términos exclusivos bajo los cuales Gymenez Store procesará el cobro de la Tasa Operativa (Take Rate) y las comisiones de pasarelas de pago asociadas al modelo <strong>${modelName}</strong> elegido voluntariamente por la Tienda.</p>
    `;

    if (modelName === 'Neto Garantizado') {
        contractText += `
            <p><strong>Cláusula 1 (Mecánica):</strong> La Tienda establece que el margen de ganancia líquida sobre el precio base del producto es inamovible. Gymenez Store inflará algorítmicamente el "Precio de Vitrina" para garantizar que el Cliente Final absorba el 10% de intermediación tecnológica y los recargos de las plataformas bancarias o procesadores (ej. PayPal 5.4%).</p>
        `;
    } else if (modelName === 'Absorción B2B') {
        contractText += `
            <p><strong>Cláusula 1 (Mecánica):</strong> La Tienda establece un precio de venta fijo y competitivo en el catálogo. La Tienda asume explícitamente el pago de la intermediación tecnológica (10%) y el costo de la pasarela de pago seleccionada por el Cliente. Estos montos serán deducidos matemáticamente en el panel de Escrow antes de la liquidación de fondos.</p>
        `;
    } else {
        contractText += `
            <p><strong>Cláusula 1 (Mecánica):</strong> La Tienda asume el cobro del 10% de intermediación de plataforma, mientras que el Cliente Final asume exclusivamente los recargos o tarifas por uso de pasarelas (Service Fee) según el método de pago seleccionado en el Checkout.</p>
        `;
    }

    contractText += `
        <p><strong>Cláusula 2 (Generación y Vinculación):</strong> La aceptación de este anexo ordena al motor de Gymenez generar un Documento PDF sellado con los datos fiscales (RIF/CI) de la Tienda. Dicho documento es irrevocable e inmutable. Para modificar este modelo en el futuro, la Tienda deberá someterse al proceso manual de 24 horas estipulado en las normativas del panel corporativo.</p>
    `;

    body.innerHTML = contractText;
    
    modal.classList.remove('hidden');
    // Pequeño delay para la transición de opacidad de Tailwind
    setTimeout(() => { modal.classList.remove('opacity-0'); }, 10);
}

function closeContractModal() {
    const modal = document.getElementById('contract-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
    selectedModel = null;
}

function signContract() {
    const btn = document.getElementById('btn-sign-contract');
    btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Generando PDF en Servidor...`;
    btn.classList.add('pointer-events-none', 'opacity-80');

    // Aquí llamaríamos a Flask (backendTriggerUrl) para armar el PDF.
    // Simulamos la respuesta del backend:
    setTimeout(() => {
        alert(`¡Contrato para el modelo "${selectedModel}" generado y firmado exitosamente! Se ha guardado el PDF inmutable en sus registros.`);
        window.location.reload(); // Recargar para mostrar el modo "Locked"
    }, 2000);
}
