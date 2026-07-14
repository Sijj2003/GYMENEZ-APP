const API_URL = 'https://sijj2003.pythonanywhere.com/api/partner';

// =====================================
// LÓGICA DE INTERFAZ & ANIMACIONES
// =====================================
function toggleForms(target) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (target === 'register') {
        loginForm.classList.remove('active-form');
        loginForm.classList.add('hidden-form');
        registerForm.classList.remove('hidden-form');
        registerForm.classList.add('active-form');
    } else {
        registerForm.classList.remove('active-form');
        registerForm.classList.add('hidden-form');
        loginForm.classList.remove('hidden-form');
        loginForm.classList.add('active-form');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgObj = document.getElementById('toast-msg');
    const iconObj = document.getElementById('toast-icon');

    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] glass-panel px-6 py-3 rounded-full border flex items-center gap-3 show';
    
    if (type === 'success') {
        toast.classList.add('border-green-500/30', 'bg-green-500/10', 'text-green-400');
        iconObj.innerHTML = '✓';
    } else {
        toast.classList.add('border-red-500/30', 'bg-red-500/10', 'text-red-400');
        iconObj.innerHTML = '⚠';
    }

    msgObj.innerText = message;

    setTimeout(() => {
        toast.classList.remove('show', 'border-green-500/30', 'bg-green-500/10', 'text-green-400', 'border-red-500/30', 'bg-red-500/10', 'text-red-400');
    }, 5000);
}

// =====================================
// API CALLS: LOGIN (Manejo de JSON)
// =====================================
document.getElementById('form-login-action').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="animate-pulse">Verificando...</span>';
    btn.disabled = true;

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast(`Bienvenido de vuelta, ${data.store_name}`, 'success');
            localStorage.setItem('gymenez_partner_token', data.token);
            setTimeout(() => { window.location.href = '/store/partner/dashboard.html'; }, 1500);
        } else {
            showToast(data.error || 'Credenciales inválidas', 'error');
        }
    } catch (error) {
        showToast('Error de red. Verifica tu conexión.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// =====================================
// API CALLS: REGISTRO KYC (FormData)
// =====================================
document.getElementById('form-register-action').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-register');
    const originalText = btn.innerText;
    btn.innerText = 'Subiendo documentos KYC...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('storeName', document.getElementById('reg-storeName').value);
    formData.append('docType', document.getElementById('reg-docType').value);
    formData.append('docNumber', document.getElementById('reg-docNumber').value);
    formData.append('email', document.getElementById('reg-email').value);
    formData.append('phone', document.getElementById('reg-phone').value);
    formData.append('password', document.getElementById('reg-password').value);

    // Adjuntar los archivos físicos
    const cedula = document.getElementById('reg-cedula').files[0];
    const rif = document.getElementById('reg-rif').files[0];
    const logo = document.getElementById('reg-logo').files[0];

    if (cedula) formData.append('cedula', cedula);
    if (rif) formData.append('rif', rif);
    if (logo) formData.append('logo', logo);

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            body: formData // El navegador asigna el Content-Type multipart/form-data automáticamente
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('¡Documentos enviados a auditoría exitosamente!', 'success');
            e.target.reset();
            setTimeout(() => { toggleForms('login'); }, 4000);
        } else {
            showToast(data.error || 'Error en el registro', 'error');
        }
    } catch (error) {
        showToast('Error de red al subir los documentos.', 'error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});
