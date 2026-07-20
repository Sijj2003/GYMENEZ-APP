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
    // Detectamos si estamos en la página de resultados verificando si existe el display de query[cite: 7]
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

    // Usar caché para velocidad instantánea
    const cachedCatalog = sessionStorage.getItem('gymenez_catalog');
    let products = [];
    if (cachedCatalog) {
        products = JSON.parse(cachedCatalog);
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

    let html = results.slice(0, 6).map(item => `
        <a href="/store/product.html?id=${item.id}" class="flex items-center gap-4 p-3 bg-[#0a0a0f] md:bg-transparent rounded-xl hover:bg-white/5 transition border-b border-white/5 md:border-b md:rounded-none md:last:border-0 group">
            <div class="w-14 h-14 rounded-lg bg-white/5 p-1 flex-shrink-0 border border-white/10">
                <img src="${item.image_url || item.imageUrl}" class="w-full h-full object-contain group-hover:scale-110 transition">
            </div>
            <div class="flex-grow min-w-0 pr-2">
                <h4 class="text-sm font-bold text-white truncate">${item.name}</h4>
                <p class="text-[9px] text-[#FFC300] uppercase tracking-widest">${item.store_name || 'Partner Oficial'}</p>
            </div>
            <div class="text-right flex-shrink-0">
                <span class="text-white font-[900] italic text-sm">$${parseFloat(item.price_usd || item.price || 0).toFixed(2)}</span>
            </div>
        </a>
    `).join('');

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
    // Obtener la palabra clave de la URL[cite: 7]
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    const displayEl = document.getElementById('search-query-display');
    const inputInner = document.getElementById('search-input-inner');
    
    if(displayEl) displayEl.innerText = `"${query}"`;
    if(inputInner) inputInner.value = query;

    // Ejecutar búsqueda profunda al servidor[cite: 7]
    fetchAndFilterProducts(query);
    
    // Activar buscador interno de la página[cite: 7]
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

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/catalog');
        const data = await response.json();

        if (response.ok && data.success) {
            const normalizedQuery = normalizeText(query);
            
            // Filtrado ultra-flexible[cite: 7]
            const filteredProducts = data.products.filter(p => {
                const searchString = normalizeText(`${p.name} ${p.store_name} ${p.category} ${p.description}`);
                return searchString.includes(normalizedQuery);
            });

            if(countDisplay) countDisplay.innerText = `${filteredProducts.length} coincidencias encontradas`;
            if(grid) renderDeepResults(filteredProducts, grid);
            
        } else {
            throw new Error('No se pudo cargar el catálogo');
        }
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
        const discount = p.discount_percentage || 0;
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (p.price_usd * (1 - discount/100)).toFixed(2) : p.price_usd.toFixed(2);
        
        const storeName = p.store_name || 'Gymenez Partner';
        const isOfficial = storeName.toLowerCase().includes('gymenez');
        const badgeColor = isOfficial ? 'text-[#FFC300]' : 'text-white';

        return `
        <a href="/store/product.html?id=${p.id}" class="glass-panel p-4 rounded-2xl group cursor-pointer relative flex flex-col hover:border-[#FFC300]/50 transition-all">
            <div class="absolute top-6 left-6 z-10 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[8px] font-black uppercase tracking-widest text-gray-300">
                Por <span class="${badgeColor}">${storeName}</span>
            </div>
            
            <div class="aspect-square bg-[#050508] rounded-xl mb-4 overflow-hidden relative border border-white/5">
                <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                ${hasDiscount ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg">-${discount}%</span>` : ''}
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
