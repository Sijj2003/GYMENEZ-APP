// Configuración de Endpoints
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

function selectTier(tierName) {
    window.location.href = `/apps/user/payments.html?tier=${tierName.toUpperCase()}`;
}

window.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const currentLevel = (data.profile.subscription_level || 'BASICO').toUpperCase();

            const btnBasico = document.getElementById('btn-basico');
            const btnPlus = document.getElementById('btn-plus');
            const btnUltra = document.getElementById('btn-ultra');
            
            const cardBasico = document.getElementById('tier-basico');
            const cardPlus = document.getElementById('tier-plus');
            const cardUltra = document.getElementById('tier-ultra');

            // Ajuste de clases deshabilitadas para mantener el botón GRUESO y GRANDE
            const disabledBtnClass = "w-full py-5 md:py-6 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black text-xs md:text-sm uppercase tracking-[0.2em] cursor-not-allowed text-center";

            if (currentLevel === 'BASICO' && btnBasico) {
                btnBasico.textContent = "Tu Plan Actual";
                btnBasico.disabled = true;
                btnBasico.className = disabledBtnClass;
                cardBasico.classList.add('border-white/20', 'bg-white/[0.03]');
            } 
            else if (currentLevel === 'PLUS' && btnPlus) {
                btnPlus.textContent = "Tu Plan Actual";
                btnPlus.disabled = true;
                btnPlus.className = disabledBtnClass;
                cardPlus.classList.add('border-sky-500/30', 'bg-sky-500/[0.02]');
            } 
            else if (currentLevel === 'ULTRA' && btnUltra) {
                btnUltra.textContent = "Tu Plan Actual";
                btnUltra.disabled = true;
                btnUltra.className = disabledBtnClass;
                cardUltra.classList.add('border-[#FFC300]/40', 'bg-[#FFC300]/[0.02]');
            }
        }
    } catch (error) {
        console.error("Error validando jerarquía de planes:", error);
    }
});
