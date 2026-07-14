// Array global para guardar el catálogo en memoria (facilita la edición)
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

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-white/10', 'text-white');
        btn.classList.add('text-gray-400');
        const svg = btn.querySelector('svg');
        if(svg) svg.classList.remove('text-[#FFC300]');
    });

    document.getElementById(tabId).classList.add('active');
    
    element.classList.remove('text-gray-400', 'hover:bg-white/5');
    element.classList.add('bg-white/10', 'text-white');
    const activeSvg = element.querySelector('svg');
    if(activeSvg) activeSvg.classList.add('text-[#FFC300]');
}

// ==========================================
// CONTROL DEL MODAL (CREAR / EDITAR PRODUCTOS)
// ==========================================
const modal = document.getElementById('product-modal');
const modalInner = modal ? modal.querySelector('div') : null;

function openModal() {
    if (!modal) return;
    // Reseteo limpio para el modo "Crear"
    document.getElementById('add-product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('file-name-display').innerText = 'Seleccionar archivo...';
    document.getElementById('btn-save-prod').innerText = 'Guardar Producto';
    document.getElementById('prod-image').required = true; 

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalInner.classList.remove('scale-95');
        modalInner.classList.add('scale-100');
    }, 10);
}

function openEditModal(productId) {
    const product = window.myProducts.find(p => p.id === productId);
    if (!product) return;

    // Llenamos el formulario con los datos en memoria
    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-price').value = product.price_usd;
    document.getElementById('prod-discount').value = product.discount_percentage || 0;
    document.getElementById('prod-category').value = product.category;
    document.getElementById('prod-stock').value = product.stock;
    document.getElementById('prod-desc').value = product.description;
    
    document.getElementById('prod-image').required = false; 
    document.getElementById('file-name-display').innerText = 'Dejar actual o cambiar...';
    document.getElementById('btn-save-prod').innerText = 'Actualizar Producto';

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalInner.classList.remove('scale-95');
        modalInner.classList.add('scale-100');
    }, 10);
}

function closeModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    modalInner.classList.remove('scale-100');
    modalInner.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function updateFileName(input) {
    const display = document.getElementById('file-name-display');
    if (input.files && input.files[0]) {
        display.innerText = input.files[0].name;
        display.classList.remove('text-gray-400');
        display.classList.add('text-white');
    } else {
        display.innerText = 'Seleccionar archivo...';
        display.classList.remove('text-white');
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
    btn.innerText = "Procesando...";
    btn.disabled = true;

    const prodId = document.getElementById('prod-id').value; 
    const imageFile = document.getElementById('prod-image').files[0];

    if (!prodId && !imageFile) {
        alert("Para un nuevo producto, adjunta una fotografía obligatoria.");
        btn.innerText = originalText;
        btn.disabled = false;
        return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('prod-name').value);
    formData.append('price', document.getElementById('prod-price').value);
    formData.append('discount', document.getElementById('prod-discount').value);
    formData.append('category', document.getElementById('prod-category').value);
    formData.append('stock', document.getElementById('prod-stock').value);
    formData.append('description', document.getElementById('prod-desc').value);
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
            alert(data.error || "Error al procesar producto");
        }
    } catch (error) {
        alert("Error de conexión con el servidor.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function deleteProduct(productId) {
    if (!confirm("¿Estás seguro de eliminar este producto? Esta acción es irreversible.")) return;

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
            alert(data.error || "Error al eliminar");
        }
    } catch (error) {
        alert("Error de red al intentar eliminar.");
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
        console.error("Error al cargar el catálogo:", error);
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

        return `
        <div class="glass-panel p-4 rounded-2xl group hover:border-[#FFC300]/50 transition relative flex flex-col">
            ${hasDiscount ? `<span class="absolute top-6 left-6 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg z-10">-${discount}% OFF</span>` : ''}
            
            <div class="aspect-square bg-[#050508] rounded-xl mb-4 overflow-hidden border border-white/5 shrink-0 relative">
                <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover transition duration-700 group-hover:scale-110">
            </div>
            <div class="flex-1 flex flex-col justify-between">
                <div class="flex justify-between items-start mb-2 gap-2">
                    <div>
                        <h3 class="font-bold text-sm text-white leading-tight mb-1 truncate max-w-[150px]">${p.name}</h3>
                        <p class="text-[9px] text-gray-500 uppercase tracking-widest font-black">${p.category}</p>
                    </div>
                    <span class="${p.stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} border font-black text-[9px] uppercase px-2 py-1 rounded shrink-0">Stock: ${p.stock}</span>
                </div>
                
                <div class="mt-2 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                        <p class="text-white font-black text-xl leading-none">$${finalPrice}</p>
                        ${hasDiscount ? `<p class="text-[10px] text-gray-500 font-bold line-through mt-1">$${p.price_usd.toFixed(2)}</p>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openEditModal('${p.id}')" class="text-gray-400 hover:text-[#FFC300] transition bg-white/5 p-2 rounded-lg border border-white/10 hover:border-[#FFC300]/50" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onclick="deleteProduct('${p.id}')" class="text-gray-400 hover:text-red-500 transition bg-white/5 p-2 rounded-lg border border-white/10 hover:border-red-500/50" title="Eliminar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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
const profileModal = document.getElementById('profile-modal');
const profileModalInner = profileModal ? profileModal.querySelector('div') : null;

async function openProfileModal() {
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

    if (file.size > 2 * 1024 * 1024) { // Límite 2MB Front-end
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
            // Guardamos el nuevo Token con la foto actualizada para la sesión
            localStorage.setItem('gymenez_partner_token', data.token);
            
            // Reflejamos los cambios instantáneamente en la pantalla
            logoEl.innerHTML = `<img src="${data.logo_url}" class="w-full h-full object-cover">`;
            headerLogoEl.innerHTML = `<img src="${data.logo_url}" class="w-full h-full object-cover">`;
            
            alert("¡Foto de perfil actualizada exitosamente!");
        } else {
            alert(data.error || "Error al actualizar la foto.");
            openProfileModal(); // Refrescamos el modal para que vuelva a poner la letra/logo anterior
        }
    } catch (error) {
        alert("Error de conexión al subir la imagen.");
        openProfileModal();
    } finally {
        input.value = ''; // Reseteamos el input file
    }
}
// Inicializador modificado para inyectar Logo en el Header y cargar productos
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('gymenez_partner_token');
    if (token) {
        const decodedToken = parseJwt(token);
        if (decodedToken) {
            if(decodedToken.store_name) {
                document.getElementById('store-name-display').innerText = decodedToken.store_name;
                document.getElementById('header-logo').innerText = decodedToken.store_name.charAt(0).toUpperCase();
            }
            if(decodedToken.logo_url) {
                document.getElementById('header-logo').innerHTML = `<img src="${decodedToken.logo_url}" class="w-full h-full object-cover">`;
            }
        }
        loadMyProducts();
    }
});
