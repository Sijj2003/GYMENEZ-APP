// ====================================================================
// 🛡️ NÚCLEO ZERO TRUST ADMIN - MIDDLEWARE DE AUTENTICACIÓN
// ====================================================================

// Usamos 'var' en lugar de 'const' para evitar bloqueos si el script se carga 2 veces por accidente
var ADMIN_TOKEN_KEY = 'gymen_admin_token';

// 1. Sobrescribir el método nativo 'fetch' solo si no se ha hecho antes
if (!window.originalFetch) {
    window.originalFetch = window.fetch;

    window.fetch = async function(...args) {
        let [resource, config] = args;
        const url = typeof resource === 'string' ? resource : resource.url;

        config = config || {};
        config.headers = config.headers || {};
        
        // 🔥 LISTA BLANCA: Solo inyectamos el Token de Admin si la URL va dirigida a TU API (/api/)
        const isGymenezApi = url.includes('/api/');

        if (isGymenezApi) {
            const token = localStorage.getItem(ADMIN_TOKEN_KEY);
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        const response = await window.originalFetch(resource, config);
        
        // 2. Evaluar expulsión solo si el rechazo 401/403 viene de TU API
        if (isGymenezApi && (response.status === 401 || response.status === 403) && !url.includes('/api/admin/login')) {
            ejecutarPurgaAdmin("Credenciales de administrador inválidas o expiradas.");
        }
        
        return response;
    };
}

// 3. Función de Purga Inmutable
function ejecutarPurgaAdmin(mensaje) {
    localStorage.removeItem('adminSession');
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    alert(`🔴 ALERTA DE SEGURIDAD: ${mensaje}`);
    // Usamos window.top para sacar toda la página al login, rompiendo el iframe
    window.top.location.href = '/apps/admin/login.html';
}

// 4. Verificación de Perímetro al cargar cualquier pantalla protegida
window.addEventListener('DOMContentLoaded', () => {
    // Si la pantalla actual NO es el login, verificamos que exista sesión local
    if (!window.location.pathname.includes('login.html')) {
        const storedSession = localStorage.getItem('adminSession');
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        
        if (!storedSession || !token) {
            // Usamos window.top aquí también
            window.top.location.href = '/apps/admin/login.html';
        }
    }
});
