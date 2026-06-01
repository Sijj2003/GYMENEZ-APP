const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allFoodsData = [];
let allUsersData = [];
let foodSearchTimeout = null;

// ==========================================
// 📢 UTILERÍAS DE INTERFAZ (FEEDBACK)
// ==========================================
function showAdminToast(message, type = 'success') {
    const box = document.getElementById('admin-toast');
    if (!box) return alert(message);
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

function toggleAdminModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden', 'pointer-events-none', 'opacity-0');
    } else {
        modal.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// ==========================================
// 📡 CONSUMO DE DATOS DESDE LA CACHÉ RAM
// ==========================================
async function fetchAllAdminEatsCoreData() {
    try {
        const token = localStorage.getItem('gymen_admin_token');
        
        // Ejecución paralela ultra-veloz de alimentos y atletas
        const [resFoods, resUsers] = await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/foods`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const dataFoods = await resFoods.json();
        const dataUsers = await resUsers.json();

        allFoodsData = dataFoods.success ? dataFoods.foods : [];
        allUsersData = dataUsers.success ? dataUsers.users : [];

        // Pintar las tablas correspondientes
        renderAdminFoodsTable(allFoodsData);
        renderUltraAthletesGrid(allUsersData);

        // Apagar spinner de carga y revelar panel
        document.getElementById('admin-spinner').classList.add('hidden');
        document.getElementById('admin-panel-content').classList.remove('hidden');
    } catch (e) {
        showAdminToast("Fallo crítico de enlace con el Core del servidor.", "error");
    }
}

// ==========================================
// 🥦 CONTROLADOR PANEL 1: BÓVEDA DE ALIMENTOS
// ==========================================
function renderAdminFoodsTable(foods) {
    const tbody = document.getElementById('admin-foods-tbody');
    tbody.innerHTML = '';

    if (foods.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-500 uppercase tracking-widest font-bold text-[10px]">No hay registros coincidentes.</td></tr>`;
        return;
    }

    foods.forEach(food => {
        const tr = tbody.insertRow();
        
        // Nombre técnico
        tr.insertCell().innerHTML = `<span class="font-bold text-white uppercase">${food.name}</span>`;
        // Categoría
        tr.insertCell().innerHTML = `<span class="text-[10px] text-gray-400 uppercase tracking-wider">${food.category}</span>`;
        
        // Redondeo seguro estricto a 2 decimales en macros
        tr.insertCell().innerHTML = `<div class="text-center font-mono font-bold text-gray-500">${Number(food.calories).toFixed(0)}</div>`;
        tr.insertCell().innerHTML = `<div class="text-center font-mono font-bold text-white">${Number(food.proteins).toFixed(2)}g</div>`;
        tr.insertCell().innerHTML = `<div class="text-center font-mono font-bold text-emerald-400">${Number(food.carbs_net).toFixed(2)}g</div>`;
        
        const totalGrasa = Number(food.fats_saturated || 0) + Number(food.fats_unsaturated || 0);
        tr.insertCell().innerHTML = `<div class="text-center font-mono font-bold text-amber-500">${totalGrasa.toFixed(2)}g</div>`;

        // Controles de edición
        const actions = tr.insertCell();
        actions.className = "text-right whitespace-nowrap space-x-3";
        
        // Escapar comillas simples de forma segura en el JSON dinámico
        const safeFoodJson = JSON.stringify(food).replace(/'/g, "&#39;");
        
        actions.innerHTML = `
            <button onclick='openFoodModal(${safeFoodJson})' class="text-[#FFC300] font-black uppercase text-[9px] tracking-widest hover:underline">Editar</button>
            <button onclick="executeDeleteFood('${food.id}', '${food.name.replace(/'/g, "\\'")}')" class="text-red-500 font-black uppercase text-[9px] tracking-widest hover:underline">Eliminar</button>
        `;
    });
}

function triggerAdminFoodFilter() {
    clearTimeout(foodSearchTimeout);
    foodSearchTimeout = setTimeout(() => {
        const term = document.getElementById('admin-food-search').value.toLowerCase().trim();
        if (!term) return renderAdminFoodsTable(allFoodsData);
        
        const filtered = allFoodsData.filter(f => 
            f.name.toLowerCase().includes(term) || 
            f.category.toLowerCase().includes(term) || 
            f.id.toLowerCase().includes(term)
        );
        renderAdminFoodsTable(filtered);
    }, 200);
}

// ==========================================
// 🎴 MODAL CRUD ALIMENTOS
// ==========================================
function openFoodModal(food = null) {
    const form = document.getElementById('food-form');
    form.reset();

    if (!food) {
        document.getElementById('modal-food-title').textContent = "Inyectar Alimento a la Bóveda";
        document.getElementById('form-food-id').value = "";
    } else {
        document.getElementById('modal-food-title').textContent = `Modificar: ${food.name}`;
        document.getElementById('form-food-id').value = food.id;
        
        document.getElementById('form-food-name').value = food.name;
        document.getElementById('form-food-category').value = food.category;
        document.getElementById('form-food-calories').value = food.calories;
        document.getElementById('form-food-proteins').value = food.proteins;
        document.getElementById('form-food-carbs').value = food.carbs_net;
        document.getElementById('form-food-fats').value = food.fats_saturated || food.fats_unsaturated || 0;
        
        document.getElementById('form-food-gluten').checked = food.has_gluten === true;
        document.getElementById('form-food-lactose').checked = food.has_lactose === true;
        document.getElementById('form-food-nuts').checked = food.has_nuts === true;
        document.getElementById('form-food-sodium').checked = food.high_sodium === true;
    }
    toggleAdminModal('food-modal', true);
}

function closeFoodModal() { toggleAdminModal('food-modal', false); }

async function handleFoodFormSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('gymen_admin_token');
    const foodId = document.getElementById('form-food-id').value;
    const isEdit = foodId !== "";

    const payload = {
        name: document.getElementById('form-food-name').value.trim(),
        category: document.getElementById('form-food-category').value,
        calories: parseFloat(document.getElementById('form-food-calories').value) || 0,
        proteins: parseFloat(document.getElementById('form-food-proteins').value) || 0,
        carbs_net: parseFloat(document.getElementById('form-food-carbs').value) || 0,
        fats_saturated: parseFloat(document.getElementById('form-food-fats').value) || 0,
        has_gluten: document.getElementById('form-food-gluten').checked,
        has_lactose: document.getElementById('form-food-lactose').checked,
        has_nuts: document.getElementById('form-food-nuts').checked,
        high_sodium: document.getElementById('form-food-sodium').checked
    };

    const url = isEdit ? `${API_BASE_URL}/api/admin/food/${foodId}` : `${API_BASE_URL}/api/admin/food`;
    
    try {
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            closeFoodModal();
            showAdminToast(isEdit ? "Expediente bioquímico actualizado." : "Nuevo alimento inyectado.");
            fetchAllAdminEatsCoreData();
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch(err) { showAdminToast("Fallo de conexión.", "error"); }
}

async function executeDeleteFood(id, name) {
    if (!confirm(`⚠️ ¿Deseas eliminar permanentemente "${name}" de la Bóveda?`)) return;
    const token = localStorage.getItem('gymen_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/food/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) { showAdminToast("Alimento purgado con éxito."); fetchAllAdminEatsCoreData(); }
    } catch(e) {}
}

// ==========================================
// 👑 CONTROLADOR PANEL 2: DIETAS ULTRA
// ==========================================
function renderUltraAthletesGrid(users) {
    const container = document.getElementById('admin-ultra-athletes-grid');
    container.innerHTML = '';

    // Filtrar estrictamente solo atletas con membresía de rango ULTRA
    const ultraAthletes = users.filter(u => String(u.subscription_level).toUpperCase() === 'ULTRA');

    if (ultraAthletes.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500 font-bold uppercase tracking-widest text-[10px]">No hay atletas registrados en el rango ULTRA actualmente.</div>`;
        return;
    }

    ultraAthletes.forEach(athlete => {
        const card = document.createElement('div');
        card.className = "glass-panel rounded-2xl border border-white/5 p-6 flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300 bg-white/[0.01]";
        
        card.innerHTML = `
            <div>
                <span class="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[7px] font-black rounded tracking-widest uppercase">Plan Activo</span>
                <h4 class="text-lg font-black uppercase text-white tracking-tighter mt-2 truncate">${athlete.full_name}</h4>
                <p class="text-[10px] font-mono font-bold text-gray-500 truncate mt-0.5">${athlete.email}</p>
            </div>
            <div class="mt-6 pt-4 border-t border-white/5 flex justify-end">
                <button onclick="openDietModal('${athlete.id}', '${athlete.full_name.replace(/'/g, "\\'")}')" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 text-[9px] font-black uppercase tracking-widest transition-all">Configurar Dieta →</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 📝 MODAL PLANIFICADOR NUTRICIONAL ULTRA
// ==========================================
async function openDietModal(userId, fullName) {
    const token = localStorage.getItem('gymen_admin_token');
    document.getElementById('diet-modal-athlete-name').textContent = `Menú de: ${fullName}`;
    document.getElementById('diet-modal-user-id').value = userId;
    
    // Limpieza defensiva previa
    document.getElementById('diet-modal-title').value = "";
    document.getElementById('diet-modal-text').value = "";

    try {
        // Interrogar al backend si ya existe un documento guardado para este atleta
        const res = await fetch(`${API_BASE_URL}/api/admin/diet/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (data.success && data.has_diet) {
            document.getElementById('diet-modal-title').value = data.diet.title || "";
            document.getElementById('diet-modal-text').value = data.diet.menu_text || "";
        }
    } catch(e) { console.error("Error leyendo historial dietético:", e); }

    toggleAdminModal('diet-modal', true);
}

function closeDietModal() { toggleAdminModal('diet-modal', false); }

async function executeSaveDiet() {
    const token = localStorage.getItem('gymen_admin_token');
    const userId = document.getElementById('diet-modal-user-id').value;

    const payload = {
        title: document.getElementById('diet-modal-title').value.trim() || "Planificación Nutricional Esencial",
        menu_text: document.getElementById('diet-modal-text').value.trim()
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/diet/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            closeDietModal();
            showAdminToast("Menú de alimentación publicado en tiempo real.");
        }
    } catch(e) { showAdminToast("Error guardando el plan.", "error"); }
}

async function executeDeleteDiet() {
    const userId = document.getElementById('diet-modal-user-id').value;
    if (!confirm("⚠️ ¿Deseas revocar por completo el plan de dieta actual de este atleta? El recuadro aparecerá vacío.")) return;
    
    const token = localStorage.getItem('gymen_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/diet/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) { closeDietModal(); showAdminToast("Plan nutricional revocado."); }
    } catch(e) {}
}

// Inicialización automática del módulo al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    fetchAllAdminEatsCoreData();
});
