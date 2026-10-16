/**
 * ====================================================================
 * 🧠 GYMENEZ SMART CACHE MANAGER (Zero-Trust Data Layer)
 * ====================================================================
 * Motor de caché en RAM (sessionStorage). 
 * Protege la base de datos de consultas redundantes y volatiliza
 * la información confidencial al cerrar la pestaña del navegador.
 */

const GymenezCache = {
    // Tiempos de vida (TTL) base en minutos
    TTL: {
        profile: 1440,    // 24 horas (Prácticamente permanente en la sesión activa)
        business: 1440,   // 24 horas (Cambios en contratos son raros)
        catalog: 1440,    // 24 horas (Sincronización por eventos: solo se borra si editan/crean)
        orders: 30,       // 30 minutos (Equilibrio de recursos)
        dashboard: 30     // 30 minutos (Espejo de órdenes y finanzas)
    },

    // ⏱️ Motor Lógico Financiero: Sincronización acelerada en días de corte
    getFinanceTTL: function() {
        const today = new Date().getDay(); 
        // JavaScript Date: 0 = Domingo, 4 = Jueves, 5 = Viernes
        if (today === 4 || today === 5) {
            return 60; // 1 hora de vigencia en días de liquidación
        }
        return 180; // 3 horas el resto de la semana
    },

    // 1. Guardar en Caché con marca de tiempo
    set: function(key, data, ttlMinutes) {
        const expiry = new Date().getTime() + (ttlMinutes * 60000);
        const payload = { data, expiry };
        sessionStorage.setItem(`gym_b2b_${key}`, JSON.stringify(payload));
    },

    // 2. Extraer de Caché (Retorna null si está vencido o no existe)
    get: function(key) {
        const raw = sessionStorage.getItem(`gym_b2b_${key}`);
        if (!raw) return null;
        
        try {
            const payload = JSON.parse(raw);
            const now = new Date().getTime();
            
            if (now > payload.expiry) {
                this.invalidate(key); // Destrucción silente al caducar
                return null;
            }
            return payload.data;
        } catch (e) {
            return null;
        }
    },

    // 3. Destrucción Selectiva (Invocado tras un POST, PUT o DELETE)
    invalidate: function(keys) {
        if (typeof keys === 'string') keys = [keys];
        keys.forEach(k => sessionStorage.removeItem(`gym_b2b_${k}`));
        console.log(`🧹 [Cache Cleared] Módulos invalidados: ${keys.join(', ')}`);
    },

    // 4. Limpieza Absoluta (Invocado obligatoriamente en el Logout)
    clearAll: function() {
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('gym_b2b_')) sessionStorage.removeItem(k);
        });
    },

    // 5. FETCH INTELIGENTE: El puente seguro hacia el Backend
    fetchSmart: async function(url, cacheKey, customTtl) {
        // A. Consultar Memoria Interna
        const cachedData = this.get(cacheKey);
        if (cachedData) {
            console.log(`⚡ [Cache Hit] Cargando ${cacheKey} desde RAM local.`);
            return cachedData;
        }

        // B. Consultar Servidor
        console.log(`📡 [API Call] Interrogando base de datos remota para ${cacheKey}...`);
        const token = localStorage.getItem('gymenez_partner_token');
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401 || response.status === 403) {
                // Token expirado o inválido: Volatizar datos y expulsar
                this.clearAll();
                window.location.href = '/store/partner/login.html';
                return null;
            }

            const data = await response.json();

            // C. Guardar en memoria solo bajo respuesta exitosa
            if (response.ok && data.success) {
                let finalTtl = customTtl;
                
                // Asignación automática de TTL si no se declara explícitamente
                if (!finalTtl) {
                    if (cacheKey === 'finance') {
                        finalTtl = this.getFinanceTTL();
                    } else {
                        finalTtl = this.TTL[cacheKey] || 15; // Fallback de seguridad de 15 mins
                    }
                }
                
                this.set(cacheKey, data, finalTtl);
            }
            
            return data;
        } catch (error) {
            console.error(`Error crítico en fetchSmart para ${cacheKey}:`, error);
            throw error;
        }
    }
};
