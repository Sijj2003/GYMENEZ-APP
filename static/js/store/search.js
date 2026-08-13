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
    let resultsContainer = null;
    
    if (platform === 'desktop') resultsContainer = document.getElementById('search-dropdown');
    else if (platform === 'desktop-inner') resultsContainer = document.getElementById('search-dropdown-inner');
    else resultsContainer = document.getElementById('mobile-search-results');

    if (!resultsContainer) return;

    if (q.length < 2) {
        if (platform === 'desktop' || platform === 'desktop-inner') {
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

    let products = (window.allProducts && window.allProducts.length > 0) ? window.allProducts : [];

    if (products.length === 0) {
        const rawCache = sessionStorage.getItem('gymenez_catalog');
        if (rawCache) {
            try {
                const cachedData = JSON.parse(rawCache);
                if (cachedData && cachedData.products) {
                    products = cachedData.products;
                    window.allProducts = products; 
                }
            } catch (e) { console.warn("Caché ignorado"); }
        }
    }

    // 🍎 MAGIA DE TOKENIZACIÓN (Busca sin importar el orden de las palabras)
    const queryWords = q.split(/\s+/); // Separamos la búsqueda por espacios
    
    const filtered = products.filter(p => {
        const searchString = normalizeText(`${p.name} ${p.store_name || ''} ${p.category || ''}`);
        // Verificamos que TODAS las palabras buscadas estén dentro del string del producto
        return queryWords.every(word => searchString.includes(word));
    });

    renderInstantResults(filtered, resultsContainer, platform, query);
}

function renderInstantResults(results, container, platform, originalQuery) {
    if (platform === 'desktop' || platform === 'desktop-inner') {
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
        const price = parseFloat(item.price_usd || item.price || 0);
        const discount = parseInt(item.discount_percentage || item.discount || 0);
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (price * (1 - discount / 100)) : price;

        const isOnDemand = (item.is_on_demand === true || item.is_on_demand === 'true' || item.is_on_demand === 'True');
        const hasFreeShipping = (item.free_shipping === true || item.free_shipping === 'true' || item.free_shipping === 'True');

        return `
        <a href="/store/product.html?id=${item.id}" class="flex items-center gap-4 p-3 bg-[#0a0a0f] md:bg-transparent rounded-xl hover:bg-white/5 transition border-b border-white/5 md:border-b md:rounded-none md:last:border-0 group">
            <div class="w-14 h-14 rounded-lg bg-white/5 p-1 flex-shrink-0 border border-white/10 relative">
                <img src="${item.image_url || item.imageUrl}" class="w-full h-full object-contain group-hover:scale-110 transition">
                ${hasDiscount ? `<span class="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-lg">-${discount}%</span>` : ''}
            </div>
            <div class="flex-grow min-w-0 pr-2">
                <h4 class="text-sm font-bold text-white truncate">${item.name}</h4>
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span class="text-[9px] text-[#FFC300] uppercase tracking-widest truncate font-black">${item.store_name || 'Gymenez Store'}</span>
                    ${hasFreeShipping ? `<span class="text-[7px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-black uppercase">🚚 Envío Gratis</span>` : ''}
                </div>
            </div>
            <div class="text-right flex-shrink-0 flex flex-col items-end justify-center">
                ${hasDiscount ? `<span class="text-[9px] text-gray-500 line-through leading-none mb-0.5">$${price.toFixed(2)}</span>` : ''}
                <span class="${hasDiscount ? 'text-[#FFC300]' : 'text-white'} font-[900] italic text-sm leading-none">$${finalPrice.toFixed(2)}</span>
            </div>
        </a>
        `;
    }).join('');

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
    
    if (!query || !query.trim()) {
        if(countDisplay) countDisplay.innerText = "Ingresa un término de búsqueda válido.";
        if(grid) {
            grid.innerHTML = `
                <div id="search-wait-state" class="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-0 translate-y-8 transition-all duration-700 ease-out">
                    <div class="w-20 h-20 bg-[#0a0a0f] rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,195,0,0.05)]">
                        <span class="text-3xl animate-bounce">⌨️</span>
                    </div>
                    <h3 class="text-xl md:text-3xl font-[900] tracking-tighter uppercase italic text-white mb-2">Descubre tu <span class="text-[#FFC300]">potencial</span></h3>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold max-w-sm">Escribe el nombre del producto, marca o categoría en la barra superior.</p>
                </div>
            `;
            setTimeout(() => {
                const waitState = document.getElementById('search-wait-state');
                if (waitState) {
                    waitState.classList.remove('opacity-0', 'translate-y-8');
                    waitState.classList.add('opacity-100', 'translate-y-0');
                }
            }, 50);
        }
        return;
    }

    const normalizedQuery = normalizeText(query);
    let products = (window.allProducts && window.allProducts.length > 0) ? window.allProducts : [];
    let needsFetch = products.length === 0;

    if (needsFetch) {
        const rawCache = sessionStorage.getItem('gymenez_catalog');
        if (rawCache) {
            try {
                const cachedData = JSON.parse(rawCache);
                if (cachedData && cachedData.products && cachedData.timestamp) {
                    const now = new Date().getTime();
                    if (now - cachedData.timestamp < 5 * 60 * 1000) {
                        products = cachedData.products;
                        window.allProducts = products; 
                        needsFetch = false;
                    }
                }
            } catch (e) { console.warn("Caché corrupto, recargando..."); }
        }
    }

    try {
        if (needsFetch) {
            if(grid) grid.innerHTML = `
                <div class="col-span-full py-24 flex flex-col items-center justify-center">
                    <div class="w-12 h-12 border-4 border-[#FFC300] border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(255,195,0,0.5)]"></div>
                    <span class="text-[#FFC300] text-[10px] uppercase tracking-widest font-black animate-pulse">Accediendo al catálogo global...</span>
                </div>
            `;

            const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/catalog');
            const data = await response.json();

            if (response.ok && data.success) {
                products = data.products;
                window.allProducts = products;
                sessionStorage.setItem('gymenez_catalog', JSON.stringify({ products, timestamp: new Date().getTime() }));
            } else throw new Error('Error al cargar');
        }
        
        // 🍎 MAGIA DE TOKENIZACIÓN (Grilla profunda)
        const queryWords = normalizedQuery.split(/\s+/); // Separamos por palabras
        
        const filteredProducts = products.filter(p => {
            const searchString = normalizeText(`${p.name} ${p.store_name || ''} ${p.category || ''} ${p.description || ''}`);
            // El producto debe contener TODAS las palabras ingresadas para pasar el filtro
            return queryWords.every(word => searchString.includes(word));
        });

        if(countDisplay) countDisplay.innerText = `${filteredProducts.length} resultados elite`;
        if(grid) renderDeepResults(filteredProducts, grid);
        
    } catch (error) {
        if(countDisplay) countDisplay.innerText = "Error de conexión.";
        if(grid) grid.innerHTML = '<div class="col-span-full text-center py-10"><p class="text-red-500 font-bold uppercase text-[10px] tracking-widest">Ocurrió un problema de red al buscar.</p></div>';
    }
}

function renderDeepResults(productsToRender, grid) {
    if (productsToRender.length === 0) {
        grid.innerHTML = `
            <div id="search-empty-state" class="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-0 translate-y-8 transition-all duration-700 ease-out">
                <div class="w-20 h-20 bg-[#0a0a0f] rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,0,0,0.1)]">
                    <span class="text-3xl opacity-50">📭</span>
                </div>
                <h3 class="text-xl font-[900] tracking-tighter uppercase italic text-white mb-2">Radar en Blanco</h3>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">No encontramos coincidencias. Intenta con un sinónimo.</p>
            </div>
        `;
        setTimeout(() => {
            const emptyState = document.getElementById('search-empty-state');
            if (emptyState) {
                emptyState.classList.remove('opacity-0', 'translate-y-8');
                emptyState.classList.add('opacity-100', 'translate-y-0');
            }
        }, 50);
        return;
    }

    // Dibujamos las tarjetas, pero OJO: las creamos "invisibles" (opacity-0 y movidas hacia abajo)
    grid.innerHTML = productsToRender.map((p, index) => {
        const price = parseFloat(p.price_usd || p.price || 0);
        const discount = parseInt(p.discount_percentage || p.discount || 0);
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (price * (1 - discount / 100)) : price;

        const isOnDemand = (p.is_on_demand === true || p.is_on_demand === 'true' || p.is_on_demand === 'True');
        const hasFreeShipping = (p.free_shipping === true || p.free_shipping === 'true' || p.free_shipping === 'True');

        let etiquetasHtml = '';
        if (hasFreeShipping) {
            const threshold = parseFloat(p.free_shipping_threshold);
            const extraText = threshold > 0 ? ` > $${threshold}` : '';
            etiquetasHtml += `<span class="bg-emerald-500/90 text-black border border-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-[0_0_10px_rgba(16,185,129,0.3)]">🚚 Envío Gratis</span> `;
        }
        if (isOnDemand) {
            etiquetasHtml += `<span class="bg-purple-500/90 text-white border border-purple-400 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.3)]">⚡ Bajo Pedido</span>`;
        }

        // 🍎 NOTA: Añadida clase 'result-card opacity-0 translate-y-12' para la magia
        return `
        <a href="/store/product.html?id=${p.id}" class="result-card opacity-0 translate-y-12 group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#FFC300]/50 transition-all duration-[600ms] ease-out cursor-pointer relative shadow-lg hover:shadow-[0_10px_30px_rgba(255,195,0,0.1)]">
            
            <div class="relative w-full aspect-square overflow-hidden bg-[#030305] border-b border-white/5 flex items-center justify-center">
                <img src="${p.image_url || p.imageUrl}" alt="${p.name}" class="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-110 transition-transform duration-700">
                ${hasDiscount ? `<span class="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg z-10">-${discount}%</span>` : ''}
            </div>
            
            <div class="p-4 flex flex-col flex-grow relative">
                ${etiquetasHtml ? `<div class="absolute -top-3 left-3 flex gap-1 z-20">${etiquetasHtml}</div>` : ''}

                <h3 class="text-sm md:text-base font-bold text-white mb-1 uppercase tracking-tight truncate ${etiquetasHtml ? 'mt-2' : ''}">${p.name}</h3>
                
                <p class="text-[10px] md:text-xs text-gray-400 mb-2 font-medium capitalize">
                    ${p.category} • ${isOnDemand ? '<span class="text-purple-400 font-bold">Bajo Pedido</span>' : (p.stock > 0 ? p.stock + ' unidades' : '<span class="text-red-500 font-bold">Agotado</span>')}
                </p>
                
                <span class="text-[10px] font-black uppercase tracking-widest text-[#FFC300] mt-auto">${p.store_name || 'Gymenez Store'}</span>
                
                <div class="flex items-center justify-between mt-4 border-t border-white/5 pt-3">
                    ${hasDiscount 
                        ? `<div class="flex flex-col"><span class="text-xs text-gray-500 line-through leading-none">$${price.toFixed(2)}</span><span class="text-white font-black text-sm md:text-base leading-none mt-1">$${finalPrice.toFixed(2)}</span></div>` 
                        : `<span class="text-sm md:text-base font-black text-white">$${finalPrice.toFixed(2)}</span>`
                    }
                    <div class="bg-white/10 p-2 rounded-full text-white group-hover:bg-[#FFC300] group-hover:text-black transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </div>
                </div>
            </div>
        </a>
        `;
    }).join('');

    // 🍎 LA MAGIA SUCEDE AQUÍ: Disparamos la animación en cascada
    // Damos unos milisegundos para que el DOM pinte las tarjetas "invisibles", 
    // y luego las mostramos una a una con un pequeño retraso de 40ms entre ellas.
    setTimeout(() => {
        const cards = grid.querySelectorAll('.result-card');
        cards.forEach((card, i) => {
            setTimeout(() => {
                card.classList.remove('opacity-0', 'translate-y-12');
                card.classList.add('opacity-100', 'translate-y-0');
            }, i * 40); // El retraso aumenta 40ms por cada tarjeta (efecto dominó)
        });
    }, 20);
}

function setupInnerSearch() {
    const input = document.getElementById('search-input-inner');
    const displayEl = document.getElementById('search-query-display');
    const btn = document.getElementById('search-btn-inner');
    
    // 🍎 MAGIA: Creamos el menú desplegable en search.html dinámicamente si no existe
    let innerDropdown = document.getElementById('search-dropdown-inner');
    if (input && !innerDropdown) {
        innerDropdown = document.createElement('div');
        innerDropdown.id = 'search-dropdown-inner';
        innerDropdown.className = 'absolute top-full left-0 right-0 mt-2 bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] hidden flex-col max-h-[400px] overflow-y-auto hide-scroll';
        input.parentElement.appendChild(innerDropdown);
    }
    
    const goSearch = () => {
        const term = input.value.trim();
        if (innerDropdown) innerDropdown.classList.add('hidden'); // Ocultar el menú rápido
        
        if (term.length > 0) {
            window.history.replaceState({}, '', `/store/search.html?q=${encodeURIComponent(term)}`);
            if(displayEl) displayEl.innerText = `"${term}"`;
            fetchAndFilterProducts(term); // 👈 AQUÍ SÍ HACE LA BÚSQUEDA PROFUNDA Y ANIMADA
        } else {
            if(displayEl) displayEl.innerText = '"Todo"';
            fetchAndFilterProducts('');
        }
    };

    if(input) {
        // MIENTRAS ESCRIBE: Solo abre el menú desplegable (Búsqueda Instantánea)
        input.addEventListener('input', (e) => {
            const term = e.target.value;
            handleInstantSearch(term, 'desktop-inner');
        });

        // SI PRESIONAN ENTER: Oculta el menú y hace la búsqueda profunda en la grilla
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                input.blur(); 
                goSearch();
            }
        });

        // Ocultar menú si dan clic afuera
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && innerDropdown && !innerDropdown.contains(e.target)) {
                innerDropdown.classList.add('hidden');
            }
        });
    }
    
    if(btn) btn.addEventListener('click', goSearch);
}
