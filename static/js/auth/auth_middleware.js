// ====================================================================
// 🛡️ NÚCLEO ZERO TRUST FRONTEND - MIDDLEWARE DE AUTENTICACIÓN
// ====================================================================

const AUTH_TOKEN_KEY = 'gymen_auth_token';
const DEVICE_ID_KEY = 'gymen_device_id';

// 1. Asegurar que el terminal (dispositivo) tenga una huella digital única
let localDeviceId = localStorage.getItem(DEVICE_ID_KEY);
if (!localDeviceId) {
    localDeviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, localDeviceId);
}

// 2. Sobrescribir el método nativo 'fetch' para interceptar todas las llamadas a la API
const originalFetch = window.fetch;

window.fetch = async function(...args) {
    let [resource, config] = args;
    config = config || {};
    config.headers = config.headers || {};
    
    // Inyectar el pasaporte digital (Token JWT) siguiendo el estándar Bearer
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Ejecutar la petición original
    const response = await originalFetch(resource, config);
    const url = typeof resource === 'string' ? resource : resource.url;
    
    // 3. Evaluar la respuesta del Backend Core
    // Si el backend dice que el token expiró, es inválido o el usuario fue bloqueado (401 o 403)
    // Se ignora esta regla si la petición es hacia las rutas de login para no crear bucles.
    if ((response.status === 401 || response.status === 403) && !url.includes('/api/login') && !url.includes('/api/auth/')) {
        
        // Extraemos el posible mensaje de error del backend para ser más precisos (Opcional)
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

// 4. Función de Purga Inmutable
function ejecutarPurgaLocal(mensaje) {
    // Destruir rastro de credenciales en el navegador
    localStorage.removeItem('userSession');
    localStorage.removeItem(AUTH_TOKEN_KEY);
    
    // Informar al atleta y sacarlo al perímetro exterior
    alert(`ACCESO RESTRINGIDO: ${mensaje}`);
    window.location.href = '/apps/start/login.html';
}
