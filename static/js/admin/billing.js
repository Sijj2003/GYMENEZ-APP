const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let pendingPaymentId = null;
let pendingActionStatus = null;

function showAdminToast(message, type = 'success') {
    const box = document.getElementById('admin-toast');
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

// 📋 Descargar la lista de pagos pendientes
async function fetchPendingPayments() {
    const spinner = document.getElementById('admin-spinner');
    const workspace = document.getElementById('billing-workspace');
    const tbody = document.getElementById('pending-payments-tbody');

    spinner.classList.remove('hidden');
    workspace.classList.add('hidden');
    tbody.innerHTML = '';

    try {
        const token = localStorage.getItem('gymen_admin_token');
        const res = await fetch(`${API_BASE_URL}/api/payments/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            const payments = data.pending_payments || [];
            
            if (payments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-emerald-500/50 uppercase tracking-widest font-black text-[10px]">No hay transferencias por revisar. Caja al día.</td></tr>`;
            } else {
                payments.forEach(p => {
                    const tr = document.createElement('tr');
                    let planColor = p.plan === 'ULTRA' ? 'text-[#FFC300]' : 'text-sky-400';
                    
                    tr.innerHTML = `
                        <td class="p-5 font-mono text-[10px] text-gray-500">${p.fecha_reporte || 'N/A'}</td>
                        <td class="p-5 font-black uppercase tracking-widest ${planColor} text-[10px]">${p.plan}</td>
                        <td class="p-5 font-mono text-white text-sm tracking-wider font-bold">#${p.referencia}</td>
                        <td class="p-5 text-right font-mono font-black text-emerald-400 text-sm">${Number(p.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs</td>
                        <td class="p-5 text-right whitespace-nowrap">
                            <button onclick="processPayment('${p.id}', 'rechazado')" class="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition mr-2">Rechazar</button>
                            <button onclick="processPayment('${p.id}', 'aprobado')" class="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition shadow-[0_0_15px_rgba(16,185,129,0.2)]">Aprobar Pago</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            spinner.classList.add('hidden');
            workspace.classList.remove('hidden');
            workspace.classList.add('flex');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        spinner.innerHTML = `<p class="text-red-500 font-bold uppercase tracking-widest text-[10px]">Error de conexión financiera</p>`;
    }
}

// 🔐 Abrir Bóveda TOTP al hacer click en Aprobar/Rechazar
function processPayment(paymentId, actionStatus) {
    pendingPaymentId = paymentId;
    pendingActionStatus = actionStatus;
    
    document.getElementById('totp-input').value = '';
    const modal = document.getElementById('totp-modal');
    const content = document.getElementById('totp-content');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        document.getElementById('totp-input').focus();
    }, 50);
}

function closeTOTPModal() {
    const modal = document.getElementById('totp-modal');
    const content = document.getElementById('totp-content');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        pendingPaymentId = null;
        pendingActionStatus = null;
        document.getElementById('btn-totp-verify').disabled = false;
        document.getElementById('btn-totp-verify').textContent = "Confirmar Operación";
    }, 300);
}

// Filtro anti-letras estricto
document.getElementById('totp-input')?.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, ''); 
});

async function executePaymentVerification() {
    const otpCode = document.getElementById('totp-input').value;
    const btn = document.getElementById('btn-totp-verify');
    
    if (otpCode.length !== 6) {
        showAdminToast("El código debe tener exactamente 6 dígitos.", "error");
        return;
    }

    btn.disabled = true;
    btn.textContent = "VALIDANDO FIRMA...";

    try {
        const token = localStorage.getItem('gymen_admin_token');
        const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                payment_id: pendingPaymentId,
                status: pendingActionStatus,
                otp_code: otpCode
            })
        });

        // 🔍 DEBUG: Esto nos ayudará a ver qué responde el servidor
        const data = await res.json();
        console.log("Respuesta del servidor:", data); 

        if (res.ok && data.success) {
            showAdminToast(`Transacción ejecutada con éxito: ${data.action}`);
            closeTOTPModal();
            fetchPendingPayments();
        } else {
            // Esto mostrará el error real en tu pantalla (en lugar de quedarse en silencio)
            showAdminToast(data.error || "Fallo en la auditoría.", "error");
            btn.disabled = false;
            btn.textContent = "Confirmar Operación";
        }
    } catch (e) {
        console.error("Error en la petición:", e);
        showAdminToast("Falla de red o conexión al Core.", "error");
        btn.disabled = false;
        btn.textContent = "Confirmar Operación";
    }
}

// Inicializar tabla al entrar
window.addEventListener('DOMContentLoaded', () => {
    fetchPendingPayments();
});
