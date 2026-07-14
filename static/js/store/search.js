document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener la palabra clave de la URL (?q=palabra)
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    document.getElementById('search-query-display').innerText = `"${query}"`;
    document.getElementById('search-input-inner').value = query;

    // Ejecutar búsqueda profunda
    fetchAndFilterProducts(query);
    
    // Activar buscador interno
    setupInnerSearch();
});

// Función Maestra: Elimina acentos y convierte a minúsculas
function normalizeText(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function fetchAndFilterProducts(query) {
    const grid = document.getElementById('results-grid');
    const countDisplay = document.getElementById('search-count');
    
    if (!query.trim()) {
        countDisplay.innerText = "Ingresa un término de búsqueda válido.";
        grid.innerHTML = '';
        return;
    }

    try {
        const response = await fetch('https://sijj2003.pythonanywhere.com/api/store/catalog');
        const data = await response.json();

        if (response.ok && data.success) {
            const normalizedQuery = normalizeText(query);
            
            // FILTRADO ULTRA-FLEXIBLE
            const filteredProducts = data.products.filter(p => {
                const searchString = normalizeText(`${p.name} ${p.store_name} ${p.category} ${p.description}`);
                return searchString.includes(normalizedQuery);
            });

            countDisplay.innerText = `${filteredProducts.length} coincidencias encontradas`;
            renderResults(filteredProducts, grid);
            
        } else {
            throw new Error('No se pudo cargar el catálogo');
        }
    } catch (error) {
        countDisplay.innerText = "Error en el servidor.";
        grid.innerHTML = '<p class="text-red-500">Ocurrió un problema al buscar. Intenta de nuevo.</p>';
    }
}

function renderResults(productsToRender, grid) {
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

// Búsqueda desde la misma página de resultados
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
