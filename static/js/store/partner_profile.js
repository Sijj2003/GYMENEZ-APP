// ==========================================
// MÓDULO 3: PERFIL DE LA TIENDA
// ==========================================

let profileModal, profileModalInner;

async function openProfileModal() {
    profileModal = document.getElementById('profile-modal');
    profileModalInner = profileModal ? profileModal.querySelector('div') : null;
    if (!profileModal) return;

    profileModal.classList.remove('hidden');
    setTimeout(() => {
        profileModal.classList.remove('opacity-0');
        profileModalInner.classList.remove('scale-95');
        profileModalInner.classList.add('scale-100');
    }, 10);

    try {
        const token = localStorage.getItem('gymenez_partner_token');
        const res = await fetch('https://sijj2003.pythonanywhere.com/api/partner/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (res.ok && data.success) {
            const p = data.profile;
            document.getElementById('prof-name').value = p.store_name || 'No definido';
            document.getElementById('prof-doc').value = `${p.doc_type || 'V'}-${p.doc_number || ''}`;
            document.getElementById('prof-phone').value = p.phone || 'No definido';
            document.getElementById('prof-email').value = p.email || 'No definido';

            const logoEl = document.getElementById('modal-profile-logo');
            if (p.logo_url) {
                logoEl.innerHTML = `<img src="${p.logo_url}" class="w-full h-full object-cover">`;
            } else {
                logoEl.innerHTML = p.store_name ? p.store_name.charAt(0).toUpperCase() : 'P';
            }
        }
    } catch (error) {
        console.error('Error cargando perfil:', error);
    }
}

function closeProfileModal() {
    if (!profileModal) return;
    profileModal.classList.add('opacity-0');
    profileModalInner.classList.remove('scale-100');
    profileModalInner.classList.add('scale-95');
    setTimeout(() => { profileModal.classList.add('hidden'); }, 300);
}

async function uploadNewLogo(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { 
        alert("La imagen es demasiado pesada (Máximo 2MB).");
        return;
    }

    const logoEl = document.getElementById('modal-profile-logo');
    const headerLogoEl = document.getElementById('header-logo');
    logoEl.innerHTML = `<span class="animate-pulse text-[9px] uppercase tracking-widest text-white">Subiendo...</span>`;

    const token = localStorage.getItem('gymenez_partner_token');
    const formData = new FormData();
    formData.append('logo', file);

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/partner/profile/logo', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('gymenez_partner_token', data.token);
            logoEl.innerHTML = `<img src="${data.logo_url}" class="w-full h-full object-cover">`;
            if (headerLogoEl) headerLogoEl.innerHTML = `<img src="${data.logo_url}" class="w-full h-full object-cover">`;
            alert("¡Foto de perfil actualizada exitosamente!");
        } else {
            alert(data.error || "Error al actualizar la foto.");
            openProfileModal(); 
        }
    } catch (error) {
        alert("Error de conexión al subir la imagen.");
        openProfileModal();
    } finally {
        input.value = ''; 
    }
}
