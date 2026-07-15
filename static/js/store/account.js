// ==========================================
// CONFIGURACIÓN DE SEGURIDAD (SSO & SHIELD)
// ==========================================
const TOKEN_KEY = 'gymen_auth_token';

document.addEventListener('DOMContentLoaded', loadBuyerProfile);

async function loadBuyerProfile() {
    const token = localStorage.getItem(TOKEN_KEY);
    const deviceId = localStorage.getItem('gymen_device_id') || ''; // Huella del SHIELD
    
    if (!token) return; 

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/athlete/profile', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId,  // Enviamos la huella al shield
                'Device-ID': deviceId     // (Por si tu backend usa este nombre)
            }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            const p = data.profile;
            if (p.doc_type) document.getElementById('doc-type').value = p.doc_type;
            if (p.doc_number) document.getElementById('doc-number').value = p.doc_number;
            if (p.shipping_state) document.getElementById('ship-state').value = p.shipping_state;
            if (p.shipping_municipality) document.getElementById('ship-municipality').value = p.shipping_municipality;
            if (p.shipping_city) document.getElementById('ship-city').value = p.shipping_city;
            if (p.preferred_courier) document.getElementById('ship-courier').value = p.preferred_courier;
            
            if (p.kyc_cedula_url) {
                const display = document.getElementById('file-name-display');
                display.innerText = "Cédula subida previamente (Toca para cambiar)";
                display.classList.add('text-green-400');
            }
        }
    } catch (error) {
        console.error("Error cargando el perfil", error);
    }
}

document.getElementById('buyer-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const msg = document.getElementById('form-msg');
    const originalText = btn.innerText;
    
    btn.innerText = "Sincronizando con Ecosistema...";
    btn.disabled = true;
    msg.classList.add('hidden');

    const token = localStorage.getItem(TOKEN_KEY);
    const deviceId = localStorage.getItem('gymen_device_id') || ''; // Huella del SHIELD
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
                'X-Device-ID': deviceId,
                'Device-ID': deviceId
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            msg.innerText = "¡Perfil configurado! Ya puedes hacer compras.";
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
