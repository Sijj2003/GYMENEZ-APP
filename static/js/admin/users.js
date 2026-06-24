// Configuración de API
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Estado en RAM (Acelera la búsqueda)
let allUsersData = [];
let activeUserId = null; 
let targetCertifyUserId = null; 

// ==========================================
// 📢 UTILIDADES UI
// ==========================================
function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

function formatToUpperCase(inputString) { return inputString ? inputString.toUpperCase().trim() : ''; }
function formatDateForBackend(dateValue) {
    if (!dateValue) return '';
    const parts = dateValue.split('-'); 
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateValue;
}
function getDefaultExpirationDate() {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
}

// ==========================================
// 📡 CARGA Y RENDERIZADO DE LA LISTA (RAM)
// ==========================================
async function fetchAllUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            allUsersData = data.users; 
            renderUsersList(allUsersData);
        } else throw new Error(data.error);
    } catch (error) {
        document.getElementById('users-list').innerHTML = `<div class="p-4 text-center text-red-500 font-bold text-[10px] uppercase tracking-widest">Error conectando al Core</div>`;
    }
}

function renderUsersList(users) {
    const container = document.getElementById('users-list');
    container.innerHTML = ''; 

    if (users.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">No hay coincidencias.</div>`;
        return;
    }

    users.forEach(user => {
        const item = document.createElement('div');
        const isActive = activeUserId === user.id;
        const isBlocked = user.is_blocked;
        const tier = user.subscription_level || 'BASICO';
        
        let tierColor = 'text-gray-500 border-gray-500/30';
        if(tier === 'PLUS') tierColor = 'text-sky-400 border-sky-500/30';
        if(tier === 'ULTRA') tierColor = 'text-[#FFC300] border-[#FFC300]/30';

        item.className = `p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-1 ${isActive ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`;
        item.onclick = () => loadUserDossier(user.id);

        item.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="font-black text-[11px] uppercase tracking-tight truncate ${isBlocked ? 'text-red-400 line-through' : 'text-white'}">${user.full_name || 'N/A'}</span>
                <span class="px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest ${tierColor}">${tier}</span>
            </div>
            <span class="text-[9px] font-mono text-gray-500 truncate">${user.email}</span>
        `;
        container.appendChild(item);
    });
}

// Búsqueda en tiempo real con DEBOUNCE
let searchTimeout;
document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) return renderUsersList(allUsersData);
        const filtered = allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term));
        renderUsersList(filtered);
    }, 200); 
});

// ==========================================
// 🗂️ DOSSIER 360 (SPLIT VIEW LOGIC)
// ==========================================
function loadUserDossier(userId) {
    activeUserId = userId;
    renderUsersList(document.getElementById('search-input').value ? allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(document.getElementById('search-input').value.toLowerCase().trim())) : allUsersData);

    const user = allUsersData.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('empty-state').classList.add('hidden');
    const dossier = document.getElementById('active-dossier');
    dossier.classList.remove('hidden');
    dossier.classList.add('flex');

    document.getElementById('d-name').textContent = user.full_name || 'N/A';
    document.getElementById('d-name').className = `text-3xl font-black uppercase tracking-tighter ${user.is_blocked ? 'text-red-500 line-through' : 'text-white'}`;
    document.getElementById('d-email').textContent = user.email || 'N/A';
    
    const statusEl = document.getElementById('d-status');
    statusEl.textContent = user.is_blocked ? 'BLOQUEADO' : 'ACTIVO';
    statusEl.className = `px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${user.is_blocked ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`;
    
    const tierEl = document.getElementById('d-tier');
    tierEl.textContent = user.subscription_level || 'BASICO';
    let tierColorClass = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    if(user.subscription_level === 'PLUS') tierColorClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if(user.subscription_level === 'ULTRA') tierColorClass = 'bg-[#FFC300]/10 text-[#FFC300] border-[#FFC300]/20';
    tierEl.className = `px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${tierColorClass}`;

    document.getElementById('f-id').value = user.id;
    document.getElementById('f-is-edit').value = 'true';
    document.getElementById('f-name').value = user.name || '';
    document.getElementById('f-lastname').value = user.last_name || '';
    
    const emailEl = document.getElementById('f-email');
    emailEl.value = user.email || '';
    emailEl.disabled = true; 
    
    const passEl = document.getElementById('f-password');
    passEl.disabled = true;
    passEl.required = false;
    passEl.placeholder = "Cambio exclusivo vía OTP Clave";
    
    document.getElementById('f-tier').value = user.subscription_level || 'BASICO';
    document.getElementById('f-expires').value = user.subscription_expires_at ? String(user.subscription_expires_at).split('T')[0] : getDefaultExpirationDate();
    document.getElementById('f-sex').value = user.sex || 'Otro';
    if(user.dob) document.getElementById('f-dob').value = user.dob.split('/').reverse().join('-');

    if (user.phone_number && user.phone_number.includes('-')) {
        const [prefix, number] = user.phone_number.split('-');
        document.getElementById('f-phone-pre').value = prefix || '0414';
        document.getElementById('f-phone-num').value = number || '';
    } else {
        document.getElementById('f-phone-num').value = user.phone_number || '';
    }

    const btnBlock = document.getElementById('btn-block');
    btnBlock.textContent = user.is_blocked ? 'Desbloquear' : 'Bloquear';
    btnBlock.className = `px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-colors ${user.is_blocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-black' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'}`;
    btnBlock.onclick = () => handleBlockUser(user.id, user.is_blocked);

    const btnCertify = document.getElementById('btn-certify');
    btnCertify.onclick = () => requestUserCertification(user.id, user.email);
}

function openCreateMode() {
    activeUserId = null;
    renderUsersList(document.getElementById('search-input').value ? allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(document.getElementById('search-input').value.toLowerCase().trim())) : allUsersData);

    document.getElementById('empty-state').classList.add('hidden');
    const dossier = document.getElementById('active-dossier');
    dossier.classList.remove('hidden');
    dossier.classList.add('flex');

    document.getElementById('d-name').textContent = "Nuevo Atleta";
    document.getElementById('d-name').className = "text-3xl font-black uppercase tracking-tighter text-[#FFC300]";
    document.getElementById('d-email').textContent = "Llenar formulario inferior";
    document.getElementById('d-status').className = "hidden";
    document.getElementById('d-tier').className = "hidden";
    document.getElementById('btn-block').className = "hidden";
    document.getElementById('btn-certify').className = "hidden";

    const form = document.getElementById('user-form');
    form.reset();
    document.getElementById('f-id').value = '';
    document.getElementById('f-is-edit').value = 'false';

    const emailEl = document.getElementById('f-email');
    emailEl.disabled = false;
    emailEl.classList.replace('text-gray-400', 'text-white');

    const passEl = document.getElementById('f-password');
    passEl.disabled = false;
    passEl.required = true;
    passEl.placeholder = "Mínimo 6 caracteres";
    passEl.classList.replace('text-gray-500', 'text-white');

    document.getElementById('f-expires').value = getDefaultExpirationDate();
}

// ==========================================
// 💾 GESTIÓN DEL FORMULARIO PRINCIPAL
// ==========================================
document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('f-submit-btn');
    const isEdit = document.getElementById('f-is-edit').value === 'true';
    const userId = document.getElementById('f-id').value;

    const name = formatToUpperCase(document.getElementById('f-name').value);
    const lastName = formatToUpperCase(document.getElementById('f-lastname').value);
    const fullPhoneNumber = document.getElementById('f-phone-pre').value + '-' + document.getElementById('f-phone-num').value.replace(/\D/g, '');

    const payload = {
        name: name, last_name: lastName, full_name: `${name} ${lastName}`,
        email: document.getElementById('f-email').value, 
        password: document.getElementById('f-password').value,
        phone_number: fullPhoneNumber, 
        sex: document.getElementById('f-sex').value, 
        subscription_level: document.getElementById('f-tier').value,
        subscription_expires_at: document.getElementById('f-expires').value,
        dob: formatDateForBackend(document.getElementById('f-dob').value)
    };
    
    if (isEdit) { delete payload.email; delete payload.password; }

    btn.disabled = true; btn.textContent = "Guardando...";

    const url = isEdit ? `${API_BASE_URL}/api/admin/user/${userId}` : `${API_BASE_URL}/api/admin/user`;
    
    try {
        const response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
            showUIFeedback(`Expediente actualizado exitosamente.`, 'success');
            await fetchAllUsers();
            if (!isEdit) {
                const newU = allUsersData.find(u => u.email === payload.email);
                if (newU) loadUserDossier(newU.id);
            } else {
                loadUserDossier(userId);
            }
        } else {
            showUIFeedback(data.error || "Fallo en la base de datos.", "error");
        }
    } catch (err) { 
        showUIFeedback("Falla de conexión de red.", "error"); 
    }
    btn.disabled = false; btn.textContent = "Guardar Cambios";
});

// ==========================================
// 🛡️ BLOQUEO DE ACCESOS
// ==========================================
async function handleBlockUser(userId, isBlocked) {
    const newState = !isBlocked;
    if (!confirm(`¿Ejecutar orden de ${newState ? 'BLOQUEAR' : 'DESBLOQUEAR'} para este expediente?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/block/${userId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_blocked: newState })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showUIFeedback(`Permisos actualizados.`, 'success');
            await fetchAllUsers();
            loadUserDossier(userId); 
        }
    } catch (err) { showUIFeedback(`Error al procesar el bloqueo.`, 'error'); }
}

// ==========================================
// 🔐 PROTOCOLO DE CERTIFICACIÓN OTP
// ==========================================
async function requestUserCertification(userId, email) {
    if(!confirm(`Se despachará un código OTP de seguridad al correo: ${email}. ¿Desea proceder?`)) return;
    showUIFeedback("Enviando PIN al atleta...", "success");
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${userId}/request-cert`, { method: 'POST' });
        const data = await response.json();
        if(data.success) {
            targetCertifyUserId = userId;
            document.getElementById('otp-input').value = '';
            document.getElementById('new-password-input').value = '';
            document.getElementById('otp-step-1').classList.remove('hidden');
            document.getElementById('otp-step-2').classList.add('hidden');
            const modal = document.getElementById('otp-modal');
            const content = document.getElementById('otp-content');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
        } else { showUIFeedback(data.error, 'error'); }
    } catch (e) { showUIFeedback("Falla de red.", 'error'); }
}

async function verifyUserCode() {
    const code = document.getElementById('otp-input').value.trim();
    if(code.length !== 6) { showUIFeedback("El código debe tener 6 dígitos.", "error"); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/verify-cert`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code })
        });
        const data = await response.json();
        if(data.success) {
            document.getElementById('otp-step-1').classList.add('hidden');
            document.getElementById('otp-step-2').classList.remove('hidden');
        } else { showUIFeedback("Código inválido o expirado.", 'error'); }
    } catch (e) { showUIFeedback("Error verificando.", 'error'); }
}

async function forcePasswordReset() {
    const newPass = document.getElementById('new-password-input').value;
    if(newPass.length < 6) { showUIFeedback("La contraseña debe tener mínimo 6 caracteres.", "error"); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/force-password`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_password: newPass })
        });
        const data = await response.json();
        if(data.success) {
            showUIFeedback("Identidad Verificada y Contraseña forzada con éxito.");
            closeCertifyModal();
        } else { showUIFeedback(data.error, 'error'); }
    } catch (e) { showUIFeedback("Error de red.", 'error'); }
}

function closeCertifyModal() { 
    const modal = document.getElementById('otp-modal');
    const content = document.getElementById('otp-content');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => { modal.classList.remove('flex'); modal.classList.add('hidden'); }, 300);
    targetCertifyUserId = null; 
}

// ==========================================
// 🚀 INICIALIZACIÓN BLINDADA
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // 1. Asignar el filtro numérico solo si el elemento existe en el HTML
    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
        otpInput.addEventListener('input', function() { 
            this.value = this.value.replace(/\D/g, ''); 
        });
    }

    // 2. Arrancar la extracción de datos desde el backend
    fetchAllUsers();
});
