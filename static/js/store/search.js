// ==========================================
// UTILS GLOBALES
// ==========================================
function normalizeText(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Lógica de buscadores
    const desktopInput = document.getElementById('search-input');
    const mobileInput = document.getElementById('mobile-search-input');

    if (desktopInput) {
        desktopInput.addEventListener('input', (e) => handleInstantSearch(e.target.value, 'desktop'));
        desktopInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = e.target.value.trim();
                if (term) window.location.href = `/store/search.html?q=${encodeURIComponent(term)}`;
            }
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#search-dropdown') && e.target !== desktopInput) {
                const dropdown = document.getElementById('search-dropdown');
                if(dropdown) dropdown.classList.add('hidden');
            }
        });
    }

    if (mobileInput) {
        mobileInput.addEventListener('input', (e) => handleInstantSearch(e.target.value, 'mobile'));
        mobileInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = e.target.value.trim();
                if (term) window.location.href = `/store/search.html?q=${encodeURIComponent(term)}`;
            }
        });
    }

    const searchQueryDisplay = document.getElementById('search-query-display');
    if (searchQueryDisplay) initDeepSearch();
});

// ==========================================
// MÓDULO A: BÚSQUEDA INSTANTÁNEA
// ==========================================
function handleInstantSearch(query, platform) {
    const q = normalizeText(query).trim();
    const resultsContainer = platform === 'desktop' 
        ? document.getElementById('search-dropdown') 
        : document.getElementById('mobile-search-results');

    if (!resultsContainer) return;

    if (q.length < 2) {
        if (platform === 'desktop') resultsContainer.classList.add('hidden');
        else resultsContainer.innerHTML = `<div class="text-center py-20 opacity-50"><p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Escribe para buscar...</p></div>`;
        return;
    }

    const cachedCatalog = sessionStorage.getItem('gymenez_catalog');
    let products = cachedCatalog ? JSON.parse(cachedCatalog) : [];

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
        container.innerHTML = `<div class="p-8 text-center"><p class="text-xs text-gray-500 uppercase tracking-widest font-black">Sin resultados</p></div>`;
        return;
    }

    let html = results.slice(0, 6).map(item => {
        const price = parseFloat(item.price_usd || item.price || 0);
        const discount = parseInt(item.discount_percentage || item.discount || 0);
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (price * (1 - discount / 100)) : price;

        return `
        <a href="/store/product.html?id=${item.id}" class="flex items-center gap-4 p-3 bg-[#0a0a0f] md:bg-transparent rounded-xl hover:bg-white/5 transition border-b border-white/5 md:border-b md:rounded-none md:last:border-0 group">
            <div class="w-14 h-14 rounded-lg bg-white/5 p-1 flex-shrink-0 border border-white/10 relative">
                <img src="${item.image_url || item.imageUrl}" class="w-full h-full object-contain group-hover:scale-110 transition">
                ${hasDiscount ? `<span class="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black px-1 rounded shadow">-${discount}%</span>` : ''}
            </div>
            <div class="flex-grow min-w-0 pr-2">
                <h4 class="text-sm font-bold text-white truncate">${item.name}</h4>
                <p class="text-[9px] text-[#FFC300] uppercase tracking-widest truncate">${item.store_name || 'Gymenez Store'}</p>
            </div>
            <div class="text-right flex-shrink-0 flex flex-col items-end justify-center">
                ${hasDiscount ? `<span class="text-[9px] text-gray-500 line-through leading-none mb-0.5">$${price.toFixed(2)}</span>` : ''}
                <span class="text-white font-[900] text-sm leading-none">$${finalPrice.toFixed(2)}</span>
            </div>
        </a>
        `;
    }).join('');

    container.innerHTML = html;
}

// ==========================================
// MÓDULO B: PÁGINA PROFUNDA DE RESULTADOS
// ==========================================
function renderDeepResults(productsToRender, grid) {
    if (productsToRender.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center"><p class="text-xs text-gray-500">No hay coincidencias.</p></div>`;
        return;
    }

    grid.innerHTML = productsToRender.map(p => {
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
                <p class="text-white font-black text-lg">$${finalPrice.toFixed(2)}</p>
                <span class="text-[9px] text-gray-500 uppercase tracking-widest">${p.category}</span>
            </div>
        </a>
        `;
    }).join('');
}

// (Resto de funciones: fetchAndFilterProducts, initDeepSearch, setupInnerSearch, toggleMobileSearch permanecen iguales)
