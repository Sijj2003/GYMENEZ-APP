// ==========================================
// CONFIGURACIÓN DE SEGURIDAD (SSO & SHIELD)
// ==========================================
const TOKEN_KEY = 'gymen_auth_token';

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARGA INSTANTÁNEA: Leer identidad desde la caché del SSO
    const sessionString = localStorage.getItem('userSession');
    if (sessionString) {
        try {
            const sessionUser = JSON.parse(sessionString);
            if (sessionUser.name) {
                // Formateamos el nombre para que se vea elegante (Ej: "ROBERTO" -> "Roberto")
                const rawName = sessionUser.name.trim();
                const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                
                document.getElementById('user-greeting').innerText = formattedName;
                document.getElementById('avatar-initials').innerText = rawName.charAt(0).toUpperCase();
            }
        } catch (e) {
            console.warn("No se pudo parsear la sesión local.");
        }
    }

    // 2. Conectar al backend para la data logística y legal
    loadBuyerProfile();
});

// ==========================================
// LÓGICA DE NAVEGACIÓN (PESTAÑAS SPA)
// ==========================================
function switchTab(tabId, btnElement) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Quitar estado activo a todos los botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar el contenido y botón seleccionado
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btnElement.classList.add('active');
}

// ==========================================
// CARGA Y VERIFICACIÓN CON BACKEND
// ==========================================
async function loadBuyerProfile() {
    const token = localStorage.getItem(TOKEN_KEY);
    const deviceId = localStorage.getItem('gymen_device_id') || ''; 
    
    if (!token) return; 

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/athlete/profile', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            const p = data.profile;
            
            // 1. Llenar Identidad Legal (KYC Inteligente)
            if (p.kyc_cedula_url) {
                // Ya está verificado: Ocultamos formulario, mostramos la tarjeta
                document.getElementById('kyc-form-container').classList.add('hidden');
                document.getElementById('kyc-readonly-container').classList.remove('hidden');
                
                // CRÍTICO: Evita que el navegador bloquee el envío por un campo oculto
                document.getElementById('doc-number').removeAttribute('required');

                // Cambiar etiqueta visual a VERIFICADO
                const badge = document.getElementById('kyc-status-badge');
                badge.innerText = "Verificado";
                badge.className = "text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full";

                // Extraemos el nombre completo original de la base de datos de fitness
                const fullName = p.full_name || p.name || 'Atleta Autorizado';
                document.getElementById('readonly-fullname').innerText = fullName;
                document.getElementById('readonly-doc').innerText = `${p.doc_type || 'V'}-${p.doc_number || ''}`;
                document.getElementById('readonly-doc-btn').href = p.kyc_cedula_url;
            } else {
                // Es nuevo: Dejamos el formulario visible y pre-llenamos si hay datos básicos
                if (p.doc_type) document.getElementById('doc-type').value = p.doc_type;
                if (p.doc_number) document.getElementById('doc-number').value = p.doc_number;
            }

            // 2. Llenar formulario de Logística (Siempre editable)
            if (p.shipping_state) document.getElementById('ship-state').value = p.shipping_state;
            if (p.shipping_municipality) document.getElementById('ship-municipality').value = p.shipping_municipality;
            if (p.shipping_city) document.getElementById('ship-city').value = p.shipping_city;
            if (p.preferred_courier) document.getElementById('ship-courier').value = p.preferred_courier;
        }
    } catch (error) {
        console.error("Error cargando el perfil:", error);
    }
}

// ==========================================
// GUARDAR FORMULARIO (ACTUALIZAR PERFIL)
// ==========================================
document.getElementById('buyer-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const msg = document.getElementById('form-msg');
    const originalText = btn.innerText;
    
    btn.innerText = "ACTUALIZANDO...";
    btn.disabled = true;
    msg.classList.add('hidden');

    const token = localStorage.getItem(TOKEN_KEY);
    const deviceId = localStorage.getItem('gymen_device_id') || ''; 
    const formData = new FormData();
    
    formData.append('docType', document.getElementById('doc-type').value);
    formData.append('docNumber', document.getElementById('doc-number').value);
    formData.append('state', document.getElementById('ship-state').value);
    formData.append('municipality', document.getElementById('ship-municipality').value);
    formData.append('city', document.getElementById('ship-city').value);
    formData.append('courier', document.getElementById('ship-courier').value);

    // Solo anexamos archivo si el usuario subió uno (solo visible para nuevos)
    const imageFile = document.getElementById('cedula-upload').files[0];
    if (imageFile) {
        formData.append('cedula_image', imageFile);
    }

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/athlete/profile', {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            msg.innerText = "¡Preferencias Guardadas con Éxito!";
            msg.className = "text-center text-xs font-bold uppercase tracking-widest mt-4 text-green-400";
            msg.classList.remove('hidden');
        } else {
            msg.innerText = data.error || "Error al actualizar perfil.";
            msg.className = "text-center text-xs font-bold uppercase tracking-widest mt-4 text-red-500";
            msg.classList.remove('hidden');
        }
    } catch (error) {
        msg.innerText = "Error de red al conectar con el servidor.";
        msg.className = "text-center text-xs font-bold uppercase tracking-widest mt-4 text-red-500";
        msg.classList.remove('hidden');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});
