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

    // 2. Cargar datos pesados (Logística) en segundo plano
    loadBuyerProfile();
});

// ==========================================
// LÓGICA DE NAVEGACIÓN (PESTAÑAS)
// ==========================================
function switchTab(tabId, btnElement) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Quitar color a todos los botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar el seleccionado
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btnElement.classList.add('active');
}

// ==========================================
// CARGA Y CONEXIÓN CON BACKEND
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
            
            // Llenar datos de saludo visual
            if (p.name) {
                document.getElementById('user-greeting').innerText = p.name;
                document.getElementById('avatar-initials').innerText = p.name.charAt(0);
            }

            // Llenar formulario de Logística
            if (p.doc_type) document.getElementById('doc-type').value = p.doc_type;
            if (p.doc_number) document.getElementById('doc-number').value = p.doc_number;
            if (p.shipping_state) document.getElementById('ship-state').value = p.shipping_state;
            if (p.shipping_municipality) document.getElementById('ship-municipality').value = p.shipping_municipality;
            if (p.shipping_city) document.getElementById('ship-city').value = p.shipping_city;
            if (p.preferred_courier) document.getElementById('ship-courier').value = p.preferred_courier;
            
            if (p.kyc_cedula_url) {
                const display = document.getElementById('file-name-display');
                display.innerText = "Cédula verificada (Toca para actualizar)";
                display.classList.add('text-green-400');
            }
        }
    } catch (error) {
        console.error("Error cargando el perfil", error);
    }
}

// ==========================================
// GUARDAR FORMULARIO DE LOGÍSTICA
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
