const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allUsersData = [];
let targetCertifyUserId = null; // Memoria temporal para el protocolo OTP

// ==========================================
// UTILIDADES Y FORMATOS
// ==========================================
function formatToUpperCase(inputString) { return inputString ? inputString.toUpperCase().trim() : ''; }

function formatDateForBackend(dateValue) {
    if (!dateValue) return '';
    const parts = dateValue.split('-'); 
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateValue;
}

// Calcula fecha actual + 30 días en formato YYYY-MM-DD
function getDefaultExpirationDate() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
}

// Manejo de UI
function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return alert(message);
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

function toggleModal(show, modalId = 'user-modal') {
    const modal = document.getElementById(modalId);
    const content = modal.querySelector('.modal-content');
    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
    } else {
        modal.classList.add('opacity-0'); content.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// ==========================================
// RENDERIZADO DE TABLA
// ==========================================
async function fetchAllUsers() {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-[#FFC300] font-black uppercase tracking-widest text-[10px]">Descifrando base de datos...</td></tr>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            allUsersData = data.users; 
            filterUsersTable(document.getElementById('user-search-input').value);
        } else throw new Error(data.error);
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 font-bold text-xs uppercase tracking-widest">Falla de Conexión Core</td></tr>`;
    }
}

function renderUsersTable(users) {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = ''; 

    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500 font-bold uppercase tracking-widest text-[10px]">No se detectaron expedientes.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const row = tableBody.insertRow();
        
        row.insertCell().textContent = user.full_name || 'N/A';
        row.insertCell().textContent = user.email || 'N/A';
        row.insertCell().textContent = user.phone_number || 'N/A';
        
        const subCell = row.insertCell();
        const subLvl = user.subscription_level || 'BASICO';
        subCell.innerHTML = `<span class="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-widest ${subLvl === 'ULTRA' || subLvl === 'PLUS' ? 'text-[#FFC300]' : 'text-gray-400'}">${subLvl}</span>`;

        // Columna Vencimiento
        const expDate = user.subscription_expires_at ? String(user.subscription_expires_at).split('T')[0] : 'Indefinido';
        row.insertCell().innerHTML = `<span class="text-[10px] font-mono font-bold ${expDate === 'Indefinido' ? 'text-gray-600' : 'text-red-400'}">${expDate}</span>`;

        // Acciones
        const actionsCell = row.insertCell();
        actionsCell.className = "text-right space-x-2";
        const isBlocked = user.is_blocked === true;
        
        actionsCell.innerHTML = `
            <button onclick="requestUserCertification('${user.id}', '${user.email}')" class="px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[8px] font-black uppercase tracking-widest hover:bg-sky-500 hover:text-white transition">Certificar</button>
            <button onclick="handleBlockUser('${user.id}', ${isBlocked})" class="px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition ${isBlocked ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-red-600/10 border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white'}">
                ${isBlocked ? 'Desbloquear' : 'Bloquear'}
            </button>
            <button onclick='openModalForEdit(${JSON.stringify(user)})' class="px-3 py-1.5 rounded-lg border border-[#FFC300]/30 bg-[#FFC300]/10 text-[#FFC300] text-[8px] font-black uppercase tracking-widest hover:bg-[#FFC300] hover:text-black transition">Editar</button>
        `;
    });
}

function filterUsersTable(searchTerm) {
    const normalized = searchTerm.toLowerCase().trim();
    if (!normalized) return renderUsersTable(allUsersData);
    const filtered = allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(normalized) || (u.email || '').toLowerCase().includes(normalized));
    renderUsersTable(filtered);
}

// ==========================================
// MODAL (CREATE / UPDATE)
// ==========================================
function openModalForCreate() {
    const form = document.getElementById('user-form');
    form.reset(); 
    document.getElementById('modal-title').textContent = 'Inyectar Nuevo Usuario';
    document.getElementById('user-id-field').value = '';
    document.getElementById('is-edit-mode').value = 'false';
    
    document.getElementById('email').removeAttribute('disabled');
    document.getElementById('password').required = true;
    document.getElementById('password-req').classList.remove('hidden');
    document.getElementById('password').placeholder = 'Mínimo 6 caracteres';
    
    // Lógica +30 días por defecto
    document.getElementById('subscription_expires_at').value = getDefaultExpirationDate();
    
    toggleModal(true);
}

function openModalForEdit(user) {
    const form = document.getElementById('user-form');
    form.reset(); 
    
    document.getElementById('modal-title').textContent = `Editar Expediente`;
    document.getElementById('user-id-field').value = user.id;
    document.getElementById('is-edit-mode').value = 'true';

    document.getElementById('email').value = user.email || '';
    document.getElementById('email').setAttribute('disabled', 'true');
    document.getElementById('password').required = false;
    document.getElementById('password-req').classList.add('hidden');
    document.getElementById('password').placeholder = 'Bloqueado. Use Certificación para cambiar.';
    document.getElementById('password').setAttribute('disabled', 'true'); // Solo se cambia vía OTP ahora

    document.getElementById('name').value = user.name || '';
    document.getElementById('last_name').value = user.last_name || '';
    document.getElementById('sex').value = user.sex || 'Otro';
    document.getElementById('subscription_level').value = user.subscription_level || 'BASICO';
    
    // Cargar fecha de expiración o calcularla si no tiene
    if(user.subscription_expires_at) {
        document.getElementById('subscription_expires_at').value = user.subscription_expires_at.split('T')[0];
    } else {
        document.getElementById('subscription_expires_at').value = getDefaultExpirationDate();
    }

    if (user.phone_number && user.phone_number.includes('-')) {
        const [prefix, number] = user.phone_number.split('-');
        document.getElementById('phone_prefix').value = prefix || '0414';
        document.getElementById('phone_number_body').value = number || '';
    }

    if(user.dob) document.getElementById('dob').value = user.dob.split('/').reverse().join('-');
    toggleModal(true);
}

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const isEdit = document.getElementById('is-edit-mode').value === 'true';
    const userId = document.getElementById('user-id-field').value;

    const name = formatToUpperCase(form.name.value);
    const lastName = formatToUpperCase(form.last_name.value);
    const fullPhoneNumber = form.phone_prefix.value + '-' + form.phone_number_body.value.replace(/\D/g, '');

    const payload = {
        name: name, last_name: lastName, full_name: `${name} ${lastName}`,
        email: form.email.value, password: form.password.value,
        phone_number: fullPhoneNumber, sex: form.sex.value, 
        subscription_level: form.subscription_level.value,
        subscription_expires_at: form.subscription_expires_at.value,
        dob: formatDateForBackend(form.dob.value)
    };
    
    if (isEdit) { delete payload.email; delete payload.password; }

    const url = isEdit ? `${API_BASE_URL}/api/admin/user/${userId}` : `${API_BASE_URL}/api/admin/user`;
    
    try {
        const response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok && data.success) {
            toggleModal(false);
            showUIFeedback(`Operación exitosa en ${name}.`);
            fetchAllUsers();
        } else alert(`Error: ${data.error}`);
    } catch (err) { alert(`Falla de conexión.`); }
});

// ==========================================
// PROTOCOLO DE CERTIFICACIÓN OTP (Alta Seguridad)
// ==========================================
async function requestUserCertification(userId, email) {
    if(!confirm(`Se enviará un código OTP de seguridad al correo: ${email}. ¿Desea proceder?`)) return;
    
    showUIFeedback("Despachando código al atleta...", "success");
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${userId}/request-cert`, { method: 'POST' });
        const data = await response.json();
        if(data.success) {
            targetCertifyUserId = userId;
            document.getElementById('otp-input').value = '';
            document.getElementById('new-password-input').value = '';
            document.getElementById('certify-step-1').classList.remove('hidden');
            document.getElementById('certify-step-2').classList.add('hidden');
            toggleModal(true, 'certify-modal');
        } else { showUIFeedback(data.error, 'error'); }
    } catch (e) { showUIFeedback("Error de red conectando al servidor", 'error'); }
}

async function verifyUserCode() {
    const code = document.getElementById('otp-input').value.trim();
    if(code.length !== 6) return alert("El código debe tener 6 dígitos.");
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/verify-cert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        });
        const data = await response.json();
        if(data.success) {
            document.getElementById('certify-step-1').classList.add('hidden');
            document.getElementById('certify-step-2').classList.remove('hidden');
        } else { showUIFeedback("Código inválido o expirado.", 'error'); }
    } catch (e) { showUIFeedback("Error verificando código.", 'error'); }
}

async function forcePasswordReset() {
    const newPass = document.getElementById('new-password-input').value;
    if(newPass.length < 6) return alert("La contraseña debe ser de al menos 6 caracteres.");
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/user/${targetCertifyUserId}/force-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_password: newPass })
        });
        const data = await response.json();
        if(data.success) {
            showUIFeedback("Identidad Verificada y Contraseña actualizada.");
            closeCertifyModal();
        } else { showUIFeedback(data.error, 'error'); }
    } catch (e) { showUIFeedback("Error al forzar actualización.", 'error'); }
}

function closeCertifyModal() { toggleModal(false, 'certify-modal'); targetCertifyUserId = null; }

// ==========================================
// BLOQUEO DE ACCESOS
// ==========================================
async function handleBlockUser(userId, isBlocked) {
    const newState = !isBlocked;
    if (!confirm(`¿Ejecutar orden de ${newState ? 'BLOQUEAR' : 'DESBLOQUEAR'} para este expediente?`)) return;
    try {
        await fetch(`${API_BASE_URL}/api/admin/user/block/${userId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_blocked: newState })
        });
        fetchAllUsers(); 
    } catch (err) { alert(`Error al procesar el bloqueo.`); }
}

window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    document.getElementById('user-search-input').addEventListener('input', (e) => filterUsersTable(e.target.value));
    document.getElementById('add-user-btn').addEventListener('click', openModalForCreate);
    document.getElementById('close-modal-btn').addEventListener('click', () => toggleModal(false));
    document.getElementById('cancel-modal-btn').addEventListener('click', () => toggleModal(false));
    fetchAllUsers();
});
