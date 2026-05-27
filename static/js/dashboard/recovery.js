// Constante de Auth compatible con el ecosistema
const AUTH_TOKEN_KEY = 'authToken';

window.addEventListener('DOMContentLoaded', () => {
    // 1. Quitar el difuminado inicial del body
    document.body.classList.add('loaded');
    
    // 2. Verificación estricta de sesión
    const storedSession = localStorage.getItem('userSession');
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    if (!storedSession || !token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    // El sistema se ha inicializado correctamente.
    console.log("Recovery Center: Subsistema inicializado.");
});
