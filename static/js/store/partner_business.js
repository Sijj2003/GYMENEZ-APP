// ====================================================================
// 🏢 MOTOR DEL CENTRO DE NEGOCIOS (B2B ZERO-TRUST)
// ====================================================================

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymenez_partner_token';
let selectedModel = null;
let currentSettings = null; // Guardar las settings para usar el link de descarga

document.addEventListener('DOMContentLoaded', () => {
    fetchBusinessSettings();
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
            currentSettings = data.settings;
            initializeBusinessCenter(data.settings);
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
        // 1. INYECTAR LOS DATOS GUARDADOS
        document.getElementById('wallet-binance').value = settings.wallet_binance || '';
        document.getElementById('wallet-bank-name').value = settings.wallet_bank_name || '';
        document.getElementById('wallet-bank-account').value = settings.wallet_bank_account || '';

        // 2. BLOQUEAR LOS CAMPOS (Input usa readonly, Select usa disabled)
        document.getElementById('wallet-binance').setAttribute('readonly', true);
        document.getElementById('wallet-bank-name').setAttribute('disabled', true);
        document.getElementById('wallet-bank-account').setAttribute('readonly', true);
        
        // 3. CAMBIAR INTERFAZ
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
// 4. DESCARGA DEL CONTRATO VIGENTE Y SOLICITUD DE CAMBIO (Zero-Trust Frontend)
// ====================================================================
async function downloadCurrentContract() {
    if (!currentSettings || !currentSettings.contract_pdf_url) {
        alert("No se encontró una ruta de descarga para el contrato vigente. Contacte a soporte.");
        return;
    }
    
    const token = localStorage.getItem(TOKEN_KEY);
    
    try {
        // En lugar de descargar un archivo físico desde el backend, le pedimos al backend
        // los datos en formato JSON para que el frontend genere el PDF bonito.
        const res = await fetch(`${API_BASE_URL}${currentSettings.contract_pdf_url}?format=json`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            alert(data.message || "Error al descargar el contrato.");
            return;
        }

        if (data.success && data.contract) {
            generateBeautifulPDF(data.contract);
        } else {
            alert("No se pudieron obtener los datos del contrato para generar el PDF.");
        }
        
    } catch (error) {
        console.error("Error en la descarga del contrato:", error);
        alert("Ocurrió un error al intentar descargar el contrato legal.");
    }
}

function generateBeautifulPDF(contractData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuraciones Generales
    const margin = 20;
    let yPos = 20;

    // Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 195, 0); // Color corporativo Gymenez
    doc.text("GYMENEZ", margin, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("CENTRO DE NEGOCIOS B2B", margin, yPos + 6);
    
    // Título del Documento
    yPos += 25;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("REGLAMENTO B2B - ANEXO DE RENTABILIDAD", 105, yPos, null, null, "center");
    
    // Subtítulo
    yPos += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`MODELO SELECCIONADO: ${contractData.model_selected.toUpperCase()}`, 105, yPos, null, null, "center");
    
    // Línea separadora
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, 190, yPos);
    
    // Bloque de Datos de la Tienda
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATOS DE LA TIENDA Y REPRESENTANTE:", margin, yPos);
    
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Razón Social: ${contractData.partner_name}`, margin, yPos);
    yPos += 6;
    doc.text(`Cédula / RIF: ${contractData.partner_document}`, margin, yPos);
    yPos += 6;
    doc.text(`Correo Electrónico (Máster): ${contractData.partner_email}`, margin, yPos);
    
    // Línea separadora
    yPos += 8;
    doc.line(margin, yPos, 190, yPos);
    
    // Cláusula Legal
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text("CLÁUSULA DE OPERACIÓN ACEPTADA:", margin, yPos);
    
    yPos += 8;
    doc.setFont("helvetica", "normal");
    // Dividir texto largo para que encaje
    const splitClause = doc.splitTextToSize(contractData.legal_clause, 170);
    doc.text(splitClause, margin, yPos);
    
    // Ajustar yPos después del texto largo
    yPos += (splitClause.length * 6) + 15;
    
    doc.setFont("helvetica", "bold");
    doc.text("ACEPTACIÓN Y VALIDACIÓN ZERO-TRUST:", margin, yPos);
    
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.text("Al presionar 'Firmar y Sellar' en la plataforma, la Tienda aceptó irrevocablemente", margin, yPos);
    yPos += 6;
    doc.text("los términos de este anexo.", margin, yPos);
    
    // Datos de auditoría / Firma digital
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text(`FECHA DE FIRMA:`, margin, yPos);
    doc.setFont("helvetica", "normal");
    // Formatear fecha
    const dateObj = new Date(contractData.signed_at);
    const dateStr = dateObj.toLocaleDateString('es-VE') + " " + dateObj.toLocaleTimeString('es-VE');
    doc.text(dateStr, margin + 40, yPos);
    
    yPos += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`DIRECCIÓN IP DE ORIGEN:`, margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(contractData.signed_ip, margin + 55, yPos);
    
    // Zona de "Firma" Visual
    yPos += 30;
    doc.setDrawColor(0, 0, 0);
    doc.line(60, yPos, 150, yPos);
    
    yPos += 6;
    doc.setFont("helvetica", "bold");
    doc.text("ACEPTADO Y FIRMADO DIGITALMENTE POR:", 105, yPos, null, null, "center");
    
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text(contractData.partner_name, 105, yPos, null, null, "center");
    
    yPos += 6;
    doc.text(`C.I / RIF: ${contractData.partner_document}`, 105, yPos, null, null, "center");

    // Pie de página (Validación del sistema)
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Documento Inmutable Hash ID: ${contractData.contract_id || 'Validado por Gymenez System'}`, 105, 280, null, null, "center");

    // Guardar el archivo
    doc.save(`Contrato_${contractData.model_selected.replace(' ', '_')}_${contractData.partner_document}.pdf`);
}

function generateChangeRequestPDF() {
    // Obtenemos los datos cacheados que ya se inyectaron en el modal de Perfil
    const storeName = document.getElementById('prof-name').value || "Tienda Desconocida";
    const documentId = document.getElementById('prof-doc').value || "N/A";
    const email = document.getElementById('prof-email').value || "N/A";
    
    if (!currentSettings || !currentSettings.active_commission_model) {
        alert("Actualmente no tienes un modelo activo para cambiar.");
        return;
    }
    
    const currentModel = currentSettings.active_commission_model;
    
    // Configuración de jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SOLICITUD DE MODIFICACION B2B (ZERO-TRUST)", 105, 20, null, null, "center");
    
    // Subtítulo / Instrucciones
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("INSTRUCCIONES OBLIGATORIAS PARA LA TIENDA:", 20, 35);
    doc.text("1. Imprima este documento en físico.", 20, 42);
    doc.text("2. Firme y coloque la huella dactilar del representante legal en la parte inferior.", 20, 49);
    doc.text("3. Escanee o tome una fotografía legible del documento firmado.", 20, 56);
    doc.text("4. Envíe el documento digital en formato PDF vía WhatsApp al soporte técnico de Gymenez.", 20, 63);
    
    // Línea separadora
    doc.line(20, 70, 190, 70);
    
    // Datos de la solicitud
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DATOS DE LA SOLICITUD:", 20, 85);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Razón Social / Nombre de Tienda: ${storeName}`, 20, 95);
    doc.text(`RIF / Cédula de Identidad: ${documentId}`, 20, 102);
    doc.text(`Correo Electrónico (Máster): ${email}`, 20, 109);
    doc.text(`Modelo de Rentabilidad Actual: ${currentModel}`, 20, 116);
    
    // Fecha actual
    const today = new Date();
    const dateString = today.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Fecha de Emisión: ${dateString}`, 20, 123);
    
    // Declaración
    doc.setFont("helvetica", "italic");
    doc.text("Por medio del presente documento, declaro que no poseo ventas en proceso ni", 20, 140);
    doc.text("fondos pendientes por liquidar, y autorizo formalmente a Gymenez Store a revocar", 20, 147);
    doc.text("el contrato vigente para proceder a la selección de un nuevo Modelo de Rentabilidad.", 20, 154);
    
    // Zona de firma
    doc.line(60, 200, 150, 200);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FIRMA DEL REPRESENTANTE LEGAL", 105, 207, null, null, "center");
    
    // Guardar el PDF y forzar descarga
    doc.save(`Solicitud_Cambio_Modelo_${documentId}.pdf`);
}
