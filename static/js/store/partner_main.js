// ==========================================
// MÓDULO 6: INICIALIZADOR PRINCIPAL
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Validar el Escudo (partner_session.js)
    if (typeof verifyPartnerSession === 'function') verifyPartnerSession();
    
    // 2. Cargar UI Modales (partner_ui.js)
    if (typeof initModals === 'function') initModals();
    
    const token = localStorage.getItem('gymenez_partner_token');
    
    if (token) {
        // 3. Pintar Header con Datos del Token
        if (typeof parseJwt === 'function') {
            const decodedToken = parseJwt(token);
            if (decodedToken) {
                if(decodedToken.store_name) {
                    document.getElementById('store-name-display').innerText = decodedToken.store_name;
                    const headerLogoEl = document.getElementById('header-logo');
                    if (headerLogoEl) headerLogoEl.innerText = decodedToken.store_name.charAt(0).toUpperCase();
                }
                if(decodedToken.logo_url) {
                    const headerLogoEl = document.getElementById('header-logo');
                    if(headerLogoEl) headerLogoEl.innerHTML = `<img src="${decodedToken.logo_url}" class="w-full h-full object-cover">`;
                }
            }
        }
        
        // 4. Disparar Carga de Datos
        if (typeof loadMyProducts === 'function') loadMyProducts();
        if (typeof loadMyOrders === 'function') loadMyOrders();        
    }
});
