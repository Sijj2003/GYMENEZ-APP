// Array global para guardar el catálogo en memoria
window.myProducts = [];
let activeVariants = []; // Memoria temporal para el constructor de variantes

// Conversor automático de tallas de zapatos US -> EUR
const shoeSizeMap = {
    "6": "39", "6.5": "39.5", "7": "40", "7.5": "40.5", "8": "41", 
    "8.5": "42", "9": "42.5", "9.5": "43", "10": "44", "10.5": "44.5", 
    "11": "45", "11.5": "45.5", "12": "46", "13": "47", "14": "48"
};

// ==========================================
// UTILIDADES & AUTENTICACIÓN
// ==========================================
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { return null; }
}

function logout() {
    localStorage.removeItem('gymenez_partner_token');
    window.location.href = '/store/partner/login.html';
}

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-white/5', 'text-white', 'border-white/5');
        btn.classList.add('text-gray-500', 'border-transparent');
        const svg = btn.querySelector('svg');
        if(svg && !btn.querySelector('span.bg-red-500')) svg.classList.remove('text-[#FFC300]');
    });
    document.getElementById(tabId).classList.add('active');
    element.classList.remove('text-gray-500', 'border-transparent');
    element.classList.add('bg-white/5', 'text-white', 'border-white/5');
    const activeSvg = element.querySelector('svg');
    if(activeSvg && !element.querySelector('span.bg-red-500')) activeSvg.classList.add('text-[#FFC300]');
}

function switchTabMobile(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-[#FFC300]');
        btn.classList.add('text-gray-500');
    });
    document.getElementById(tabId).classList.add('active');
    element.classList.remove('text-gray-500');
    element.classList.add('text-[#FFC300]');
}

// ==========================================
// CONSTRUCTOR INTELIGENTE DE VARIANTES
// ==========================================
function toggleVariantFields() {
    const category = document.getElementById('prod-category').value;
    const masterContainer = document.getElementById('variants-master-container');
    const controlsContainer = document.getElementById('variant-builder-controls');
    
    // Reseteamos las variantes si cambiamos de categoría
    activeVariants = []; 
    renderVariantsList();

    if (category === 'general') {
        masterContainer.classList.add('hidden');
        document.getElementById('prod-stock').readOnly = false;
        document.getElementById('stock-helper').classList.add('hidden');
        return;
    }

    // Activamos la matriz
    masterContainer.classList.remove('hidden');
    document.getElementById('prod-stock').readOnly = true; // El stock será matemático
    document.getElementById('stock-helper').classList.remove('hidden');

    let html = '';
    if (category === 'suplementos') {
        html = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div class="md:col-span-1">
                    <label class="block text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Sabor</label>
                    <select id="builder-flavor" onchange="checkCustomFlavor()" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer">
                        <option value="Sin Sabor / Natural">Sin Sabor (Natural)</option>
                        <option value="Chocolate">Chocolate</option>
                        <option value="Vainilla">Vainilla</option>
                        <option value="Fresa">Fresa</option>
                        <option value="Cookies & Cream">Cookies & Cream</option>
                        <option value="custom">Otro (Especificar) ✍️</option>
                    </select>
                    <input type="text" id="builder-flavor-custom" class="hidden mt-2 w-full bg-[#12121a] border border-blue-500/50 rounded-xl px-4 py-2 text-sm font-bold text-white" placeholder="Ej: Ponche de Frutas">
                </div>
                <div class="md:col-span-1">
                    <label class="block text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Tamaño / Serv.</label>
                    <input type="text" id="builder-size" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500" placeholder="Ej: 5 Lbs ó 30 Serv">
                </div>
                <div class="md:col-span-1">
                    <label class="block text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">Stock Unidades</label>
                    <input type="number" id="builder-stock" min="1" value="1" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500">
                </div>
                <div class="md:col-span-1">
                    <button type="button" onclick="addVariant('suplemento')" class="w-full bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-blue-500 transition shadow-lg">Añadir Variante</button>
                </div>
            </div>
        `;
    } else if (category === 'ropa') {
        html = `
            <div class="mb-4">
                <label class="block text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Sub-Tipo de Indumentaria</label>
                <div class="flex gap-2">
                    <button type="button" onclick="setApparelType('superior')" id="btn-type-sup" class="apparel-type-btn active flex-1 bg-blue-500/20 border border-blue-500 text-blue-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition">Superior (Franelas...)</button>
                    <button type="button" onclick="setApparelType('inferior')" id="btn-type-inf" class="apparel-type-btn flex-1 bg-[#12121a] border border-white/10 text-gray-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition">Inferior (Shorts...)</button>
                    <button type="button" onclick="setApparelType('calzado')" id="btn-type-cal" class="apparel-type-btn flex-1 bg-[#12121a] border border-white/10 text-gray-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition">Calzado Zapatos</button>
                </div>
                <input type="hidden" id="builder-apparel-type" value="superior">
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" id="apparel-inputs-container">
                <!-- Se inyecta dinámicamente -->
            </div>
        `;
    }
    controlsContainer.innerHTML = html;
    if (category === 'ropa') setApparelType('superior'); // Inicializar inputs de ropa
}

function checkCustomFlavor() {
    const select = document.getElementById('builder-flavor');
    const customInput = document.getElementById('builder-flavor-custom');
    if(select.value === 'custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = '';
    }
}

// Cambiar la vista dependiendo de qué tipo de ropa es
function setApparelType(type) {
    document.getElementById('builder-apparel-type').value = type;
    
    // Cambiar estilos de botones
    document.querySelectorAll('.apparel-type-btn').forEach(btn => {
        btn.className = 'apparel-type-btn flex-1 bg-[#12121a] border border-white/10 text-gray-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition hover:border-white/30';
    });
    const activeBtn = type === 'superior' ? 'btn-type-sup' : (type === 'inferior' ? 'btn-type-inf' : 'btn-type-cal');
    document.getElementById(activeBtn).className = 'apparel-type-btn flex-1 bg-blue-500/20 border border-blue-500 text-blue-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition';

    const container = document.getElementById('apparel-inputs-container');
    
    if (type === 'calzado') {
        // Generar opciones US Auto-EU
        let shoeOptions = '<option value="">Selecciona Talla US</option>';
        for (let us in shoeSizeMap) {
            shoeOptions += `<option value="${us}">US ${us} (EUR ${shoeSizeMap[us]})</option>`;
        }
        
        container.innerHTML = `
            <div class="md:col-span-1">
                <label class="block text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Talla (Calzado)</label>
                <select id="builder-size" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer">
                    ${shoeOptions}
                </select>
            </div>
            <div class="md:col-span-1">
                <label class="block text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Color</label>
                <input type="text" id="builder-color" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500" placeholder="Ej: Negro, Blanco">
            </div>
            <div class="md:col-span-1">
                <label class="block text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">Stock Unidades</label>
                <input type="number" id="builder-stock" min="1" value="1" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500">
            </div>
            <div class="md:col-span-1">
                <button type="button" onclick="addVariant('calzado')" class="w-full bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-blue-500 transition shadow-lg">Añadir Talla</button>
            </div>
        `;
    } else {
        // Superior e Inferior
        let placeholder = type === 'superior' ? "Ej: S, M, L, XL" : "Ej: 28, 30, 32, S, M";
        container.innerHTML = `
            <div class="md:col-span-1">
                <label class="block text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Talla</label>
                <input type="text" id="builder-size" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 uppercase" placeholder="${placeholder}">
            </div>
            <div class="md:col-span-1">
                <label class="block text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Color</label>
                <input type="text" id="builder-color" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 capitalize" placeholder="Ej: Negro, Azul">
            </div>
            <div class="md:col-span-1">
                <label class="block text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">Stock Unidades</label>
                <input type="number" id="builder-stock" min="1" value="1" class="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500">
            </div>
            <div class="md:col-span-1">
                <button type="button" onclick="addVariant('ropa')" class="w-full bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-blue-500 transition shadow-lg">Añadir Variante</button>
            </div>
        `;
    }
}

function addVariant(type) {
    let name = '';
    const stock = parseInt(document.getElementById('builder-stock').value) || 0;

    if (stock < 1) { alert("El stock de la variante debe ser mínimo 1."); return; }

    if (type === 'suplemento') {
        const selectFlavor = document.getElementById('builder-flavor').value;
        const flavor = selectFlavor === 'custom' ? document.getElementById('builder-flavor-custom').value : selectFlavor;
        const size = document.getElementById('builder-size').value;
        if (!flavor || !size) { alert("Completa el Sabor y el Tamaño."); return; }
        name = `${flavor} - ${size}`;
    } 
    else if (type === 'calzado') {
        const usSize = document.getElementById('builder-size').value;
        const color = document.getElementById('builder-color').value;
        if (!usSize || !color) { alert("Selecciona la Talla US y el Color."); return; }
        name = `Talla US ${usSize} (EUR ${shoeSizeMap[usSize]}) - ${color}`;
    } 
    else if (type === 'ropa') {
        const size = document.getElementById('builder-size').value;
        const color = document.getElementById('builder-color').value;
        if (!size || !color) { alert("Completa la Talla y el Color."); return; }
        name = `Talla ${size.toUpperCase()} - ${color}`;
    }

    // Verificar que no exista una variante idéntica
    const exists = activeVariants.find(v => v.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        exists.stock += stock; // Si existe, suma el stock
    } else {
        activeVariants.push({ name: name, stock: stock, type: type });
    }

    renderVariantsList();
    
    // Limpiar inputs pero mantener el foco ágil
    if(document.getElementById('builder-size')) document.getElementById('builder-size').value = '';
    if(document.getElementById('builder-stock')) document.getElementById('builder-stock').value = '1';
}

function removeVariant(index) {
    activeVariants.splice(index, 1);
    renderVariantsList();
}

function renderVariantsList() {
    const listEl = document.getElementById('variants-list');
    const globalStockEl = document.getElementById('prod-stock');

    if (activeVariants.length === 0) {
        listEl.innerHTML = `<div class="text-center py-6 border border-dashed border-white/10 rounded-xl"><p class="text-xs font-bold text-gray-500">Agrega variantes arriba para armar tu stock.</p></div>`;
        globalStockEl.value = '';
        return;
    }

    let totalStock = 0;
    let html = '';
    
    activeVariants.forEach((v, index) => {
        totalStock += v.stock;
        html += `
            <div class="flex items-center justify-between bg-[#0a0a0f] border border-white/5 p-3 rounded-xl mb-2">
                <div class="flex items-center gap-3">
                    <span class="bg-blue-500/20 text-blue-400 font-black text-[9px] uppercase px-2 py-1 rounded border border-blue-500/30">V-${index+1}</span>
                    <span class="text-sm font-bold text-white">${v.name}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Stock: ${v.stock}</span>
                    <button type="button" onclick="removeVariant(${index})" class="text-gray-500 hover:text-red-500 transition">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
    globalStockEl.value = totalStock; // El stock global se actualiza solo
}

// ==========================================
// CONTROL DEL MODAL (AQUÍ ESTÁ LA CORRECCIÓN)
// ==========================================
let modal;
let modalInner;

function initModals() {
    modal = document.getElementById('product-modal');
    modalInner = modal ? modal.querySelector('div') : null;
}

function openModal() {
    if (!modal) initModals(); // Aseguramos que exista
    if (!modal) return;
    
    document.getElementById('add-product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('file-name-display').innerText = 'Tocar para subir JPG o PNG...';
    document.getElementById('btn-save-prod').innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg> Publicar Producto';
    document.getElementById('prod-image').required = true; 
    
    document.getElementById('prod-category').value = 'general';
    toggleVariantFields(); // Limpia la memoria temporal

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if(window.innerWidth < 768) modalInner.classList.remove('translate-y-full');
        else modalInner.classList.remove('scale-95');
    }, 10);
}

function closeModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    if(window.innerWidth < 768) modalInner.classList.add('translate-y-full');
    else modalInner.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 400);
}

function updateFileName(input) {
    const display = document.getElementById('file-name-display');
    if (input.files && input.files[0]) {
        display.innerText = input.files[0].name;
        display.classList.remove('text-gray-400');
        display.classList.add('text-emerald-400');
    } else {
        display.innerText = 'Tocar para subir JPG o PNG...';
        display.classList.remove('text-emerald-400');
        display.classList.add('text-gray-400');
    }
}

// ==========================================
// ENVÍO DE DATOS AL BACKEND (Seguridad & Peso)
// ==========================================
async function submitProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-prod');
    const originalText = btn.innerHTML;
    
    // 1. Validaciones Críticas de Negocio
    const weight = parseFloat(document.getElementById('prod-weight').value);
    if (isNaN(weight) || weight < 0.5 || weight > 50) {
        alert("⚠️ REGULACIÓN MRW/ZOOM:\nEl peso logístico debe estar entre 0.5 Kg y 50 Kg.");
        document.getElementById('prod-weight').focus();
        return;
    }

    const category = document.getElementById('prod-category').value;
    if (category !== 'general' && activeVariants.length === 0) {
        alert("⚠️ MATRIZ VACÍA:\nElegiste un producto con Variantes, pero no has añadido ninguna a la lista. Añade al menos una talla o sabor.");
        return;
    }

    const stockFinal = parseInt(document.getElementById('prod-stock').value);
    if (isNaN(stockFinal) || stockFinal < 1) {
        alert("⚠️ INVENTARIO CERO:\nNo puedes publicar un producto sin stock disponible.");
        return;
    }

    const prodId = document.getElementById('prod-id').value; 
    const imageFile = document.getElementById('prod-image').files[0];

    if (!prodId && !imageFile) {
        alert("⚠️ OBLIGATORIO: Debes subir una fotografía oficial HD del producto.");
        return;
    }

    btn.innerHTML = '<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('name', document.getElementById('prod-name').value);
    formData.append('price', document.getElementById('prod-price').value);
    formData.append('discount', document.getElementById('prod-discount').value);
    formData.append('category', category);
    formData.append('stock', stockFinal);
    formData.append('weight_kg', weight); 
    formData.append('description', document.getElementById('prod-desc').value);
    
    // Si hay variantes, se envían como JSON stringificado
    if (activeVariants.length > 0) {
        formData.append('variants_matrix', JSON.stringify(activeVariants));
    }
    
    if (imageFile) formData.append('image', imageFile); 

    try {
        const token = localStorage.getItem('gymenez_partner_token');
        const method = prodId ? 'PUT' : 'POST';
        const urlEnd = prodId ? `/${prodId}` : '';
        const STORE_API_URL = `https://sijj2003.pythonanywhere.com/api/store/product${urlEnd}`;

        const response = await fetch(STORE_API_URL, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            closeModal();
            loadMyProducts(); 
        } else {
            alert(data.error || "Auditoría rechazó el producto. Verifica los datos.");
        }
    } catch (error) {
        alert("Fallo de comunicación con Gymenez Core.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteProduct(productId) {
    if (!confirm("⚠️ ALERTA DE PLATAFORMA:\n¿Deseas eliminar este producto de forma irreversible?")) return;

    try {
        const token = localStorage.getItem('gymenez_partner_token');
        const response = await fetch(`https://sijj2003.pythonanywhere.com/api/store/product/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (response.ok && data.success) {
            loadMyProducts(); 
        } else {
            alert(data.error || "Denegado por el servidor.");
        }
    } catch (error) {
        alert("Fallo de red crítico.");
    }
}

// ==========================================
// RENDERIZAR PRODUCTOS EXISTENTES
// ==========================================
async function loadMyProducts() {
    const token = localStorage.getItem('gymenez_partner_token');
    const URL = 'https://sijj2003.pythonanywhere.com/api/store/partner/products';
    try {
        const response = await fetch(URL, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (response.ok && data.success) {
            window.myProducts = data.products; 
            renderProducts(data.products);
        }
    } catch (error) { console.error(error); }
}

function renderProducts(products) {
    const emptyState = document.getElementById('empty-state');
    const grid = document.getElementById('products-grid');

    if (products.length === 0) {
        emptyState.classList.remove('hidden');
        grid.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    
    grid.innerHTML = products.map(p => {
        const discount = p.discount_percentage || 0;
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (p.price_usd * (1 - discount/100)).toFixed(2) : p.price_usd.toFixed(2);
        
        let tagsHtml = `<span class="bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded mr-1">${p.weight_kg || 1} Kg</span>`;
        if (p.variants_matrix) {
            tagsHtml += `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded">Matriz Activa</span>`;
        }

        return `
        <div class="bg-[#12121a] p-5 rounded-[2rem] border border-white/5 group hover:border-[#FFC300]/50 transition-all duration-300 relative flex flex-col shadow-xl">
            ${hasDiscount ? `<span class="absolute top-8 left-8 bg-red-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg z-10">-${discount}% OFF</span>` : ''}
            
            <div class="aspect-square bg-[#0a0a0f] rounded-2xl mb-4 overflow-hidden border border-white/5 shrink-0 relative flex items-center justify-center p-4">
                <img src="${p.image_url}" alt="${p.name}" class="max-h-full object-contain filter drop-shadow-xl transition-transform duration-700 group-hover:scale-110 group-hover:-translate-y-2">
            </div>
            
            <div class="flex-1 flex flex-col justify-between">
                <div class="mb-4">
                    <div class="flex justify-between items-start mb-2 gap-2">
                        <h3 class="font-[900] text-sm md:text-base text-white leading-tight mb-1 truncate max-w-[180px]">${p.name}</h3>
                        <span class="${p.stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} border font-black text-[9px] uppercase px-2 py-1 rounded shrink-0 shadow-sm">Stock: ${p.stock}</span>
                    </div>
                    <div class="flex items-center mt-1">
                        <p class="text-[9px] text-gray-500 uppercase tracking-widest font-black mr-2">${p.category}</p>
                        ${tagsHtml}
                    </div>
                </div>
                
                <div class="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                        <p class="text-white font-[900] text-2xl italic leading-none">$${finalPrice}</p>
                        ${hasDiscount ? `<p class="text-[10px] text-gray-500 font-bold line-through mt-1">$${p.price_usd.toFixed(2)}</p>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="deleteProduct('${p.id}')" class="text-gray-400 hover:text-red-500 transition bg-white/5 p-3 rounded-xl border border-white/5 hover:border-red-500/50 hover:bg-red-500/10" title="Retirar de Plataforma">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// ==========================================
// NUEVA LÓGICA DEL PERFIL DE LA TIENDA
// ==========================================
let profileModal, profileModalInner;

async function openProfileModal() {
    profileModal = document.getElementById('profile-modal');
    profileModalInner = profileModal ? profileModal.querySelector('div') : null;
    if (!profileModal) return;

    profileModal.classList.remove('hidden');
    setTimeout(() => {
        profileModal.classList.remove('opacity-0');
        profileModalInner.classList.remove('scale-95');
        profileModalInner.classList.add('scale-100');
    }, 10);

    try {
        const token = localStorage.getItem('gymenez_partner_token');
        const res = await fetch('https://sijj2003.pythonanywhere.com/api/partner/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (res.ok && data.success) {
            const p = data.profile;
            document.getElementById('prof-name').value = p.store_name || 'No definido';
            document.getElementById('prof-doc').value = `${p.doc_type || 'V'}-${p.doc_number || ''}`;
            document.getElementById('prof-phone').value = p.phone || 'No definido';
            document.getElementById('prof-email').value = p.email || 'No definido';

            const logoEl = document.getElementById('modal-profile-logo');
            if (p.logo_url) {
                logoEl.innerHTML = `<img src="${p.logo_url}" class="w-full h-full object-cover">`;
            } else {
                logoEl.innerHTML = p.store_name ? p.store_name.charAt(0).toUpperCase() : 'P';
            }
        }
    } catch (error) {
        console.error('Error cargando perfil:', error);
    }
}

function closeProfileModal() {
    if (!profileModal) return;
    profileModal.classList.add('opacity-0');
    profileModalInner.classList.remove('scale-100');
    profileModalInner.classList.add('scale-95');
    setTimeout(() => { profileModal.classList.add('hidden'); }, 300);
}

// ==========================================
// SUBIR NUEVO LOGO CON RESTRICCIONES
// ==========================================
async function uploadNewLogo(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { 
        alert("La imagen es demasiado pesada (Máximo 2MB).");
        return;
    }

    const logoEl = document.getElementById('modal-profile-logo');
    const headerLogoEl = document.getElementById('header-logo');
    logoEl.innerHTML = `<span class="animate-pulse text-[9px] uppercase tracking-widest text-white">Subiendo...</span>`;

    const token = localStorage.getItem('gymenez_partner_token');
    const formData = new FormData();
    formData.append('logo', file);

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/partner/profile/logo', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('gymenez_partner_token', data.token);
            
            logoEl.innerHTML = `<img src="${data.logo_url}" class="w-full h-full object-cover">`;
            if (headerLogoEl) headerLogoEl.innerHTML = `<img src="${data.logo_url}" class="w-full h-full object-cover">`;
            
            alert("¡Foto de perfil actualizada exitosamente!");
        } else {
            alert(data.error || "Error al actualizar la foto.");
            openProfileModal(); 
        }
    } catch (error) {
        alert("Error de conexión al subir la imagen.");
        openProfileModal();
    } finally {
        input.value = ''; 
    }
}

// ==========================================
// INICIALIZADOR
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initModals();
    const token = localStorage.getItem('gymenez_partner_token');
    if (token) {
        const decodedToken = parseJwt(token);
        if (decodedToken) {
            if(decodedToken.store_name) {
                document.getElementById('store-name-display').innerText = decodedToken.store_name;
                const headerLogoEl = document.getElementById('header-logo');
                if (headerLogoEl) headerLogoEl.innerText = decodedToken.store_name.charAt(0).toUpperCase();
            }
            if(decodedToken.logo_url) {
                const headerLogoEl = document.getElementById('header-logo');
                if(headerLogoEl) headerLogoEl.innerHTML = `<img src="${decodedToken.logo_url}" class="w-full h-full object-cover">`;
            }
        }
        loadMyProducts();
    }
});
