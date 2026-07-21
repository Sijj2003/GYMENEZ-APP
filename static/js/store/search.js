// ==========================================
// UTILS GLOBALES
// ==========================================
function normalizeText(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. LÓGICA DE BÚSQUEDA INSTANTÁNEA (NAVBAR Y MÓVIL) ---
    const desktopInput = document.getElementById('search-input');
    const mobileInput = document.getElementById('mobile-search-input');

    // Escuchar el buscador de Desktop
    if (desktopInput) {
        desktopInput.addEventListener('input', (e) => handleInstantSearch(e.target.value, 'desktop'));
        
        // Si el usuario presiona Enter en PC, ir a la página de resultados profundos
        desktopInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = e.target.value.trim();
                if (term) window.location.href = `/store/search.html?q=${encodeURIComponent(term)}`;
            }
        });
        
        // Ocultar dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#search-dropdown') && e.target !== desktopInput) {
                const dropdown = document.getElementById('search-dropdown');
                if(dropdown) dropdown.classList.add('hidden');
            }
        });
    }

    // Escuchar el buscador de Móvil
    if (mobileInput) {
        mobileInput.addEventListener('input', (e) => handleInstantSearch(e.target.value, 'mobile'));
        
        // Si presiona Enter/Ir en el teclado móvil
        mobileInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = e.target.value.trim();
                if (term) window.location.href = `/store/search.html?q=${encodeURIComponent(term)}`;
            }
        });
    }

    // --- 2. LÓGICA DE LA PÁGINA DE RESULTADOS PROFUNDOS (search.html) ---
    const searchQueryDisplay = document.getElementById('search-query-display');
    if (searchQueryDisplay) {
        initDeepSearch();
    }
});

// ==========================================
// MÓDULO A: BÚSQUEDA INSTANTÁNEA (HOME NAVBAR Y MODAL)
// ==========================================
function handleInstantSearch(query, platform) {
    const q = normalizeText(query).trim();
    const resultsContainer = platform === 'desktop' 
        ? document.getElementById('search-dropdown') 
        : document.getElementById('mobile-search-results');

    if (!resultsContainer) return;

    if (q.length < 2) {
        if (platform === 'desktop') {
            resultsContainer.classList.add('hidden');
        } else {
            resultsContainer.innerHTML = `
                <div class="text-center py-20 opacity-50">
                    <svg class="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Empieza a escribir...</p>
                </div>`;
        }
        return;
    }

    // 🕒 VALIDACIÓN INTELIGENTE DE CACHÉ (5 Minutos)
    const rawCache = sessionStorage.getItem('gymenez_catalog');
    let products = [];

    if (rawCache) {
        try {
            const cachedData = JSON.parse(rawCache);
            if (!Array.isArray(cachedData) && cachedData.products && cachedData.timestamp) {
                const now = new Date().getTime();
                const CACHE_LIMIT = 5 * 60 * 1000; // 5 minutos
                
                if (now - cachedData.timestamp < CACHE_LIMIT) {
                    products = cachedData.products; // Usar caché válido
                } else {
                    sessionStorage.removeItem('gymenez_catalog'); // Expiró, limpiar
                }
            }
        } catch (e) {
            console.warn("Caché corrupto, limpiando...");
            sessionStorage.removeItem('gymenez_catalog');
        }
    }

    const filtered = products.filter(p => {
        const searchString = normalizeText(`${p.name} ${p.store_name || ''} ${p.category || ''}`);
        return searchString.includes(q);
    });

    renderInstantResults(filtered, resultsContainer, platform, query);
}

function renderInstantResults(results, container, platform, originalQuery) {
    if (platform === 'desktop') {
        container.classList.remove('hidden');
        container.classList.add('flex');
    }

    if (results.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center">
                <p class="text-[#FFC300] font-bold text-lg mb-1">¡Ups!</p>
                <p class="text-xs text-gray-500 uppercase tracking-widest font-black">No hay coincidencias</p>
            </div>`;
        return;
    }

    let html = results.slice(0, 6).map(item => {
        // Cálculo Robusto de Descuentos
        const price = parseFloat(item.price_usd || item.price || 0);
        const discount = parseInt(item.discount_percentage || item.discount || 0);
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (price * (1 - discount / 100)) : price;

        return `
        <a href="/store/product.html?id=${item.id}" class="flex items-center gap-4 p-3 bg-[#0a0a0f] md:bg-transparent rounded-xl hover:bg-white/5 transition border-b border-white/5 md:border-b md:rounded-none md:last:border-0 group">
            <div class="w-14 h-14 rounded-lg bg-white/5 p-1 flex-shrink-0 border border-white/10 relative">
                <img src="${item.image_url || item.imageUrl}" class="w-full h-full object-contain group-hover:scale-110 transition">
                ${hasDiscount ? `<span class="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-lg">-${discount}%</span>` : ''}
            </div>
            <div class="flex-grow min-w-0 pr-2">
                <h4 class="text-sm font-bold text-white truncate">${item.name}</h4>
                <p class="text-[9px] text-[#FFC300] uppercase tracking-widest truncate">${item.store_name || 'Gymenez Store'}</p>
            </div>
            <div class="text-right flex-shrink-0 flex flex-col items-end justify-center">
                ${hasDiscount ? `<span class="text-[9px] text-gray-500 line-through leading-none mb-0.5">$${price.toFixed(2)}</span>` : ''}
                <span class="${hasDiscount ? 'text-[#FFC300]' : 'text-white'} font-[900] italic text-sm leading-none">$${finalPrice.toFixed(2)}</span>
            </div>
        </a>
        `;
    }).join('');

    // Botón para ir a la página profunda si hay más resultados
    if (results.length > 6) {
        html += `
        <a href="/store/search.html?q=${encodeURIComponent(originalQuery)}" class="block w-full p-3 text-center bg-white/5 hover:bg-[#FFC300] text-[#FFC300] hover:text-black transition text-[10px] font-black uppercase tracking-widest">
            Ver todos los ${results.length} resultados
        </a>
        `;
    }

    container.innerHTML = html;
}

// Control del Modal Móvil (Nativo)
window.toggleMobileSearch = function(show) {
    const modal = document.getElementById('mobile-search-modal');
    const input = document.getElementById('mobile-search-input');
    
    if (!modal) return;

    if (show) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.body.style.overflow = 'hidden'; 
        setTimeout(() => { if(input) input.focus(); }, 150);
    } else {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.body.style.overflow = '';
        if(input) {
            input.value = '';
            handleInstantSearch('', 'mobile');
        }
    }
};

// ==========================================
// MÓDULO B: PÁGINA PROFUNDA DE RESULTADOS (search.html)
// ==========================================
function initDeepSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    const displayEl = document.getElementById('search-query-display');
    const inputInner = document.getElementById('search-input-inner');
    
    if(displayEl) displayEl.innerText = `"${query}"`;
    if(inputInner) inputInner.value = query;

    fetchAndFilterProducts(query);
    setupInnerSearch();
}

async function fetchAndFilterProducts(query) {
    const grid = document.getElementById('results-grid');
    const countDisplay = document.getElementById('search-count');
    
    if (!query.trim()) {
        if(countDisplay) countDisplay.innerText = "Ingresa un término de búsqueda válido.";
        if(grid) grid.innerHTML = '';
        return;
    }

    const normalizedQuery = normalizeText(query);
    let products = [];
    let needsFetch = true;

    // 🕒 VALIDACIÓN INTELIGENTE DE CACHÉ (También en búsqueda profunda)
    const rawCache = sessionStorage.getItem('gymenez_catalog');
    if (rawCache) {
        try {
            const cachedData = JSON.parse(rawCache);
            if (!Array.isArray(cachedData) && cachedData.products && cachedData.timestamp) {
                const now = new Date().getTime();
                if (now - cachedData.timestamp < 5 * 60 * 1000) {
                    products = cachedData.products;
                    needsFetch = false; // El caché es válido, nos ahorramos la petición al backend
                }
            }
        } catch (e) {
            console.warn("Caché corrupto, ignorando...");
        }
    }

    try {
        if (needsFetch) {
            const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/catalog');
            const data = await response.json();

            if (response.ok && data.success) {
                products = data.products;
                // Guardamos el nuevo caché
                sessionStorage.setItem('gymenez_catalog', JSON.stringify({
                    products: products,
                    timestamp: new Date().getTime()
                }));
            } else {
                throw new Error('No se pudo cargar el catálogo');
            }
        }
        
        // Filtramos sobre la data final (ya sea de caché o recién descargada)
        const filteredProducts = products.filter(p => {
            const searchString = normalizeText(`${p.name} ${p.store_name || ''} ${p.category || ''} ${p.description || ''}`);
            return searchString.includes(normalizedQuery);
        });

        if(countDisplay) countDisplay.innerText = `${filteredProducts.length} coincidencias encontradas`;
        if(grid) renderDeepResults(filteredProducts, grid);
        
    } catch (error) {
        if(countDisplay) countDisplay.innerText = "Error en el servidor.";
        if(grid) grid.innerHTML = '<p class="text-red-500">Ocurrió un problema al buscar. Intenta de nuevo.</p>';
    }
}

function renderDeepResults(productsToRender, grid) {
    if (productsToRender.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <span class="text-3xl">📭</span>
                </div>
                <h3 class="text-xl font-[900] tracking-tighter uppercase italic text-white mb-2">No se encontró nada</h3>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Verifica la ortografía o intenta con palabras más cortas.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = productsToRender.map(p => {
        // Cálculo Robusto de Descuentos
        const price = parseFloat(p.price_usd || p.price || 0);
        const discount = parseInt(p.discount_percentage || p.discount || 0);
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (price * (1 - discount / 100)) : price;

        return `
        <a href="/store/product.html?id=${p.id}" class="glass-panel p-4 rounded-2xl group cursor-pointer relative flex flex-col hover:border-[#FFC300]/50 transition-all">
            
            <div class="aspect-square bg-[#050508] rounded-xl mb-4 overflow-hidden relative border border-white/5">
                <img src="${p.image_url || p.imageUrl}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                ${hasDiscount ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg">-${discount}%</span>` : ''}
            </div>
            
            <div class="flex-grow">
                <h3 class="font-bold text-sm text-gray-100 leading-tight mb-1 truncate">${p.name}</h3>
                <p class="text-[10px] text-[#FFC300] uppercase tracking-widest font-black truncate mb-3">${p.store_name || 'Gymenez Store'}</p>
            </div>
            
            <div class="flex items-center justify-between mt-auto">
                <div class="flex flex-col">
                    ${hasDiscount ? `<span class="text-[9px] text-gray-500 line-through leading-none">$${price.toFixed(2)}</span>` : ''}
                    <p class="text-white font-black text-lg leading-none ${hasDiscount ? 'mt-1' : ''}">$${finalPrice.toFixed(2)}</p>
                </div>
                <span class="text-[9px] text-gray-500 uppercase tracking-widest">${p.category}</span>
            </div>
        </a>
        `;
    }).join('');
}

function setupInnerSearch() {
    const input = document.getElementById('search-input-inner');
    const btn = document.getElementById('search-btn-inner');
    
    const goSearch = () => {
        const term = input.value.trim();
        if (term.length > 0) window.location.href = `/store/search.html?q=${encodeURIComponent(term)}`;
    };

    if(input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); goSearch(); }
        });
    }
    if(btn) btn.addEventListener('click', goSearch);
}
