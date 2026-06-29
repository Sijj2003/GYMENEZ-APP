// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Memoria RAM
let allFoodsData = [];
let activeFoodId = null;
let currentCategoryFilter = '';

function getSecureHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymen_admin_token')}` };
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

// ==========================================
// 📡 CARGA INICIAL (RAM)
// ==========================================
async function fetchAllFoods() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/foods`, { headers: getSecureHeaders() });
        const data = await res.json();
        
        if (data.success) {
            allFoodsData = data.foods || [];
            refreshActiveList();
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        document.getElementById('inventory-list').innerHTML = `<div class="p-4 text-center text-red-500 font-bold text-[10px] uppercase tracking-widest">Error de red</div>`;
    }
}

// ==========================================
// 🎛️ CONTROL DE LISTA E INVENTARIO
// ==========================================
function filterCategory(cat) {
    currentCategoryFilter = cat;
    
    // Actualizar UI de los botones (Chips)
    document.querySelectorAll('.cat-filter').forEach(btn => {
        if(btn.textContent.trim().toLowerCase() === (cat ? cat.toLowerCase() : 'todos') || (cat==='' && btn.textContent.trim()==='Todos')) {
            btn.className = "cat-filter px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest shrink-0 transition-all";
        } else {
            btn.className = "cat-filter px-3 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white text-[8px] font-black uppercase tracking-widest shrink-0 transition-all";
        }
    });

    refreshActiveList(document.getElementById('search-inventory').value);
}

function refreshActiveList(searchTerm = '') {
    // Normalizamos el texto (quitamos tildes)
    const normalizeText = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const term = normalizeText(searchTerm);
    const filterCat = normalizeText(currentCategoryFilter);
    const container = document.getElementById('inventory-list');
    container.innerHTML = '';

    let list = allFoodsData.filter(f => {
        const fName = normalizeText(f.name);
        const fCat = normalizeText(f.category);
        
        const matchesTerm = fName.includes(term) || fCat.includes(term);
        const matchesCat = currentCategoryFilter === '' || fCat.includes(filterCat);
        return matchesTerm && matchesCat;
    });

    if (list.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 font-bold uppercase tracking-widest text-[9px]">Sin resultados.</div>`;
        return;
    }

    list.forEach(food => {
        const div = document.createElement('div');
        const isActive = activeFoodId === food.id;
        const catNorm = normalizeText(food.category);
        
        let catColor = 'text-gray-400 border-gray-500/30';
        if(catNorm.includes('proteina')) catColor = 'text-rose-400 border-rose-500/30';
        else if(catNorm.includes('carbohidrato')) catColor = 'text-[#FFC300] border-[#FFC300]/30';
        else if(catNorm.includes('grasa') || catNorm.includes('lipido')) catColor = 'text-sky-400 border-sky-500/30';
        else if(catNorm.includes('vegetal') || catNorm.includes('fruta')) catColor = 'text-emerald-400 border-emerald-500/30';

        div.className = `p-3 rounded-xl border cursor-pointer transition-all duration-200 flex justify-between items-center ${isActive ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`;
        div.onclick = () => loadFoodWorkspace(food.id);

        div.innerHTML = `
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <p class="text-[11px] font-black uppercase text-white truncate">${food.name}</p>
                    <span class="px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest shrink-0 ${catColor}">${food.category}</span>
                </div>
                <div class="flex gap-3 mt-1 text-[8px] font-mono text-gray-400">
                    <span>${food.portion || '100g'}</span>
                    <span>🔥 ${food.calories||0}k</span>
                    <span class="text-rose-400">P:${food.proteins||0}</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

let searchTimeout;
document.getElementById('search-inventory').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => refreshActiveList(e.target.value), 200);
});

// ==========================================
// 🖥️ CONTROL DEL LIENZO DE TRABAJO
// ==========================================
function hideWorkspace() {
    document.getElementById('ws-empty').classList.add('hidden');
    document.getElementById('ws-food').classList.add('hidden');
    document.getElementById('ws-food').classList.remove('flex');
}

function openCreateWorkspace() {
    activeFoodId = null;
    refreshActiveList(document.getElementById('search-inventory').value);
    hideWorkspace();
    
    document.getElementById('ws-food').classList.remove('hidden');
    document.getElementById('ws-food').classList.add('flex');
    
    document.getElementById('e-header-title').textContent = "Nuevo Alimento";
    document.getElementById('e-header-title').className = "text-2xl font-black uppercase tracking-tighter text-emerald-400";
    document.getElementById('e-cat-badge').textContent = "Creación";
    document.getElementById('e-cat-badge').className = "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2 inline-block";
    
    document.getElementById('e-btn-delete').classList.add('hidden');
    
    document.getElementById('food-form').reset();
    document.getElementById('e-id').value = '';
    document.getElementById('e-is-edit').value = 'false';
}

function loadFoodWorkspace(id) {
    const food = allFoodsData.find(x => x.id === id); 
    if (!food) return;

    activeFoodId = id;
    refreshActiveList(document.getElementById('search-inventory').value); 
    hideWorkspace();
    
    document.getElementById('ws-food').classList.remove('hidden');
    document.getElementById('ws-food').classList.add('flex');
    
    document.getElementById('e-header-title').textContent = food.name;
    document.getElementById('e-header-title').className = "text-2xl font-black uppercase tracking-tighter text-white";
    document.getElementById('e-cat-badge').textContent = food.category || 'N/A';
    
    document.getElementById('e-btn-delete').classList.remove('hidden');
    
    document.getElementById('e-id').value = food.id;
    document.getElementById('e-is-edit').value = 'true';
    document.getElementById('e-name').value = food.name || '';

    // ========================================================
    // 🧠 TRADUCTOR INTELIGENTE DE CATEGORÍAS (EL FIX)
    // ========================================================
    const selectCat = document.getElementById('e-category');
    const dbCat = food.category || 'Otro';
    
    // 1. Revisa si la categoría existe exactamente igual en las opciones del HTML
    let exactMatch = Array.from(selectCat.options).some(opt => opt.value === dbCat);
    
    if (exactMatch) {
        selectCat.value = dbCat;
    } else {
        // 2. Si no coincide, normaliza y busca a qué nueva categoría pertenece
        const catLower = dbCat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        if (catLower.includes('proteina')) selectCat.value = 'Proteínas Magras AVB';
        else if (catLower.includes('carbohidrato') && catLower.includes('rapido')) selectCat.value = 'Carbohidratos Rápidos y Frutas';
        else if (catLower.includes('carbohidrato')) selectCat.value = 'Carbohidratos Almidonados';
        else if (catLower.includes('grasa') || catLower.includes('lipido')) selectCat.value = 'Lípidos y Grasas Esenciales';
        else if (catLower.includes('vegetal')) selectCat.value = 'Vegetales Fibrosos';
        else if (catLower.includes('fruta')) selectCat.value = 'Carbohidratos Rápidos y Frutas';
        else if (catLower.includes('lacteo')) selectCat.value = 'Lácteos y Derivados Proteicos';
        else if (catLower.includes('suplemento')) selectCat.value = 'Suplementación y Ergogénicos';
        else selectCat.value = 'Otro';
    }
    // ========================================================

    document.getElementById('e-portion').value = food.portion || '100g';
    document.getElementById('e-calories').value = food.calories || 0;
    document.getElementById('e-protein').value = food.proteins || 0; 
    document.getElementById('e-carbs').value = food.carbs_net || 0;  
    document.getElementById('e-fats').value = (Number(food.fats_saturated || 0) + Number(food.fats_unsaturated || 0)).toFixed(2);
    document.getElementById('e-notes').value = food.notes || '';
}

// ==========================================
// 💾 GESTIÓN DE GUARDADO Y ELIMINADO
// ==========================================
async function saveFood() {
    const form = document.getElementById('food-form');
    if(!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const isEdit = document.getElementById('e-is-edit').value === 'true';
    const fId = document.getElementById('e-id').value;
    const btn = document.getElementById('e-btn-save');

    const payload = {
        name: document.getElementById('e-name').value.trim(),
        category: document.getElementById('e-category').value,
        portion: document.getElementById('e-portion').value.trim() || '100g',
        calories: parseFloat(document.getElementById('e-calories').value) || 0,
        proteins: parseFloat(document.getElementById('e-protein').value) || 0,
        carbs_net: parseFloat(document.getElementById('e-carbs').value) || 0,
        fats_saturated: parseFloat(document.getElementById('e-fats').value) || 0, 
        fats_unsaturated: 0, 
        has_gluten: false, 
        has_lactose: false,
        has_nuts: false,
        high_sodium: false,
        notes: document.getElementById('e-notes').value.trim()
    };

    btn.disabled = true; btn.textContent = '...';
    const url = isEdit ? `${API_BASE_URL}/api/admin/food/${fId}` : `${API_BASE_URL}/api/admin/food`;

    try {
        const res = await fetch(url, { 
            method: isEdit ? 'PUT' : 'POST', 
            headers: getSecureHeaders(), 
            body: JSON.stringify(payload) 
        });
        const data = await res.json();
        
        if (data.success) { 
            showUIFeedback("Biometría nutricional asentada."); 
            await fetchAllFoods(); 
            if(!isEdit) {
                const newF = allFoodsData.find(f => f.name.toLowerCase() === payload.name.toLowerCase());
                if(newF) loadFoodWorkspace(newF.id);
            }
        } else {
            showUIFeedback(data.error, 'error');
        }
    } catch (e) { 
        showUIFeedback("Falla de red.", 'error'); 
    }
    btn.disabled = false; btn.textContent = 'Sintetizar Macro';
}

async function deleteCurrentFood() {
    const id = document.getElementById('e-id').value;
    if(!confirm('¿Purgar elemento de la bóveda? Desaparecerá de las dietas asociadas.')) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/food/${id}`, { method: 'DELETE', headers: getSecureHeaders() });
        const data = await res.json();
        if(data.success) { 
            showUIFeedback("Elemento purgado."); 
            hideWorkspace(); 
            document.getElementById('ws-empty').classList.remove('hidden');
            fetchAllFoods(); 
        }
    } catch(e) {}
}

// INICIALIZAR
window.addEventListener('DOMContentLoaded', fetchAllFoods);
