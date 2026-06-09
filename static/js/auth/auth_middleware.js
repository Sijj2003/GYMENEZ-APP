// ====================================================================
// 🛡️ NÚCLEO ZERO TRUST FRONTEND - MIDDLEWARE DE AUTENTICACIÓN
// ====================================================================

// Usamos 'var' en lugar de 'const' para evitar bloqueos si el script se carga 2 veces por accidente
var AUTH_TOKEN_KEY = 'gymen_auth_token';
var DEVICE_ID_KEY = 'gymen_device_id';

let localDeviceId = localStorage.getItem(DEVICE_ID_KEY);
if (!localDeviceId) {
    localDeviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, localDeviceId);
}

// Blindaje: Solo sobrescribimos el fetch nativo si no lo hemos hecho antes
if (!window.originalFetch) {
    window.originalFetch = window.fetch;

    window.fetch = async function(...args) {
        let [resource, config] = args;
        const url = typeof resource === 'string' ? resource : resource.url;
        
        config = config || {};
        config.headers = config.headers || {};
        
        // 🔥 LISTA BLANCA: Solo inyectamos el Token si la URL va dirigida a TU API (/api/)
        const isGymenezApi = url.includes('/api/');

        if (isGymenezApi) {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        const response = await window.originalFetch(resource, config);
        
        // Solo expulsamos al usuario si el error 401/403 viene de TU API (y no de Firebase u otros)
        if (isGymenezApi && (response.status === 401 || response.status === 403) && !url.includes('/api/login') && !url.includes('/api/auth/')) {
            
            let errorMsg = 'Tu sesión ha finalizado por seguridad. Vuelve a ingresar.';
            try {
                const data = await response.clone().json();
                if (data.error) errorMsg = data.error;
            } catch (e) {
                // Falla silenciosa si no se puede parsear
            }

            ejecutarPurgaLocal(errorMsg);
        }
        
        return response;
    };
}

function ejecutarPurgaLocal(mensaje) {
    // Destruir rastro de credenciales en el navegador
    localStorage.removeItem('userSession');
    localStorage.removeItem(AUTH_TOKEN_KEY);
    
    // Informar al atleta y sacarlo al perímetro exterior
    alert(`ACCESO RESTRINGIDO: ${mensaje}`);
    window.location.href = '/apps/start/login.html';
}
