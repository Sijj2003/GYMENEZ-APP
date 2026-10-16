/**
 * ====================================================================
 * 🧠 GYMENEZ SMART CACHE INTERCEPTOR (Automático)
 * ====================================================================
 * Se invoca desde el HTML y secuestra (intercepta) todas las llamadas
 * 'fetch' del sistema sin necesidad de modificar el resto del código JS.
 */

const GymenezCache = {
    TTL: {
        profile: 1440,
        business: 1440,
        catalog: 1440,
        orders: 30,
        finance: 180, // Por defecto 3h. Se ajusta abajo en días de corte.
        dashboard: 30
    },

    getFinanceTTL: function() {
        const today = new Date().getDay();
        return (today === 4 || today === 5) ? 60 : 180; // Jueves/Viernes 1h, resto 3h
    },

    getKeyFromUrl: function(url) {
        // Extrae el módulo de la URL (ej: de "/api/partner/finance" extrae "finance")
        const match = url.match(/\/api\/partner\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    },

    invalidateAll: function() {
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('gym_b2b_')) sessionStorage.removeItem(k);
        });
        console.log("🧹 [Cache] Memoria invalidada por actualización de datos.");
    }
};

// ==========================================
// 🛡️ SECUESTRO GLOBAL DE LA FUNCIÓN FETCH
// ==========================================
const originalFetch = window.fetch;

window.fetch = async function(resource, config) {
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = (config && config.method) ? config.method.toUpperCase() : 'GET';

    // Solo intervenimos si la petición va a la API del Partner B2B
    if (url.includes('/api/partner/')) {
        const cacheKey = GymenezCache.getKeyFromUrl(url);

        // 1. SI ESTÁN MODIFICANDO DATOS (Guardar, Eliminar, Editar)
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            // Borramos toda la caché para forzar datos frescos en el próximo click
            GymenezCache.invalidateAll();
            // Dejamos pasar la petición original al backend
            return originalFetch.apply(this, arguments);
        }

        // 2. SI ESTÁN LEYENDO DATOS (Carga de página normal)
        if (method === 'GET' && cacheKey && GymenezCache.TTL[cacheKey]) {
            const storageKey = `gym_b2b_${cacheKey}`;
            const rawData = sessionStorage.getItem(storageKey);

            // Verificar si hay memoria válida
            if (rawData) {
                try {
                    const payload = JSON.parse(rawData);
                    if (new Date().getTime() < payload.expiry) {
                        console.log(`⚡ [Cache Hit] Cargando '${cacheKey}' al instante.`);
                        // Simulamos una respuesta real de fetch con los datos cacheados
                        return new Response(JSON.stringify(payload.data), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    } else {
                        sessionStorage.removeItem(storageKey); // Caducó
                    }
                } catch (e) {
                    sessionStorage.removeItem(storageKey);
                }
            }

            // Si no hay caché, dejamos que el fetch original vaya al backend
            console.log(`📡 [API Call] Descargando '${cacheKey}' del servidor...`);
            const response = await originalFetch.apply(this, arguments);
            
            // Si el backend responde bien, lo clonamos y guardamos en caché
            if (response.ok) {
                const resClone = response.clone();
                resClone.json().then(data => {
                    if (data.success || data.orders || data.products) {
                        let ttl = cacheKey === 'finance' ? GymenezCache.getFinanceTTL() : GymenezCache.TTL[cacheKey];
                        const expiry = new Date().getTime() + (ttl * 60000);
                        sessionStorage.setItem(storageKey, JSON.stringify({ data, expiry }));
                    }
                }).catch(() => {});
            }
            return response;
        }
    }

    // Si es una ruta externa o de otra cosa, el fetch funciona normal
    return originalFetch.apply(this, arguments);
};
