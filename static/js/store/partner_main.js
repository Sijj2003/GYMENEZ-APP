// ==========================================
// MÓDULO 6: INICIALIZADOR PRINCIPAL Y SINCRONIZACIÓN
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
                        nameDisplay.classList.remove('skeleton-text'); // 🍎 Apaga el efecto de carga
                    }
                    const headerLogoEl = document.getElementById('header-logo');
                    if (headerLogoEl) {
                        headerLogoEl.innerText = decodedToken.store_name.charAt(0).toUpperCase();
                        headerLogoEl.classList.remove('skeleton-text', 'text-gray-500'); // 🍎 Limpia estilos de carga
                        headerLogoEl.classList.add('text-[#FFC300]');
                    }
                }
                if(decodedToken.logo_url) {
                    const headerLogoEl = document.getElementById('header-logo');
                    if(headerLogoEl) {
                        headerLogoEl.innerHTML = `<img src="${decodedToken.logo_url}" class="w-full h-full object-cover">`;
                        headerLogoEl.classList.remove('skeleton-text'); // 🍎 Apaga el efecto de carga
                    }
                }
            }
        }
        
        // =======================================================
        // 🚀 EL MOTOR DE SINCRONIZACIÓN SILENCIOSA (BACKGROUND SYNC)
        // =======================================================
        
        // A) Definimos qué queremos que se actualice en silencio
        const silentSync = () => {
            console.log("🔄 Gymenez Sync: Actualizando datos en segundo plano...");
            
            // Revisa si las funciones existen en la página actual y las dispara
            if (typeof loadMyProducts === 'function') loadMyProducts();
            if (typeof loadMyOrders === 'function') loadMyOrders();
        };

        // B) Disparo inicial (La primera vez que abre la web)
        silentSync();

        // C) El Latido (Heartbeat): Se repite cada 10 minutos exactos
        // 10 minutos * 60 segundos * 1000 milisegundos = 600,000 ms
        setInterval(silentSync, 600000); 
    }
});
