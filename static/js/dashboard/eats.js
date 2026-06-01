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
// 🛠️ RENDERIZADOR BENTO CORREGIDO (SIN LETRAS EXTRAÑAS Y MACROS REDONDEADOS)
// ==========================================
function createFoodBentoCard(food) {
    const card = document.createElement('div');
    card.className = "glass-panel food-bento-card rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col justify-between relative overflow-hidden";
    
    // 🛡️ PARCHE DE REDONDEO SEGURO: Clavamos exactamente 2 decimales para evitar el desborde numérico
    const proteins = Number(food.proteins || 0).toFixed(2);
    const carbs = Number(food.carbs_net || 0).toFixed(2);
    const fats = (Number(food.fats_saturated || 0) + Number(food.fats_unsaturated || 0)).toFixed(2);
    const calories = Number(food.calories || 0).toFixed(0); // Las calorías las dejamos redondas sin decimales

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
            <!-- Categoría y Alérgenos -->
            <div class="flex justify-between items-start mb-2 gap-2">
                <span class="text-[7.5px] font-black text-gray-500 uppercase tracking-widest truncate max-w-[60%]">${food.category}</span>
                <div class="flex gap-1 flex-wrap justify-end">${allergenBadgesHtml}</div>
            </div>
            
            <!-- Nombre del Alimento -->
            <h4 class="text-base font-black uppercase text-white tracking-tighter truncate leading-tight">${food.name}</h4>
            <span class="text-[7px] font-bold text-gray-600 tracking-widest uppercase block mt-0.5">Por cada 100g base</span>
            
            <!-- Macros Core Grid (Corregido y Limpio de texto intruso) -->
            <div class="grid grid-cols-3 gap-1 bg-black/40 border border-white/5 rounded-xl p-2 text-center my-4">
                <div><span class="block text-[6.5px] text-gray-500 font-black uppercase tracking-wider">PROT</span><span class="text-xs font-mono font-black text-white">${proteins}g</span></div>
                <div class="border-x border-white/5"><span class="block text-[6.5px] text-gray-500 font-black uppercase tracking-wider">CARB</span><span class="text-xs font-mono font-black text-emerald-400">${carbs}g</span></div>
                <div><span class="block text-[6.5px] text-gray-500 font-black uppercase tracking-wider">GRASA</span><span class="text-xs font-mono font-black text-amber-500">${fats}g</span></div>
            </div>

            <!-- Parámetros Avanzados -->
            <div class="space-y-1.5 text-[9px] border-t border-white/5 pt-3 font-medium text-gray-400">
                <div class="flex justify-between"><span>🔥 Energía Estructural:</span><span class="font-mono font-bold text-white">${calories} kcal</span></div>
                <div class="flex justify-between"><span>📊 Índice Glucémico (IG):</span><span class="font-mono font-bold ${food.glycemic_index > 65 ? 'text-red-400' : 'text-emerald-400'}">${food.glycemic_index}</span></div>
                <div class="flex justify-between"><span>🧠 Índice Saciante:</span><span class="font-bold text-white">${food.satiety_index}</span></div>
                <div class="flex justify-between"><span>🧬 Valor Biológico (VB):</span><span class="font-mono font-bold text-sky-400">${food.biological_value > 0 ? food.biological_value : '--'}</span></div>
            </div>
        </div>
        
        <!-- Indicadores Fisiológicos -->
        ${physiologicalFlagsHtml ? `<div class="mt-4 pt-2.5 border-t border-dashed border-white/5 flex gap-1 flex-wrap">${physiologicalFlagsHtml}</div>` : ''}
    `;
    return card;
}

// ==========================================
// 🚀 COMANDO DE INTERROGACIÓN AL BACKEND RAM
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
    } catch (e) {
        console.error("Error buscando en la caché:", e);
    }
}

// Parche Táctico de Debounce para cuidar el ancho de banda de red
function triggerDebouncedEatsSearch() {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(executeEatsSearchQuery, 300);
}

// ==========================================
// 🍽️ SISTEMA DE PESTAÑAS (TABS)
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

// Generador de píldoras de filtrado por categoría
function renderCategoryPills() {
    const container = document.getElementById('category-pill-container');
    container.innerHTML = '';
    
    // Opción "Todos"
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

// ==========================================
// 🧘 CINEMÁTICA PAYWALL INTERACTIVA (BÁSICOS)
// ==========================================
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

// ==========================================
// 🚀 INICIALIZADOR CENTRAL PERIMETRAL
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token');
    if (!token) { window.location.href = '/apps/start/login.html'; return; }

    try {
        // Interrogar expediente inmutable único del Atleta (Refleja degradaciones automáticas)
        const profileRes = await fetch(`${API_BASE_URL}/api/profile/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const profileData = await profileRes.json();
        
        currentSubscriptionLevel = profileData.profile.subscription_level || 'BASICO';
        document.getElementById('loading-spinner').classList.add('hidden');

        if (currentSubscriptionLevel === 'PLUS' || currentSubscriptionLevel === 'ULTRA') {
            document.getElementById('premium-view').classList.remove('hidden');
            document.getElementById('premium-view').classList.add('flex');
            document.body.classList.add('loaded');
            
            // Si es ULTRA, disparamos la descarga paralela y síncrona de su plan de dieta
            if (currentSubscriptionLevel === 'ULTRA') {
                try {
                    const dietRes = await fetch(`${API_BASE_URL}/api/client/ultra/eats/diet`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const dietData = await dietRes.json();
                    if (dietData.success && dietData.has_diet) {
                        document.getElementById('diet-title').textContent = dietData.diet.title || "Plan Nutricional Activo";
                        document.getElementById('diet-updated-date').textContent = `Sincronizado: ${dietData.diet.updated_at ? String(dietData.diet.updated_at).split(' ')[0] : 'Hoy'}`;
                        document.getElementById('diet-content-body').textContent = dietData.diet.menu_text || "Notas en proceso de carga...";
                    } else {
                        document.getElementById('diet-title').textContent = "Asignación Pendiente";
                        document.getElementById('diet-content-body').textContent = dietData.message || "Su plan está siendo procesado.";
                    }
                } catch(errDiet) { console.error("Falla descargando dieta Ultra:", errDiet); }
            }

            // Inicializar catálogo cached RAM
            document.getElementById('food-search-input').addEventListener('input', triggerDebouncedEatsSearch);
            renderCategoryPills();
            executeEatsSearchQuery();

        } else {
            // MODO COMPRADOR BÁSICO: Mostrar Paywall Apple Style Parallax
            document.getElementById('showcase-view').classList.remove('hidden');
            document.body.classList.add('loaded');
            initCinematicEats3D();
        }
    } catch (e) {
        document.getElementById('loading-spinner').innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Error Central del Servidor Core.</p>';
        document.body.classList.add('loaded');
    }
});
