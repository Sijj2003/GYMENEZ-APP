// Memoria Global
window.allProducts = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadStoreCatalog();
    loadPartners();
    setupFiltersAndSearch();
});

// ==========================================
// 1. OBTENER Y RENDERIZAR PARTNERS
// ==========================================
async function loadPartners() {
    const grid = document.getElementById('partners-grid');
    if (!grid) return;

    try {
        const res = await fetch('https://sijj2003.pythonanywhere.com/api/store/partners');
        const data = await res.json();

        if (data.success && data.partners.length > 0) {
            grid.innerHTML = data.partners.map(p => {
                const initial = p.store_name.charAt(0).toUpperCase();
                const logoHtml = p.logo_url 
                    ? `<img src="${p.logo_url}" class="w-full h-full object-cover">`
                    : `<span class="text-xl font-black text-[#FFC300]">${initial}</span>`;

                return `
                <a href="/store/partner_page.html?id=${p.id}" class="flex flex-col items-center gap-2 group flex-shrink-0 cursor-pointer w-20">
                    <div class="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-[#FFC300] to-orange-600 transition-transform duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(255,195,0,0.2)]">
                        <div class="w-full h-full bg-[#030305] rounded-full overflow-hidden flex items-center justify-center border-2 border-[#030305]">
                            ${logoHtml}
                        </div>
                    </div>
                    <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center truncate w-full group-hover:text-white transition">${p.store_name}</span>
                </a>
                `;
            }).join('');
        } else {
            grid.innerHTML = '<span class="text-gray-500 text-[10px] font-bold uppercase">Aún no hay partners visibles.</span>';
        }
    } catch (error) {
        grid.innerHTML = '';
        console.error("Error cargando partners", error);
    }
}

// ==========================================
// 2. CARGAR PRODUCTOS Y MEMORIZARLOS
// ==========================================
async function loadStoreCatalog() {
    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/catalog');
        const data = await response.json();

        if (response.ok && data.success) {
            window.allProducts = data.products; 
            applyCategoryFilter(); 
        } else {
            document.getElementById('catalog-grid').innerHTML = '<p class="col-span-full text-center text-gray-500">Pronto tendremos productos disponibles...</p>';
        }
    } catch (error) {
        document.getElementById('catalog-grid').innerHTML = '<div class="col-span-full text-center py-12"><p class="text-red-500 text-xs font-bold uppercase tracking-widest">Error al conectar con el servidor.</p></div>';
    }
}

// ==========================================
// 3. BUSCADOR INTELIGENTE TIPO AMAZON & CATEGORÍAS
// ==========================================
function setupFiltersAndSearch() {
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    
    // --- LÓGICA DEL BUSCADOR FLOTANTE ---
    if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            
            if (term.length === 0) {
                searchDropdown.classList.add('hidden');
                return;
            }
            
            // Buscar coincidencias en todo el catálogo
            const filtered = window.allProducts.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.store_name.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term)
            );
            
            renderSearchDropdown(filtered, searchDropdown);
        });

        // Mostrar lista de nuevo al hacer clic en el buscador (si ya había texto)
        searchInput.addEventListener('focus', (e) => {
            if (e.target.value.trim().length > 0) {
                searchDropdown.classList.remove('hidden');
            }
        });

        // Ocultar la lista flotante al hacer clic en cualquier parte fuera de ella
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.add('hidden');
            }
        });
    }

    // --- LÓGICA DE BOTONES DE CATEGORÍA ---
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoryBtns.forEach(b => {
                b.classList.remove('bg-white/10', 'text-white', 'border-[#FFC300]');
                b.classList.add('bg-white/5', 'text-gray-300', 'border-white/10');
            });
            const clicked = e.currentTarget;
            clicked.classList.remove('bg-white/5', 'text-gray-300', 'border-white/10');
            clicked.classList.add('bg-white/10', 'text-white', 'border-[#FFC300]');

            currentCategory = clicked.getAttribute('data-category');
            
            const titleSpan = document.querySelector('#catalog-title span');
            if(currentCategory === 'all') titleSpan.innerText = 'Completo';
            else titleSpan.innerText = currentCategory;

            applyCategoryFilter();
        });
    });
}

function applyCategoryFilter() {
    let filtered = window.allProducts;
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    document.getElementById('results-count').innerText = `${filtered.length} Resultados`;
    renderProductsGrid(filtered); // Esto solo actualiza las cuadrículas grandes de abajo
}

// ==========================================
// 4. RENDERIZAR RESULTADOS (Buscador Flotante)
// ==========================================
function renderSearchDropdown(results, container) {
    container.classList.remove('hidden');
    
    if (results.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-gray-500 text-[10px] uppercase font-bold tracking-widest">No encontramos productos similares.</div>`;
        return;
    }

    // Mostramos máximo 8 resultados rápidos para no colapsar la pantalla
    container.innerHTML = results.slice(0, 8).map(p => {
        const discount = p.discount_percentage || 0;
        const finalPrice = discount > 0 ? (p.price_usd * (1 - discount/100)).toFixed(2) : p.price_usd.toFixed(2);
        
        return `
        <a href="/store/product.html?id=${p.id}" class="flex items-center justify-between p-3 hover:bg-white/5 transition border-b border-white/5 last:border-0 cursor-pointer">
            <div class="flex items-center gap-4">
                <img src="${p.image_url}" alt="${p.name}" class="w-12 h-12 object-cover rounded-lg bg-[#050508] border border-white/5 shrink-0">
                <div>
                    <h4 class="text-xs font-bold text-gray-200 truncate max-w-[200px] md:max-w-xs">${p.name}</h4>
                    <p class="text-[9px] text-[#FFC300] uppercase tracking-widest font-black mt-1">${p.store_name || 'Gymenez Partner'}</p>
                </div>
            </div>
            <div class="text-right shrink-0">
                <p class="text-xs font-black text-white">$${finalPrice}</p>
                ${discount > 0 ? `<p class="text-[8px] text-red-500 font-bold uppercase">-${discount}% OFF</p>` : ''}
            </div>
        </a>
        `;
    }).join('');
}

// ==========================================
// 5. RENDERIZAR CUADRÍCULA PRINCIPAL (Para las Categorías)
// ==========================================
function renderProductsGrid(productsToRender) {
    const grid = document.getElementById('catalog-grid');
    
    if (productsToRender.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <span class="text-3xl">🔍</span>
                </div>
                <h3 class="text-xl font-[900] tracking-tighter uppercase italic text-white mb-2">Sin Resultados</h3>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Nuestros partners añadirán productos pronto.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = productsToRender.map(p => {
        const discount = p.discount_percentage || 0;
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (p.price_usd * (1 - discount/100)).toFixed(2) : p.price_usd.toFixed(2);
        
        const storeName = p.store_name || 'Gymenez Partner';
        const isOfficial = storeName.toLowerCase().includes('gymenez');
        const badgeColor = isOfficial ? 'text-[#FFC300]' : 'text-white';

        // Al hacer clic en la tarjeta grande, también lleva a la página de producto
        return `
        <a href="/store/product.html?id=${p.id}" class="glass-panel p-4 rounded-2xl group cursor-pointer relative flex flex-col hover:border-[#FFC300]/50 transition-all">
            <div class="absolute top-6 left-6 z-10 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[8px] font-black uppercase tracking-widest text-gray-300">
                Por <span class="${badgeColor}">${storeName}</span>
            </div>
            
            <div class="aspect-square bg-[#050508] rounded-xl mb-4 overflow-hidden relative border border-white/5">
                <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                ${hasDiscount ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg">-${discount}%</span>` : ''}
                
                <div class="absolute bottom-3 right-3 bg-white/10 backdrop-blur-md border border-white/20 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 group-hover:bg-[#FFC300] group-hover:border-[#FFC300] group-hover:text-black">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </div>
            </div>
            
            <div class="flex-grow">
                <h3 class="font-bold text-sm text-gray-100 leading-tight mb-1 truncate">${p.name}</h3>
                <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-3">${p.category} • ${p.stock > 0 ? 'En Stock' : 'Agotado'}</p>
            </div>
            
            <div class="flex items-center justify-between mt-auto">
                ${hasDiscount 
                    ? `<div class="flex flex-col"><span class="text-xs text-gray-500 line-through leading-none">$${p.price_usd.toFixed(2)}</span><span class="text-[#FFC300] font-black text-lg leading-none mt-1">$${finalPrice}</span></div>` 
                    : `<p class="text-white font-black text-lg">$${finalPrice}</p>`
                }
            </div>
        </a>
        `;
    }).join('');
}
