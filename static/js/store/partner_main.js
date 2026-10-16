// ==========================================
// MÓDULO 6: INICIALIZADOR PRINCIPAL (OPTIMIZADO CON SMART CACHE)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Validar el Escudo (Seguridad Perimetral)
    if (typeof verifyPartnerSession === 'function') verifyPartnerSession();
    
    // 2. Cargar UI Modales
    if (typeof initModals === 'function') initModals();
    
    const token = localStorage.getItem('gymenez_partner_token');
    
    if (token) {
        // 3. Pintar Header SIN lecturas a base de datos (Usando caché del JWT)
        if (typeof parseJwt === 'function') {
            const decodedToken = parseJwt(token);
            if (decodedToken) {
                if(decodedToken.store_name) {
                    const nameDisplay = document.getElementById('store-name-display');
                    if (nameDisplay) {
                        nameDisplay.innerText = decodedToken.store_name;
                        nameDisplay.classList.remove('skeleton-text');
                    }
                    const headerLogoEl = document.getElementById('header-logo');
                    if (headerLogoEl) {
                        headerLogoEl.innerText = decodedToken.store_name.charAt(0).toUpperCase();
                        headerLogoEl.classList.remove('skeleton-text', 'text-gray-500');
                        headerLogoEl.classList.add('text-[#FFC300]');
                    }
                }
                if(decodedToken.logo_url) {
                    const headerLogoEl = document.getElementById('header-logo');
                    if(headerLogoEl) {
                        headerLogoEl.innerHTML = `<img src="${decodedToken.logo_url}" class="w-full h-full object-cover">`;
                        headerLogoEl.classList.remove('skeleton-text');
                    }
                }
            }
        }
        
        // =======================================================
        // 🚀 INICIALIZACIÓN DE DATOS (VÍA SMART CACHE)
        // =======================================================
        // El Interceptor (partner_cache.js) decidirá si saca estos datos 
        // de la RAM instantáneamente o si va al servidor.
        
        if (typeof loadMyProducts === 'function') loadMyProducts();
        if (typeof loadPartnerOrders === 'function') loadPartnerOrders(); // Ajustado al nombre real en orders.html
        if (typeof loadFinanceData === 'function') loadFinanceData();
        if (typeof loadBusinessData === 'function') loadBusinessData();
        
        // 🎉 ELIMINADO: setInterval() y silentSync(). La consola ahora estará limpia.
    }
});
