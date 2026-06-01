const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let currentSubscriptionLevel = 'BASICO';
let activeSelectedCategory = '';
let searchDebounceTimeout = null;

const CATEGORIES = [
    "Proteínas Magras AVB", "Proteínas Grasas AVB", "Carbohidratos Almidonados",
    "Carbohidratos Rápidos y Frutas", "Leguminosas", "Lípidos y Grasas Esenciales",
    "Lácteos y Derivados Proteicos", "Vegetales Fibrosos", "Suplementación y Ergogénicos"
];

// ==========================================
// 🧮 MOTOR MATEMÁTICO REACTIVO (COSTE DE RED = $0)
// Escucha los cambios de gramos y recalcula la equivalencia molecular instantáneamente
// ==========================================
function ejecutarRecalculoBentoEats(inputElement, prot100, carb100, gras100, cal100) {
    const gramosInput = parseFloat(inputElement.value);
    
    // Si el campo está vacío o es inválido, forzamos un estado de contingencia seguro en 0
    const gramos = (!isNaN(gramosInput) && gramosInput >= 0) ? gramosInput : 0;
    
    // Rastrear la Bento-Card contenedora específica en el DOM
    const card = inputElement.closest('.food-bento-card');
    if (!card) return;

    // Aplicar regla de tres bioquímica y fijar estrictamente el redondeo a 2 decimales
    card.querySelector('.display-prot').textContent = ((prot100 * gramos) / 100).toFixed(2) + 'g';
    card.querySelector('.display-carb').textContent = ((carb100 * gramos) / 100).toFixed(2) + 'g';
    card.querySelector('.display-gras').textContent = ((gras100 * gramos) / 100).toFixed(2) + 'g';
    card.querySelector('.display-cal').textContent = ((cal100 * gramos) / 100).toFixed(0) + ' kcal';
}

// ==========================================
// 🥦 RENDERIZADOR BENTO CON CALCULADORA INCORPORADA
// ==========================================
function createFoodBentoCard(food) {
    const card = document.createElement('div');
    card.className = "glass-panel food-bento-card rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col justify-between relative overflow-hidden";
    
    // Capturar variables bioquímicas base por cada 100g para pasarlas al motor reactivo
    const p100 = Number(food.proteins || 0);
    const c100 = Number(food.carbs_net || 0);
    const g100 = Number(food.fats_saturated || 0) + Number(food.fats_unsaturated || 0);
    const cal100 = Number(food.calories || 0);

    // Evaluar Banderas Clínicas de Seguridad Alimentaria
    let allergenBadgesHtml = '';
    if (food.has_gluten) allergenBadgesHtml += `<span class="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[6.5px] font-black tracking-widest uppercase">Gluten</span>`;
    if (food.has_lactose) allergenBadgesHtml += `<span class="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[6.5px] font-black tracking-widest uppercase">Lactosa</span>`;
    if (food.has_nuts) allergenBadgesHtml += `<span class="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[6.5px] font-black tracking-widest uppercase">Maní/Nueces</span>`;
    
    let physiologicalFlagsHtml = '';
    if (food.high_sodium) physiologicalFlagsHtml += `<span class="px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[6.5px] font-black tracking-widest uppercase">⚠️ Sodio Alto</span>`;
    if (food.high_purines) physiologicalFlagsHtml += `<span class="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[6.5px] font-black tracking-widest uppercase">⚠️ Purinas Altas</span>`;

    card.innerHTML = `
        <div>
            <div class="flex justify-between items-start mb-2 gap-2">
                <span class="text-[7.5px] font-black text-gray-500 uppercase tracking-widest truncate max-w-[60%]">${food.category}</span>
                <div class="flex gap-1 flex-wrap justify-end">${allergenBadgesHtml}</div>
            </div>
            
            <h4 class="text-base font-black uppercase text-white tracking-tighter truncate leading-tight mb-3">${food.name}</h4>
            
            <div class="relative w-full mb-3">
                <span class="absolute -top-1.5 left-2.5 text-[6.5px] font-black text-[#10b981] uppercase bg-[#06060a] px-1.5 border border-white/5 rounded tracking-widest">Dosificar Gramos</span>
                <input type="number" value="100" min="0" oninput="ejecutarRecalculoBentoEats(this, ${p100}, ${c100}, ${g100}, ${cal100})" class="w-full bg-black/60 border border-white/10 text-white font-mono font-black text-center text-sm p-2.5 rounded-xl outline-none focus:border-emerald-500/50 focus:shadow-[0_0_10px_rgba(16,185,129,0.15)] transition-all" placeholder="Gramos">
            </div>
            
            <div class="grid grid-cols-3 gap-1 bg-black/40 border border-white/5 rounded-xl p-2 text-center my-4">
                <div><span class="block text-[6.5px] text-gray-500 font-black uppercase tracking-wider">PROT</span><span class="display-prot text-xs font-mono font-black text-white">${p100.toFixed(2)}g</span></div>
                <div class="border-x border-white/5"><span class="block text-[6.5px] text-gray-500 font-black uppercase tracking-wider">CARB</span><span class="display-carb text-xs font-mono font-black text-emerald-400">${c100.toFixed(2)}g</span></div>
                <div><span class="block text-[6.5px] text-gray-500 font-black uppercase tracking-wider">GRASA</span><span class="display-gras text-xs font-mono font-black text-amber-500">${g100.toFixed(2)}g</span></div>
            </div>

            <div class="space-y-1.5 text-[9px] border-t border-white/5 pt-3 font-medium text-gray-400">
                <div class="flex justify-between"><span>🔥 Energía Estructural:</span><span class="display-cal font-mono font-bold text-white">${cal100.toFixed(0)} kcal</span></div>
                <div class="flex justify-between"><span>📊 Índice Glucémico (IG):</span><span class="font-mono font-bold ${food.glycemic_index > 65 ? 'text-red-400' : 'text-emerald-400'}">${food.glycemic_index}</span></div>
                <div class="flex justify-between"><span>🧠 Índice Saciante:</span><span class="font-bold text-white">${food.satiety_index}</span></div>
                <div class="flex justify-between"><span>🧬 Valor Biológico (VB):</span><span class="font-mono font-bold text-sky-400">${food.biological_value > 0 ? food.biological_value : '--'}</span></div>
            </div>
        </div>
        
        ${physiologicalFlagsHtml ? `<div class="mt-4 pt-2.5 border-t border-dashed border-white/5 flex gap-1 flex-wrap">${physiologicalFlagsHtml}</div>` : ''}
    `;
    return card;
}

// ==========================================
// 📡 INTERROGACIÓN AL SERVIDOR CACHÉ RAM
// ==========================================
async function executeEatsSearchQuery() {
    const grid = document.getElementById('foods-grid-container');
    const inputVal = document.getElementById('food-search-input').value;
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token');

    let url = `${API_BASE_URL}/api/client/eats/search?q=${encodeURIComponent(inputVal)}`;
    if (activeSelectedCategory) url += `&category=${encodeURIComponent(activeSelectedCategory)}`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            grid.innerHTML = '';
            if (data.foods.length === 0) {
                grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-600 font-bold uppercase tracking-widest text-[10px]">Sin coincidencias bioquímicas en el búfer.</div>`;
                return;
            }
            data.foods.forEach(food => grid.appendChild(createFoodBentoCard(food)));
        }
    } catch (e) { console.error("Error buscando en la caché:", e); }
}

function triggerDebouncedEatsSearch() {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(executeEatsSearchQuery, 300);
}

// ==========================================
// 🍽运营 PESTAÑAS (TABS OPERATIVOS)
// ==========================================
function switchEatsTab(tab) {
    const btnD = document.getElementById('tab-btn-dictionary');
    const btnPlan = document.getElementById('tab-btn-diet');
    const pnlD = document.getElementById('panel-dictionary');
    const pnlPlan = document.getElementById('panel-diet');

    [btnD, btnPlan].forEach(b => b.className = "px-5 py-3 border-b-2 border-transparent text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap");
    [pnlD, pnlPlan].forEach(p => p.classList.add('hidden'));

    if (tab === 'dictionary') {
        btnD.className = "px-5 py-3 border-b-2 border-emerald-400 text-emerald-400 font-black uppercase tracking-widest text-[10px] transition-colors whitespace-nowrap";
        pnlD.classList.remove('hidden');
    } else {
        btnPlan.className = "px-5 py-3 border-b-2 border-white text-white font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap";
        pnlPlan.classList.remove('hidden');
        
        if (currentSubscriptionLevel === 'ULTRA') {
            document.getElementById('diet-active-view').classList.remove('hidden');
            document.getElementById('diet-active-view').classList.add('flex');
        } else {
            document.getElementById('diet-locked-view').classList.remove('hidden');
            document.getElementById('diet-locked-view').classList.add('flex');
        }
    }
}

function renderCategoryPills() {
    const container = document.getElementById('category-pill-container');
    container.innerHTML = '';
    
    const allBtn = document.createElement('button');
    allBtn.className = `px-4 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-widest border transition-all ${activeSelectedCategory === '' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm' : 'bg-black/40 text-gray-500 border-white/5 hover:text-white hover:border-white/10'}`;
    allBtn.textContent = "Ver Todos";
    allBtn.onclick = () => { activeSelectedCategory = ''; renderCategoryPills(); executeEatsSearchQuery(); };
    container.appendChild(allBtn);

    CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        const isActive = activeSelectedCategory === cat;
        btn.className = `px-4 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-widest border transition-all ${isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm' : 'bg-black/40 text-gray-500 border-white/5 hover:text-white hover:border-white/10'}`;
        btn.textContent = cat;
        btn.onclick = () => { activeSelectedCategory = cat; renderCategoryPills(); executeEatsSearchQuery(); };
        container.appendChild(btn);
    });
}

function initCinematicEats3D() {
    const showcase = document.getElementById('showcase-view');
    const layerMain = document.getElementById('sc-layer-main');
    const layerFloat = document.getElementById('sc-layer-float');
    const textLayer = document.getElementById('sc-text-layer');
    const orb = document.getElementById('sc-blur-orb');
    const cta = document.getElementById('sc-cta');
    
    const title = document.getElementById('sc-title');
    const desc = document.getElementById('sc-desc');
    const bar1 = document.getElementById('sc-bar-1');
    const bar2 = document.getElementById('sc-bar-2');
    const val1 = document.getElementById('sc-val-1');
    const val2 = document.getElementById('sc-val-2');

    window.addEventListener('scroll', () => {
        const rect = showcase.getBoundingClientRect();
        const viewHeight = showcase.offsetHeight - window.innerHeight;
        let p = -rect.top / viewHeight;
        if (p < 0) p = 0; if (p > 1) p = 1;

        if (p <= 0.5) {
            let norm = p / 0.5;
            const rX = 22 - (22 * norm); const rY = -18 + (18 * norm);
            layerMain.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) translateZ(${norm * 30}px)`;
            layerMain.style.opacity = '1'; layerMain.style.filter = 'none';

            layerFloat.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) translateX(${140 - (norm * 60)}px) translateY(${40 - (norm * 20)}px) translateZ(${60 + (norm * 50)}px)`;
            layerFloat.style.opacity = `${norm}`;

            val1.textContent = `${Math.round(norm * 210)}g`;
            val2.textContent = `${Math.round(norm * 340)}g`;
            bar1.style.width = `${norm * 90}%`;
            bar2.style.width = `${norm * 75}%`;

            if (norm < 0.5) {
                title.textContent = "Partición de Macros"; desc.textContent = "Sincronización Circadiana";
                orb.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
            } else {
                title.textContent = "Entorno Anabólico"; desc.textContent = "Optimización de Glucógeno";
                orb.style.backgroundColor = "rgba(251, 195, 0, 0.08)";
            }
            textLayer.style.opacity = `${1 - (norm * 0.3)}`;
            cta.style.opacity = '0'; cta.style.pointerEvents = 'none';
        } else {
            let norm = (p - 0.5) / 0.5;
            layerMain.style.opacity = `${1 - norm}`;
            layerMain.style.transform = `translateZ(${30 + (norm * 100)}px) scale(${1 - norm * 0.2})`;
            layerMain.style.filter = `blur(${norm * 8}px)`;

            layerFloat.style.opacity = `${1 - norm}`;
            layerFloat.style.transform = `translateX(80px) translateY(20px) translateZ(${110 + (norm * 150)}px) scale(${1 - norm * 0.3})`;
            layerFloat.style.filter = `blur(${norm * 12}px)`;

            textLayer.style.opacity = `${1 - norm}`;
            orb.style.backgroundColor = "rgba(16, 185, 129, 0.02)";

            cta.style.opacity = `${norm}`;
            cta.style.transform = `scale(${0.93 + (norm * 0.07)})`;
            cta.style.pointerEvents = norm > 0.8 ? 'auto' : 'none';
        }
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token');
    if (!token) { window.location.href = '/apps/start/login.html'; return; }

    try {
        const profileRes = await fetch(`${API_BASE_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const profileData = await profileRes.json();
        
        currentSubscriptionLevel = profileData.profile.subscription_level || 'BASICO';
        document.getElementById('loading-spinner').classList.add('hidden');

        if (currentSubscriptionLevel === 'PLUS' || currentSubscriptionLevel === 'ULTRA') {
            document.getElementById('premium-view').classList.remove('hidden');
            document.getElementById('premium-view').classList.add('flex');
            document.body.classList.add('loaded');
            
            if (currentSubscriptionLevel === 'ULTRA') {
                try {
                    const dietRes = await fetch(`${API_BASE_URL}/api/client/ultra/eats/diet`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const dietData = await dietRes.json();
                    if (dietData.success && dietData.has_diet) {
                        document.getElementById('diet-title').textContent = dietData.diet.title || "Planificación Nutricional Activa";
                        document.getElementById('diet-updated-date').textContent = `Sincronizado: ${dietData.diet.updated_at ? String(dietData.diet.updated_at).split(' ')[0] : 'Hoy'}`;
                        document.getElementById('diet-content-body').textContent = dietData.diet.menu_text || "Notas en proceso de carga...";
                    } else {
                        document.getElementById('diet-title').textContent = "Asignación Pendiente";
                        document.getElementById('diet-content-body').textContent = dietData.message || "Su plan está siendo procesado.";
                    }
                } catch(errDiet) { console.error("Falla descargando dieta Ultra:", errDiet); }
            }

            document.getElementById('food-search-input').addEventListener('input', triggerDebouncedEatsSearch);
            renderCategoryPills();
            executeEatsSearchQuery();

        } else {
            document.getElementById('showcase-view').classList.remove('hidden');
            document.body.classList.add('loaded');
            initCinematicEats3D();
        }
    } catch (e) {
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error Central del Servidor Core.</p>';
        document.body.classList.add('loaded');
    }
});
