// ====================================================================
// 🛡️ NÚCLEO CORE - CONTROLADOR AUTOMATIZADO DE CATÁLOGO Y DESCUENTOS
// ====================================================================

// REMEDIACIÓN CRÍTICA: Se elimina la redeclaración de AUTH_TOKEN_KEY.
// La constante ya se encuentra inyectada en el Scope global por auth_middleware.js.

// Configuración adaptativa de Endpoints perimetrales
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

/**
 * Transmite la orden de redirección al flujo de cobro del rango seleccionado
 * @param {string} tierName - Identificador del plan ('BASICO', 'PLUS', 'ULTRA')
 */
function selectTier(tierName) {
    if (!tierName) return;
    window.location.href = `/apps/user/payments.html?tier=${encodeURIComponent(tierName.toUpperCase())}`;
}

window.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');

    // Recuperar el pasaporte digital usando la llave declarada en auth_middleware.js
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    try {
        // 🚀 PIPELINE DE RED EN PARALELO: Descarga la identidad y las ofertas simultáneamente
        const [profileRes, catalogRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/api/plans/catalog`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!profileRes.ok || !catalogRes.ok) {
            if (profileRes.status === 401 || profileRes.status === 403) {
                localStorage.removeItem(AUTH_TOKEN_KEY);
                window.location.href = '/apps/start/login.html';
            }
            throw new Error("Fallo de comunicación perimetral con los endpoints.");
        }

        const profileData = await profileRes.json();
        const catalogData = await catalogRes.json();

        const currentLevel = String(profileData.profile.subscription_level || 'BASICO').toUpperCase();
        const plans = catalogData.plans || [];

        // Clase inmutable de desactivación de botones estéticos de la marca
        const disabledBtnClass = "w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black text-xs uppercase tracking-[0.2em] cursor-not-allowed text-center transition-all duration-300";

        // 🏗️ ITERADOR ATÓMICO: Inyecta precios y configuraciones dinámicas del Backend
        plans.forEach(plan => {
            const pid = plan.id.toUpperCase(); // 'BASICO', 'PLUS', 'ULTRA'
            
            const txtTag = document.getElementById(`tag-render-${pid}`);
            const divPrice = document.getElementById(`price-render-${pid}`);
            const ulFeatures = document.getElementById(`features-${pid}`);
            const btnEl = document.getElementById(`btn-${pid}`);
            const cardEl = document.getElementById(`tier-${pid}`);

            // 1. Asignar Tags de Mercadeo del Servidor
            if (txtTag) txtTag.textContent = plan.tag;

            // 2. Evaluar y Renderizar Bloque de Descuentos Fijos de Forma Reactiva
            if (divPrice) {
                if (plan.is_discounted && plan.base_price_usd > 0) {
                    divPrice.innerHTML = `
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-bold line-through text-gray-500">$${plan.base_price_usd.toFixed(2)}</span>
                            <span class="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-black text-[7.5px] tracking-wider uppercase border border-sky-500/20">Ahorro Promocional</span>
                        </div>
                        <div class="flex items-baseline gap-1">
                            <span class="price-clamp text-white">$${plan.priceUSD.toFixed(2)}</span>
                            <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">/ Mes</span>
                        </div>
                    `;
                } else {
                    divPrice.innerHTML = `
                        <div class="flex items-baseline gap-1">
                            <span class="price-clamp ${pid === 'ULTRA' ? 'text-[#FFC300] drop-shadow-[0_0_15px_rgba(255,195,0,0.2)]' : 'text-white'}">$${plan.priceUSD.toFixed(2)}</span>
                            ${plan.priceUSD > 0 ? `<span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">/ Mes</span>` : ''}
                        </div>
                    `;
                }
            }

            // 3. Renderizar Características Dinámicas del Plan
            if (ulFeatures && plan.features) {
                ulFeatures.innerHTML = plan.features.map(f => `
                    <li class="flex items-center gap-3">
                        <span class="w-1.5 h-1.5 rounded-full ${pid === 'PLUS' ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : pid === 'ULTRA' ? 'bg-[#FFC300] shadow-[0_0_8px_#FFC300]' : 'bg-gray-500'}"></span>
                        ${f.name}: <span class="text-white">${f.value}</span>
                    </li>
                `).join('');
            }

            // 4. Inyectar Clases de Resplandor Estético Bento desde el Servidor
            if (cardEl && plan.cardClass) {
                cardEl.classList.add(plan.cardClass);
            }

            // 5. Aplicar Clases de Botones Base si no está comprado
            if (btnEl && plan.btnClass && pid !== currentLevel) {
                btnEl.className = `${plan.btnClass} w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 transform hover:scale-[1.02]`;
            }

            // 6. 🔒 LOCK TRANSACCIONAL VISUAL: Congela el plan actual del atleta
            if (pid === currentLevel) {
                if (btnEl) {
                    btnEl.textContent = "Tu Plan Activo";
                    btnEl.disabled = true;
                    btnEl.className = disabledBtnClass;
                    btnEl.removeAttribute('onclick');
                }
                if (cardEl) {
                    cardEl.classList.add('border-[#FFC300]/40', 'bg-[#FFC300]/[0.01]');
                }
                
                // Activar insignias promocionales superiores si corresponden
                const badgeTop = document.getElementById(`badge-top-${pid}`);
                if (badgeTop) badgeTop.classList.remove('hidden');
                
                const badgePromo = document.getElementById(`badge-promo-${pid}`);
                if (badgePromo) badgePromo.classList.remove('hidden');
            } else {
                // Atenuar de forma sutil los planes no activos para priorizar el contraste del adquirido
                if (cardEl) cardEl.classList.add('opacity-50');
            }
        });

    } catch (error) {
        console.error("Fallo crítico en el pipeline core de sincronización financiera:", error);
    }
});
