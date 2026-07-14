// 1. Extraer nombre de la tienda del Token JWT para saludar
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// 2. SPA Tab Switching (Menú Lateral)
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

// 3. Lógica del Modal (Abrir/Cerrar fluido)
const modal = document.getElementById('product-modal');
const modalInner = modal ? modal.querySelector('div') : null;

function openModal() {
    if (!modal) return;
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

// 4. Input de Archivo (Estética)
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

// 5. Cerrar Sesión
function logout() {
    localStorage.removeItem('gymenez_partner_token');
    window.location.href = '/store/partner/login.html';
}

// 6. Conexión real con el Backend (Subida de producto y foto)
async function submitProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-prod');
    const originalText = btn.innerText;
    btn.innerText = "Subiendo...";
    btn.disabled = true;

    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const category = document.getElementById('prod-category').value;
    const stock = document.getElementById('prod-stock').value;
    const desc = document.getElementById('prod-desc').value;
    const imageFile = document.getElementById('prod-image').files[0];

    if (!imageFile) {
        alert("Por favor, adjunta una fotografía del producto.");
        btn.innerText = originalText;
        btn.disabled = false;
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('stock', stock);
    formData.append('description', desc);
    formData.append('image', imageFile); 

    try {
        const token = localStorage.getItem('gymenez_partner_token');
        const STORE_API_URL = 'https://sijj2003.pythonanywhere.com/api/store/product';

        const response = await fetch(STORE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            document.getElementById('add-product-form').reset();
            document.getElementById('file-name-display').innerText = 'Seleccionar archivo...';
            closeModal();
            alert("¡Producto publicado exitosamente en el catálogo!");
            loadMyProducts(); 
        } else {
            alert(data.error || "Error al subir producto");
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("Error de conexión con el servidor. Revisa tu consola.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// 7. Cargar el Catálogo de Productos
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
            renderProducts(data.products);
        }
    } catch (error) {
        console.error("Error al cargar el catálogo:", error);
    }
}

// 8. Renderizar la cuadrícula de Productos
function renderProducts(products) {
    const emptyState = document.getElementById('empty-state');
    const grid = document.getElementById('products-grid');

    if (products.length === 0) {
        emptyState.classList.remove('hidden');
        grid.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    
    grid.innerHTML = products.map(p => `
        <div class="glass-panel p-4 rounded-2xl group hover:border-[#FFC300]/50 transition relative flex flex-col">
            <div class="aspect-square bg-[#050508] rounded-xl mb-4 overflow-hidden border border-white/5 shrink-0">
                <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover transition duration-700 group-hover:scale-110">
            </div>
            <div class="flex-1 flex flex-col justify-between">
                <div class="flex justify-between items-start mb-2 gap-2">
                    <div>
                        <h3 class="font-bold text-sm text-white leading-tight mb-1">${p.name}</h3>
                        <p class="text-[9px] text-gray-500 uppercase tracking-widest font-black">${p.category}</p>
                    </div>
                    <span class="bg-[#FFC300]/10 border border-[#FFC300]/20 text-[#FFC300] font-black text-[9px] uppercase px-2 py-1 rounded shrink-0">Stock: ${p.stock}</span>
                </div>
                <div class="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <p class="text-white font-black text-xl">$${p.price_usd.toFixed(2)}</p>
                    <button class="text-[10px] text-gray-400 hover:text-white uppercase tracking-widest font-bold transition flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        Editar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Ejecutar la inicialización apenas inicie el dashboard
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('gymenez_partner_token');
    if (token) {
        const decodedToken = parseJwt(token);
        if (decodedToken && decodedToken.store_name) {
            document.getElementById('store-name-display').innerText = decodedToken.store_name;
        }
        loadMyProducts();
    }
});
