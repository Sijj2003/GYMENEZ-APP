// ==========================================
// 🧠 MICROSERVICIO: OMNI-CORE (IDENTIDAD & UX)
// ==========================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
window.API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Estado Global en RAM
window.allUsersData = [];
window.activeUserId = null;
window.targetCertifyUserId = null;

window.getSecureHeaders = function() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymen_admin_token')}` };
};

window.showUIFeedback = function(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl text-[10px] font-bold shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md w-max max-w-[90vw] ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
};

// ==========================================
// 📱 CONTROL RESPONSIVO (PUSH/POP MÓVIL)
// ==========================================
window.showMobileDossier = function() {
    if (window.innerWidth < 768) {
        document.getElementById('directory-panel').classList.add('hidden');
        document.getElementById('directory-panel').classList.remove('flex');
        document.getElementById('dossier-panel').classList.remove('hidden');
        document.getElementById('dossier-panel').classList.add('flex');
    }
};

window.closeMobileDossier = function() {
    if (window.innerWidth < 768) {
        document.getElementById('dossier-panel').classList.add('hidden');
        document.getElementById('dossier-panel').classList.remove('flex');
        document.getElementById('directory-panel').classList.remove('hidden');
        document.getElementById('directory-panel').classList.add('flex');
    }
    window.activeUserId = null;
    window.renderUsersList(document.getElementById('search-input').value);
};

window.switchDossierTab = function(tabName) {
    ['identity', 'biolab', 'diet'].forEach(t => {
        const btn = document.getElementById(`d-tab-${t}`);
        const content = document.getElementById(`d-content-${t}`);
        if (t === tabName) {
            btn.classList.add('border-[#FFC300]', 'text-[#FFC300]');
            btn.classList.remove('border-transparent', 'text-gray-500');
            content.classList.remove('hidden'); content.classList.add('block');
        } else {
            btn.classList.remove('border-[#FFC300]', 'text-[#FFC300]');
            btn.classList.add('border-transparent', 'text-gray-500');
            content.classList.add('hidden'); content.classList.remove('block');
        }
    });
};

// ==========================================
// 📂 DIRECTORIO DE ATLETAS
// ==========================================
window.fetchAllUsers = async function() {
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/users`, { headers: window.getSecureHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
            window.allUsersData = data.users;
            window.renderUsersList();
        }
    } catch (error) { window.showUIFeedback("Fallo de red al cargar el directorio", "error"); }
};

window.renderUsersList = function(searchTerm = '') {
    const container = document.getElementById('users-list');
    container.innerHTML = ''; 
    const term = searchTerm.toLowerCase().trim();

    const filtered = term ? window.allUsersData.filter(u => (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term)) : window.allUsersData;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-gray-500 font-bold uppercase tracking-widest text-[9px]">Directorio Vacío</div>`;
        return;
    }

    filtered.forEach(user => {
        const item = document.createElement('div');
        const isActive = window.activeUserId === user.id;
        const tier = user.subscription_level || 'BASICO';
        
        let tierColor = 'text-gray-500 border-gray-500/30';
        if(tier === 'PLUS') tierColor = 'text-sky-400 border-sky-500/30';
        if(tier === 'ULTRA') tierColor = 'text-[#FFC300] border-[#FFC300]/30';

        item.className = `p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-1.5 ${isActive ? 'bg-white/5 border-white/20' : 'bg-[#0a0a0f] border-transparent hover:bg-white/5'}`;
        item.onclick = () => window.loadUserDossier(user.id);

        item.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="font-[900] text-xs uppercase tracking-tight truncate ${user.is_blocked ? 'text-red-500 line-through' : 'text-white'}">${user.full_name || 'Atleta'}</span>
                <span class="px-2 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest ${tierColor}">${tier}</span>
            </div>
            <span class="text-[9px] font-mono text-gray-500 truncate">${user.email}</span>
        `;
        container.appendChild(item);
    });
};

document.getElementById('search-input').addEventListener('input', (e) => window.renderUsersList(e.target.value));

window.loadUserDossier = function(userId) {
    window.activeUserId = userId;
    window.renderUsersList(document.getElementById('search-input').value);
    window.showMobileDossier();

    const user = window.allUsersData.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('active-dossier').classList.remove('hidden'); 
    document.getElementById('active-dossier').classList.add('flex');

    document.getElementById('d-name').textContent = user.full_name || 'Atleta';
    document.getElementById('d-name').className = `text-3xl md:text-4xl font-[900] uppercase tracking-tighter text-white leading-none ${user.is_blocked ? 'text-red-500 line-through' : 'text-white'}`;
    document.getElementById('d-email').textContent = user.email || 'N/A';
    
    const statusEl = document.getElementById('d-status');
    statusEl.textContent = user.is_blocked ? 'BLOQUEADO' : 'ACTIVO';
    statusEl.className = `px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest border ${user.is_blocked ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`;
    
    const tier = String(user.subscription_level || 'BASICO').toUpperCase();
    const tierEl = document.getElementById('d-tier');
    tierEl.textContent = tier;
    tierEl.className = `px-2.5 py-1 rounded-md text-[9px] font-[900] uppercase tracking-widest border ${tier === 'ULTRA' ? 'bg-[#FFC300]/10 text-[#FFC300] border-[#FFC300]/20' : (tier === 'PLUS' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20')}`;

    // Cargar form identidad
    document.getElementById('f-id').value = user.id;
    document.getElementById('f-is-edit').value = 'true';
    document.getElementById('f-name').value = user.name || '';
    document.getElementById('f-lastname').value = user.last_name || '';
    document.getElementById('f-email').value = user.email || ''; 
    document.getElementById('f-tier').value = tier;
    if(user.dob) document.getElementById('f-dob').value = user.dob.split('/').reverse().join('-');
    document.getElementById('f-sex').value = user.sex || 'Otro';
    document.getElementById('f-phone-num').value = user.phone_number || '';
    document.getElementById('f-expires').value = user.subscription_expires_at ? String(user.subscription_expires_at).split('T')[0] : '';

    // Botones de acción
    const btnBlock = document.getElementById('btn-block');
    btnBlock.textContent = user.is_blocked ? 'Desbloquear' : 'Bloquear';
    btnBlock.onclick = () => window.handleBlockUser(user.id, user.is_blocked);
    document.getElementById('btn-certify').onclick = () => window.requestUserCertification(user.id, user.email);

    window.switchDossierTab('identity');

    // Avisar a los otros micro-servicios que carguen sus datos
    if (window.loadBiolabData) window.loadBiolabData(user.id);
    if (window.loadDietData) window.loadDietData(user.id, tier);
};

window.openCreateMode = function() {
    window.activeUserId = null;
    window.renderUsersList();
    window.showMobileDossier();

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('active-dossier').classList.remove('hidden'); 
    document.getElementById('active-dossier').classList.add('flex');

    document.getElementById('d-name').textContent = "Nuevo Atleta";
    document.getElementById('d-email').textContent = "Completar ficha técnica";
    document.getElementById('d-status').className = "hidden";
    document.getElementById('d-tier').className = "hidden";

    document.getElementById('user-form').reset();
    document.getElementById('f-id').value = '';
    document.getElementById('f-is-edit').value = 'false';
    document.getElementById('f-email').disabled = false;
    document.getElementById('f-password').disabled = false; 

    const d = new Date(); d.setDate(d.getDate() + 30);
    document.getElementById('f-expires').value = d.toISOString().split('T')[0];

    window.switchDossierTab('identity');
};

// ==========================================
// 🛡️ FORMULARIOS Y SEGURIDAD
// ==========================================
document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEdit = document.getElementById('f-is-edit').value === 'true';
    const userId = document.getElementById('f-id').value;
    const btn = document.getElementById('f-submit-btn');

    const payload = {
        name: document.getElementById('f-name').value.toUpperCase().trim(),
        last_name: document.getElementById('f-lastname').value.toUpperCase().trim(),
        full_name: `${document.getElementById('f-name').value} ${document.getElementById('f-lastname').value}`.toUpperCase().trim(),
        email: document.getElementById('f-email').value, 
        password: document.getElementById('f-password').value,
        phone_number: document.getElementById('f-phone-num').value, 
        sex: document.getElementById('f-sex').value, 
        subscription_level: document.getElementById('f-tier').value,
        subscription_expires_at: document.getElementById('f-expires').value,
        dob: document.getElementById('f-dob').value ? document.getElementById('f-dob').value.split('-').reverse().join('/') : ''
    };
    if (isEdit) { delete payload.email; delete payload.password; }

    btn.disabled = true; btn.textContent = "Sincronizando...";
    try {
        const res = await fetch(isEdit ? `${window.API_BASE_URL}/api/admin/user/${userId}` : `${window.API_BASE_URL}/api/admin/user`, { method: isEdit ? 'PUT' : 'POST', headers: window.getSecureHeaders(), body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok && data.success) { 
            window.showUIFeedback(`Identidad confirmada.`, 'success'); 
            await window.fetchAllUsers(); 
            window.loadUserDossier(isEdit ? userId : window.allUsersData.find(u => u.email === payload.email).id); 
        } else { window.showUIFeedback(data.error, "error"); }
    } catch (err) { window.showUIFeedback("Falla de red.", "error"); }
    btn.disabled = false; btn.textContent = "Actualizar Expediente";
});

window.handleBlockUser = async function(userId, isBlocked) {
    if (!confirm(`¿Confirmas la orden de ${!isBlocked ? 'BLOQUEAR' : 'DESBLOQUEAR'} este perfil?`)) return;
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/user/block/${userId}`, { method: 'PUT', headers: window.getSecureHeaders(), body: JSON.stringify({ is_blocked: !isBlocked }) });
        if ((await res.json()).success) { window.showUIFeedback("Acceso modificado."); await window.fetchAllUsers(); window.loadUserDossier(userId); }
    } catch (e) {}
};

window.requestUserCertification = async function(userId, email) {
    if(!confirm(`Se despachará un OTP de seguridad al correo: ${email}. ¿Proceder?`)) return;
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/user/${userId}/request-cert`, { method: 'POST', headers: window.getSecureHeaders() });
        if((await res.json()).success) {
            window.targetCertifyUserId = userId;
            document.getElementById('otp-step-1').classList.remove('hidden'); document.getElementById('otp-step-2').classList.add('hidden');
            const modal = document.getElementById('otp-modal');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('otp-content').classList.remove('scale-95'); }, 10);
        }
    } catch (e) { window.showUIFeedback("Error enviando OTP.", "error"); }
};

window.verifyUserCode = async function() {
    const code = document.getElementById('otp-input').value.trim();
    if(code.length !== 6) return window.showUIFeedback("Firma de 6 dígitos requerida.", "error");
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/user/${window.targetCertifyUserId}/verify-cert`, { method: 'POST', headers: window.getSecureHeaders(), body: JSON.stringify({ code: code }) });
        if((await res.json()).success) {
            document.getElementById('otp-step-1').classList.add('hidden'); document.getElementById('otp-step-2').classList.remove('hidden');
        } else window.showUIFeedback("Firma inválida.", "error");
    } catch (e) {}
};

window.forcePasswordReset = async function() {
    const newPass = document.getElementById('new-password-input').value;
    if(newPass.length < 6) return;
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/user/${window.targetCertifyUserId}/force-password`, { method: 'PUT', headers: window.getSecureHeaders(), body: JSON.stringify({ new_password: newPass }) });
        if((await res.json()).success) { window.showUIFeedback("Clave sobrescrita."); window.closeCertifyModal(); }
    } catch (e) {}
};

window.closeCertifyModal = function() { 
    document.getElementById('otp-modal').classList.add('opacity-0'); document.getElementById('otp-content').classList.add('scale-95');
    setTimeout(() => { document.getElementById('otp-modal').classList.add('hidden'); document.getElementById('otp-modal').classList.remove('flex'); }, 300);
};

// Arranque
window.addEventListener('DOMContentLoaded', window.fetchAllUsers);
