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
// 2. CARGAR PRODUCTOS Y MEMORIZARLOS (Caché con Expiración)
// ==========================================
async function loadStoreCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    // 1. Mostrar Skeletons estructurados con Tailwind mientras verificamos
    grid.innerHTML = renderSkeletons(8);

    // 2. Revisar si tenemos los productos guardados en caché (Session Storage)
    const rawCache = sessionStorage.getItem('gymenez_catalog');

    if (rawCache) {
        try {
            const cachedData = JSON.parse(rawCache);
            // Validamos que tenga la nueva estructura de caché con timestamp
            if (!Array.isArray(cachedData) && cachedData.products && cachedData.timestamp) {
                const now = new Date().getTime();
                const CACHE_LIMIT = 5 * 60 * 1000; // 5 minutos en milisegundos
                
                if (now - cachedData.timestamp < CACHE_LIMIT) {
                    // Si el caché tiene menos de 5 minutos, lo usamos
                    window.allProducts = cachedData.products;
                    applyCategoryFilter();
                    return; // Salimos, no molestamos al backend
                }
            }
        } catch (e) {
            console.warn("Caché corrupto o antiguo, recargando...");
        }
    }

    // 3. Si no hay caché o ya expiró, pedimos al backend
    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/catalog');
        const data = await response.json();

        if (response.ok && data.success) {
            window.allProducts = data.products; 
            
            // Guardamos en la bóveda local incluyendo el timestamp actual
            const cachePayload = {
                products: data.products,
                timestamp: new Date().getTime()
            };
            sessionStorage.setItem('gymenez_catalog', JSON.stringify(cachePayload));
            
            applyCategoryFilter(); 
        } else {
            grid.innerHTML = '<p class="col-span-full text-center text-gray-500">Pronto tendremos productos disponibles...</p>';
        }
    } catch (error) {
        grid.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-red-500 text-xs font-bold uppercase tracking-widest">Error al conectar con el servidor.</p></div>';
    }
}

// Función que genera los Skeletons respetando tu diseño UI exacto en Tailwind
function renderSkeletons(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
        <div class="glass-panel p-4 rounded-2xl relative flex flex-col border border-white/5 animate-pulse">
            <!-- Etiqueta superior -->
            <div class="absolute top-6 left-6 z-10 bg-white/5 w-24 h-4 rounded border border-white/10"></div>
            
            <!-- Imagen (Cuadro grande) -->
            <div class="aspect-square bg-white/5 rounded-xl mb-4 border border-white/5"></div>
            
            <!-- Título y categoría -->
            <div class="flex-grow">
                <div class="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                <div class="h-2 bg-white/5 rounded w-1/2 mb-4"></div>
            </div>
            
            <!-- Precio abajo -->
            <div class="flex items-center justify-between mt-auto">
                <div class="h-6 bg-white/10 rounded w-1/3"></div>
            </div>
        </div>
        `;
    }
    return html;
}

// ==========================================
// 3. BUSCADOR INTELIGENTE TIPO AMAZON & CATEGORÍAS
// ==========================================
function setupFiltersAndSearch() {
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    const searchBtn = document.getElementById('search-btn'); // Botón de la lupa
    
    // Función central para viajar a la página de búsqueda
    const executeSearch = () => {
        if (!searchInput) return;
        const term = searchInput.value.trim();
        if (term.length > 0) {
            window.location.href = `/store/search.html?q=${encodeURIComponent(term)}`;
        }
    };

    if (searchInput && searchDropdown) {
        
        // 1. Disparar búsqueda con la tecla ENTER
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSearch();
            }
        });

        // 2. Disparar búsqueda haciendo clic en la lupa
        if (searchBtn) {
            searchBtn.addEventListener('click', executeSearch);
        }

        // 3. El dropdown en vivo (Letra por letra desde memoria, velocidad extrema)
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (term.length === 0) {
                searchDropdown.classList.add('hidden');
                return;
            }
            const filtered = window.allProducts.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.store_name.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term)
            );
            renderSearchDropdown(filtered, searchDropdown);
        });

        // Mostrar dropdown al enfocar
        searchInput.addEventListener('focus', (e) => {
            if (e.target.value.trim().length > 0) searchDropdown.classList.remove('hidden');
        });

        // Ocultar dropdown al hacer clic fuera
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
    
    const countDisplay = document.getElementById('results-count');
    if (countDisplay) {
        countDisplay.innerText = `${filtered.length} Resultados`;
    }
    
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
// 5. RENDERIZAR CUADRÍCULA PRINCIPAL
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

        // AQUÍ EMPIEZA LA NUEVA TARJETA REDISEÑADA
        return `
        <a href="/store/product.html?id=${p.id}" class="group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#FFC300]/50 transition-all cursor-pointer">
            
            <!-- IMAGEN LIMPIA Y SIN TEXTO -->
            <div class="relative w-full aspect-square overflow-hidden bg-black/50 border-b border-white/5">
                <img src="${p.image_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="${p.name}">
                ${hasDiscount ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg">-${discount}%</span>` : ''}
            </div>
            
            <!-- INFORMACIÓN DEBAJO -->
            <div class="p-4 flex flex-col flex-grow">
                <!-- Título -->
                <h3 class="text-sm md:text-base font-bold text-white mb-1 uppercase tracking-tight truncate">${p.name}</h3>
                
                <!-- Categoría y Unidades -->
                <p class="text-[10px] md:text-xs text-gray-400 mb-2 font-medium capitalize">${p.category} • ${p.stock > 0 ? p.stock + ' unidades' : 'Agotado'}</p>
                
                <!-- Nombre de la Tienda (Estilo Premium y Limpio) -->
                <span class="text-[10px] font-black uppercase tracking-widest text-[#FFC300] mt-auto">${storeName}</span>
                
                <!-- Precio y Botón -->
                <div class="flex items-center justify-between mt-4 border-t border-white/5 pt-3">
                    ${hasDiscount 
                        ? `<div class="flex flex-col"><span class="text-xs text-gray-500 line-through leading-none">$${p.price_usd.toFixed(2)}</span><span class="text-white font-black text-sm md:text-base leading-none mt-1">$${finalPrice}</span></div>` 
                        : `<span class="text-sm md:text-base font-black text-white">$${finalPrice}</span>`
                    }
                    <div class="bg-white/10 p-2 rounded-full text-white group-hover:bg-[#FFC300] group-hover:text-black transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </div>
                </div>
            </div>
        </a>
        `;
    }).join('');
}
