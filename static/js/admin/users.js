const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allUsersData = [];

// ==========================================
// UTILIDADES Y FORMATOS
// ==========================================
function formatToUpperCase(inputString) { return inputString ? inputString.toUpperCase().trim() : ''; }

function formatIdNumber(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    let formatted = '';
    let count = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
        formatted = digits[i] + formatted;
        count++;
        if (count % 3 === 0 && i !== 0) formatted = '.' + formatted;
    }
    return formatted;
}

function formatDateForBackend(dateValue) {
    if (!dateValue) return '';
    const parts = dateValue.split('-'); 
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateValue;
}

// Interfaz Modal Fluida
function toggleModal(show) {
    const modal = document.getElementById('user-modal');
    const content = modal.querySelector('.modal-content');
    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
        }, 10);
    } else {
        modal.classList.add('opacity-0');
        content.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// ==========================================
// RENDERIZADO DE TABLA (READ)
// ==========================================
async function fetchAllUsers() {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-[#FFC300] font-black uppercase tracking-widest text-[10px]">Descifrando base de datos...</td></tr>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            allUsersData = data.users; 
            filterUsersTable(document.getElementById('user-search-input').value);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500 font-bold text-xs uppercase tracking-widest">Falla de Conexión Core</td></tr>`;
    }
}

function renderUsersTable(users) {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = ''; 

    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500 font-bold uppercase tracking-widest text-[10px]">No se detectaron expedientes.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const row = tableBody.insertRow();
        
        row.insertCell().textContent = user.full_name || 'N/A';
        row.insertCell().textContent = user.email || 'N/A';
        row.insertCell().textContent = user.id_number || 'N/A'; 
        row.insertCell().textContent = user.phone_number || 'N/A';
        
        // Estilo Premium para Suscripción
        const subCell = row.insertCell();
        const subLvl = user.subscription_level || 'BASICO';
        subCell.innerHTML = `<span class="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-widest ${subLvl === 'ULTRA' || subLvl === 'PLUS' ? 'text-[#FFC300]' : 'text-gray-400'}">${subLvl}</span>`;

        row.insertCell().innerHTML = `<span class="text-[10px] font-mono text-gray-500">${String(user.activo_desde).split('T')[0] || 'N/A'}</span>`;

        // Acciones
        const actionsCell = row.insertCell();
        const isBlocked = user.is_blocked === true;
        
        actionsCell.innerHTML = `
            <div class="flex items-center gap-3">
                <button onclick="handleBlockUser('${user.id}', ${isBlocked})" class="px-3 py-1 rounded border text-[9px] font-black uppercase tracking-widest transition-all ${isBlocked ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-red-600/10 border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white'}">
                    ${isBlocked ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button onclick='openModalForEdit(${JSON.stringify(user)})' class="text-[10px] font-black uppercase tracking-widest text-[#FFC300] hover:text-white transition">Editar</button>
                <button onclick="deleteUser('${user.id}', '${user.full_name}')" class="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition">Purgar</button>
            </div>
        `;
    });
}

function filterUsersTable(searchTerm) {
    const normalized = searchTerm.toLowerCase().trim();
    if (!normalized) return renderUsersTable(allUsersData);

    const filtered = allUsersData.filter(user => {
        return (user.full_name || '').toLowerCase().includes(normalized) || 
               (user.email || '').toLowerCase().includes(normalized) || 
               (user.id_number || '').toLowerCase().includes(normalized);
    });
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
    document.getElementById('password').placeholder = 'Dejar vacío para no cambiar';

    document.getElementById('name').value = user.name || '';
    document.getElementById('last_name').value = user.last_name || '';
    document.getElementById('sex').value = user.sex || 'Otro';
    document.getElementById('subscription_level').value = user.subscription_level || 'BASICO';

    // Desglose de Cédula y Teléfono
    if (user.id_number && user.id_number.includes('-')) {
        const [prefix, number] = user.id_number.split('-');
        document.getElementById('id_number_prefix').value = prefix || 'V';
        document.getElementById('id_number').value = formatIdNumber(number || ''); 
    } else {
        document.getElementById('id_number').value = formatIdNumber(user.id_number || '');
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
    const fullIdNumber = form.id_number_prefix.value + '-' + formatIdNumber(form.id_number.value); 
    const fullPhoneNumber = form.phone_prefix.value + '-' + form.phone_number_body.value.replace(/\D/g, '');

    const payload = {
        name: name, last_name: lastName, full_name: `${name} ${lastName}`,
        email: form.email.value, password: form.password.value,
        id_number: fullIdNumber, phone_number: fullPhoneNumber,
        sex: form.sex.value, subscription_level: form.subscription_level.value,
        dob: formatDateForBackend(form.dob.value)
    };
    
    if (isEdit) { delete payload.email; if(!payload.password) delete payload.password; }

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
            fetchAllUsers();
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (err) { alert(`Falla de conexión.`); }
});

// ==========================================
// ACCIONES RÁPIDAS (DELETE / BLOCK)
// ==========================================
async function deleteUser(userId, fullName) {
    if (!confirm(`⚠️ ALERTA: ¿Purgar permanentemente a ${fullName} del ecosistema?`)) return;

    try {
        await fetch(`${API_BASE_URL}/api/admin/user/${userId}`, { method: 'DELETE' });
        fetchAllUsers();
    } catch (err) { alert(`Error de red al eliminar.`); }
}

async function handleBlockUser(userId, isBlocked) {
    const newState = !isBlocked;
    const action = newState ? 'BLOQUEAR' : 'DESBLOQUEAR';
    
    if (!confirm(`¿Ejecutar orden de ${action} para este expediente?`)) return;

    try {
        await fetch(`${API_BASE_URL}/api/admin/user/block/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_blocked: newState })
        });
        fetchAllUsers(); 
    } catch (err) { alert(`Error al procesar el bloqueo.`); }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    
    // Autocorrección del formato de cédula al escribir
    document.getElementById('id_number').addEventListener('input', function() {
        this.value = formatIdNumber(this.value);
    });

    document.getElementById('user-search-input').addEventListener('input', (e) => filterUsersTable(e.target.value));
    document.getElementById('add-user-btn').addEventListener('click', openModalForCreate);
    document.getElementById('close-modal-btn').addEventListener('click', () => toggleModal(false));
    document.getElementById('cancel-modal-btn').addEventListener('click', () => toggleModal(false));

    fetchAllUsers();
});
