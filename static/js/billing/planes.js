// Configuración de Endpoints
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Manejador Dinámico de Selección
function selectTier(tierName) {
    // Redirige a la pantalla de reporte de pagos inyectando la membresía seleccionada por URL
    window.location.href = `/apps/user/payments.html?tier=${tierName.toUpperCase()}`;
}

// Inicializador y Sincronizador de Estado de Membresías
window.addEventListener('DOMContentLoaded', async () => {
    // Quitar cortina de difuminado del body
    document.body.classList.add('loaded');

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    try {
        // Consultar el Perfil de forma segura al Servidor Central
        const res = await fetch(`${API_BASE_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            // Si el backend no tiene nivel definido, por defecto es BASICO
            const currentLevel = (data.profile.subscription_level || 'BASICO').toUpperCase();

            // Identificar los componentes de la UI
            const btnBasico = document.getElementById('btn-basico');
            const btnPlus = document.getElementById('btn-plus');
            const btnUltra = document.getElementById('btn-ultra');
            
            const cardBasico = document.getElementById('tier-basico');
            const cardPlus = document.getElementById('tier-plus');
            const cardUltra = document.getElementById('tier-ultra');

            // Formatear visualmente el botón del Plan Activo del Atleta
            if (currentLevel === 'BASICO' && btnBasico) {
                btnBasico.textContent = "Tu Plan Actual";
                btnBasico.disabled = true;
                btnBasico.className = "w-full py-4 rounded-xl bg-white/5 border border-white/10 text-gray-500 font-black text-[10px] uppercase tracking-widest cursor-not-allowed";
                cardBasico.classList.add('border-white/20', 'bg-white/[0.03]');
            } 
            else if (currentLevel === 'PLUS' && btnPlus) {
                btnPlus.textContent = "Tu Plan Actual";
                btnPlus.disabled = true;
                btnPlus.className = "w-full py-4.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 font-black text-[10px] uppercase tracking-widest cursor-not-allowed";
                cardPlus.classList.add('border-sky-500/30', 'bg-sky-500/[0.02]');
            } 
            else if (currentLevel === 'ULTRA' && btnUltra) {
                btnUltra.textContent = "Tu Plan Actual";
                btnUltra.disabled = true;
                btnUltra.className = "w-full py-4.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 font-black text-[10px] uppercase tracking-widest cursor-not-allowed";
                cardUltra.classList.add('border-[#FFC300]/40', 'bg-[#FFC300]/[0.02]');
            }
        }
    } catch (error) {
        console.error("Error validando jerarquía de planes:", error);
    }
});
