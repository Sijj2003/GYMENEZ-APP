// ==========================================
// MÓDULO 1: SEGURIDAD Y SESIÓN B2B
// ==========================================

async function verifyPartnerSession() {
    const token = localStorage.getItem('gymenez_partner_token');
    
    if (!token) {
        window.location.href = '/store/partner/login.html';
        return;
    }

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/partner/profile', {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.status === 401 && data.session_expired) {
            console.warn("Gymenez Shield: Sesión finalizada.");
            localStorage.removeItem('gymenez_partner_token');
            const mensajeBloqueo = data.error || "🔒 Tu sesión ha expirado o fue revocada por seguridad.";
            alert(mensajeBloqueo);
            window.location.replace('/store/partner/login.html');
        }
    } catch (error) {
        console.error("Error validando el estado de la sesión B2B:", error);
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { return null; }
}

async function logout() {
    const token = localStorage.getItem('gymenez_partner_token');
    if (token) {
        try {
            await fetch('https://sijj2003.pythonanywhere.com/api/partner/logout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });
        } catch (error) {
            console.warn("⚠️ No se pudo contactar al servidor. Cerrando sesión localmente.");
        }
    }
    localStorage.removeItem('gymenez_partner_token');
    window.location.href = '/store/partner/login.html';
}
