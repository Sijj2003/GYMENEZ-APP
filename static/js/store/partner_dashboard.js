// Array global para guardar el catálogo en memoria
window.myProducts = [];

// ==========================================
// UTILIDADES & AUTENTICACIÓN
// ==========================================
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { return null; }
}

function logout() {
    localStorage.removeItem('gymenez_partner_token');
    window.location.href = '/store/partner/login.html';
}

// Navegación Desktop
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

// Navegación Mobile
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
// CONSTRUCTOR DE VARIANTES (INTELIGENCIA UI)
// ==========================================
function toggleVariantFields() {
    const category = document.getElementById('prod-category').value;
    const suppPanel = document.getElementById('variants-supplements');
    const appPanel = document.getElementById('variants-apparel');

    suppPanel.classList.add('hidden');
    appPanel.classList.add('hidden');

    if (category === 'suplementos') {
        suppPanel.classList.remove('hidden');
        suppPanel.classList.add('grid');
    } else if (category === 'ropa') {
        appPanel.classList.remove('hidden');
        appPanel.classList.add('grid');
    }
}

// ==========================================
// CONTROL DEL MODAL (CREAR / EDITAR PRODUCTOS)
// ==========================================
const modal = document.getElementById('product-modal');
const modalInner = modal ? modal.querySelector('div') : null;

function openModal() {
    if (!modal) return;
    document.getElementById('add-product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('file-name-display').innerText = 'Tocar para subir JPG o PNG...';
    document.getElementById('btn-save-prod').innerText = 'Publicar Producto';
    document.getElementById('prod-image').required = true; 
    
    toggleVariantFields(); // Resetear las variantes

    modal.classList.remove('hidden');
    // Animación fluida de entrada (Desde abajo)
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if(window.innerWidth < 768) {
            modalInner.classList.remove('translate-y-full');
        } else {
            modalInner.classList.remove('scale-95');
        }
    }, 10);
}

function openEditModal(productId) {
    const product = window.myProducts.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-price').value = product.price_usd;
    document.getElementById('prod-discount').value = product.discount_percentage || 0;
    document.getElementById('prod-stock').value = product.stock;
    document.getElementById('prod-weight').value = product.weight_kg || 1.0;
    document.getElementById('prod-desc').value = product.description;
    
    // Configurar Variantes
    document.getElementById('prod-category').value = product.category || 'general';
    toggleVariantFields();
    
    if (product.variants) {
        try {
            const v = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants;
            if (product.category === 'suplementos') {
                document.getElementById('var-flavors').value = v.flavors ? v.flavors.join(', ') : '';
                document.getElementById('var-sizes-supp').value = v.sizes ? v.sizes.join(', ') : '';
            } else if (product.category === 'ropa') {
                document.getElementById('var-sizes-apparel').value = v.sizes ? v.sizes.join(', ') : '';
                document.getElementById('var-colors').value = v.colors ? v.colors.join(', ') : '';
            }
        } catch(e) { console.error("Error parseando variantes"); }
    }

    document.getElementById('prod-image').required = false; 
    document.getElementById('file-name-display').innerText = 'Dejar imagen actual o cambiar...';
    document.getElementById('btn-save-prod').innerText = 'Actualizar Producto';

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if(window.innerWidth < 768) {
            modalInner.classList.remove('translate-y-full');
        } else {
            modalInner.classList.remove('scale-95');
        }
    }, 10);
}

function closeModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    if(window.innerWidth < 768) {
        modalInner.classList.add('translate-y-full');
    } else {
        modalInner.classList.add('scale-95');
    }
    setTimeout(() => { modal.classList.add('hidden'); }, 400);
}

function updateFileName(input) {
    const display = document.getElementById('file-name-display');
    if (input.files && input.files[0]) {
        display.innerText = input.files[0].name;
        display.classList.remove('text-gray-400');
        display.classList.add('text-emerald-400'); // Toque de éxito
    } else {
        display.innerText = 'Tocar para subir JPG o PNG...';
        display.classList.remove('text-emerald-400');
        display.classList.add('text-gray-400');
    }
}

// ==========================================
// CRUD OPERACIONES (API CALLS PRODUCTOS)
// ==========================================
async function submitProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-prod');
    const originalText = btn.innerText;
    btn.innerHTML = '<span class="animate-pulse">Sincronizando...</span>';
    btn.disabled = true;

    const prodId = document.getElementById('prod-id').value; 
    const imageFile = document.getElementById('prod-image').files[0];
    const category = document.getElementById('prod-category').value;

    if (!prodId && !imageFile) {
        alert("¡Alto! Para publicar un nuevo producto debes subir una fotografía oficial.");
        btn.innerText = originalText;
        btn.disabled = false;
        return;
    }

    // Armar el Objeto de Variantes (Inteligencia Backend)
    let variantsObj = {};
    if (category === 'suplementos') {
        const flavors = document.getElementById('var-flavors').value.split(',').map(s=>s.trim()).filter(Boolean);
        const sizes = document.getElementById('var-sizes-supp').value.split(',').map(s=>s.trim()).filter(Boolean);
        if (flavors.length) variantsObj.flavors = flavors;
        if (sizes.length) variantsObj.sizes = sizes;
    } else if (category === 'ropa') {
        const sizes = document.getElementById('var-sizes-apparel').value.split(',').map(s=>s.trim()).filter(Boolean);
        const colors = document.getElementById('var-colors').value.split(',').map(s=>s.trim()).filter(Boolean);
        if (sizes.length) variantsObj.sizes = sizes;
        if (colors.length) variantsObj.colors = colors;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('prod-name').value);
    formData.append('price', document.getElementById('prod-price').value);
    formData.append('discount', document.getElementById('prod-discount').value);
    formData.append('category', category);
    formData.append('stock', document.getElementById('prod-stock').value);
    formData.append('weight_kg', document.getElementById('prod-weight').value); // NUEVO
    formData.append('description', document.getElementById('prod-desc').value);
    formData.append('variants', JSON.stringify(variantsObj)); // NUEVO
    
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
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function deleteProduct(productId) {
    if (!confirm("⚠️ ALERTA: ¿Deseas eliminar este producto de la plataforma permanentemente?")) return;

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
            alert(data.error || "Denegado por servidor.");
        }
    } catch (error) {
        alert("Fallo de red crítico.");
    }
}

// ==========================================
// OBTENER Y RENDERIZAR PRODUCTOS
// ==========================================
async function loadMyProducts() {
    const token = localStorage.getItem('gymenez_partner_token');
    const URL = 'https://sijj2003.pythonanywhere.com/api/store/partner/products';
    
    try {
        const response = await fetch(URL, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            window.myProducts = data.products; 
            renderProducts(data.products);
        }
    } catch (error) {
        console.error("Error al cargar inventario:", error);
    }
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
        
        // Parsear variantes para mostrar etiquetas en la tarjeta
        let tagsHtml = '';
        if (p.variants) {
            try {
                const v = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
                if (v.flavors || v.colors) {
                    tagsHtml += `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded mr-1">Con Variantes</span>`;
                }
            } catch(e){}
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
                        <button onclick="openEditModal('${p.id}')" class="text-gray-400 hover:text-[#FFC300] transition bg-white/5 p-3 rounded-xl border border-white/5 hover:border-[#FFC300]/50 hover:bg-[#FFC300]/10" title="Editar Configuraciones">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
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

// (La lógica del perfil se mantiene igual, ya está correcta en tu código)
// ==========================================
// INICIALIZADOR DE PERFIL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
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
