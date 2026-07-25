const API_URL = 'https://sijj2003.pythonanywhere.com/api/partner';

// =====================================
// LÓGICA DE INTERFAZ & ANIMACIONES
// =====================================
function toggleForms(target) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (target === 'register') {
        // Ocultar Login
        loginForm.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            loginForm.classList.add('hidden');
            // Mostrar Register
            registerForm.classList.remove('hidden');
            // Pequeño delay para que aplique el display:block antes de la opacidad
            setTimeout(() => {
                registerForm.classList.remove('opacity-0');
            }, 50);
        }, 300);
    } else {
        // Ocultar Register
        registerForm.classList.add('opacity-0');
        setTimeout(() => {
            registerForm.classList.add('hidden');
            // Mostrar Login
            loginForm.classList.remove('hidden');
            setTimeout(() => {
                loginForm.classList.remove('opacity-0', 'scale-95');
            }, 50);
        }, 300);
    }
}

// Función para actualizar los labels visuales de los archivos subidos (Cédula, RIF, Logo)
function updateFileLabel(input, labelId) {
    const label = document.getElementById(labelId);
    if (input.files && input.files[0]) {
        label.innerText = input.files[0].name;
        // Cambiamos el color para indicar éxito
        if(labelId === 'label-logo') {
            label.classList.remove('text-gray-500');
            label.classList.add('text-[#FFC300]');
        } else {
            label.classList.remove('text-gray-500');
            label.classList.add('text-emerald-400');
        }
    } else {
        label.innerText = 'Tocar para subir...';
        label.className = 'text-xs text-gray-500 transition truncate w-40'; // Reset clases
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgObj = document.getElementById('toast-msg');
    const iconObj = document.getElementById('toast-icon');

    // Reseteamos estilos
    toast.className = 'transform opacity-0 -translate-y-10 transition-all duration-500 ease-out bg-white/95 backdrop-blur-xl text-black px-6 py-3.5 rounded-full font-bold text-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center gap-3 border border-black/5';
    
    if (type === 'success') {
        iconObj.innerHTML = '<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
    } else {
        iconObj.innerHTML = '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    }

    msgObj.innerText = message;

    // Mostrar (Baja y se hace visible)
    setTimeout(() => {
        toast.classList.remove('opacity-0', '-translate-y-10');
        toast.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    // Ocultar después de 4 segundos
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-10');
    }, 4000);
}

// =====================================
// API CALLS: LOGIN (Manejo de JSON)
// =====================================
document.getElementById('form-login-action').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>';
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
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    } catch (error) {
        showToast('Error de red. Verifica tu conexión.', 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
});

// =====================================
// API CALLS: REGISTRO KYC (FormData)
// =====================================
document.getElementById('form-register-action').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-register');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div><span class="ml-2">Subiendo documentos...</span>';
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
            // Resetear labels de archivos
            document.getElementById('label-cedula').innerText = 'Tocar para subir...';
            document.getElementById('label-rif').innerText = 'Tocar para subir...';
            document.getElementById('label-logo').innerText = 'Tocar para subir...';
            
            setTimeout(() => { toggleForms('login'); }, 3000);
        } else {
            showToast(data.error || 'Error en el registro', 'error');
        }
    } catch (error) {
        showToast('Error de red al subir los documentos.', 'error');
    } finally {
        if(btn.disabled) { // Solo resetea si no fue exitoso (si fue exitoso se cambió de vista)
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
});
