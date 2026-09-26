/**
 * Gymenez Store - Partner Store Profile & Catalog Engine
 * Carga el catálogo por Slug y gestiona la caché local (15 minutos).
 */

const CACHE_TTL_MINUTES = 15;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Capturar el slug o identificador amigable desde la URL (ej: vendor.html?store=gymenez-performance)
    const urlParams = new URLSearchParams(window.location.search);
    const storeSlug = urlParams.get('store') || urlParams.get('slug') || urlParams.get('id');

    if (!storeSlug) {
        console.warn('No se especificó la tienda asociada. Redirigiendo al catálogo general.');
        window.location.href = '/store/home.html';
        return;
    }

    // 2. Cargar perfil y catálogo utilizando la caché local o API
    await loadPartnerStoreData(storeSlug);

    // 3. Vincular buscadores internos
    setupStoreSearch(storeSlug);
});

/**
 * Carga los datos de la tienda desde caché o mediante API REST en Flask
 */
async function loadPartnerStoreData(slug) {
    const cacheKey = `gymen_vendor_cache_${slug.toLowerCase()}`;
    const cachedData = getValidCache(cacheKey);

    if (cachedData) {
        console.log(`[Gymenez Cache] Datos de tienda '${slug}' cargados desde caché local.`);
        renderVendorProfile(cachedData.vendor);
        renderVendorProducts(cachedData.products);
        return;
    }

    try {
        console.log(`[Gymenez Network] Solicitando tienda '${slug}' al backend...`);
        
        // Petición real al backend de Flask por slug
        const response = await fetch(`https://sijj2003.pythonanywhere.com/api/store/vendor/${slug}`);
        const data = await response.json();

        if (response.ok && data.success) {
            // Guardar en la caché local con tiempo de expiración
            setCacheWithExpiry(cacheKey, data, CACHE_TTL_MINUTES);
            
            renderVendorProfile(data.vendor);
            renderVendorProducts(data.products);
        } else {
            console.error(data.message || 'Error al obtener la tienda');
            showEmptyState(true);
        }
    } catch (error) {
        console.error('Error de red al conectar con el backend de la tienda:', error);
        showEmptyState(true);
    }
}

/**
 * Renderiza el encabezado y datos generales de la tienda
 */
function renderVendorProfile(vendor) {
    const titleEl = document.getElementById('vendor-title');
    const descEl = document.getElementById('vendor-description');
    const logoFallback = document.getElementById('vendor-logo-fallback');
    const logoImg = document.getElementById('vendor-logo-img');

    const storeName = vendor.store_name || vendor.name || 'Tienda Oficial';

    if (titleEl) titleEl.innerText = storeName;
    if (descEl) descEl.innerText = vendor.description || 'Socio comercial verificado dentro del ecosistema Gymenez Store.';

    if (vendor.logo_url) {
        logoImg.src = vendor.logo_url;
        logoImg.alt = storeName;
        logoImg.classList.remove('hidden');
        logoFallback.classList.add('hidden');
    } else {
        const initial = storeName.charAt(0).toUpperCase();
        logoFallback.innerText = initial;
        logoFallback.classList.remove('hidden');
        logoImg.classList.add('hidden');
    }

    // Retirar estilo skeleton
    document.getElementById('vendor-logo-container')?.classList.remove('skeleton-pulse');
}

/**
 * Renderiza la grilla de productos de la tienda
 */
function renderVendorProducts(products) {
    const grid = document.getElementById('vendor-products-grid');
    const counter = document.getElementById('results-counter');
    const badge = document.getElementById('vendor-products-badge');

    if (!grid) return;

    grid.innerHTML = '';

    if (!products || products.length === 0) {
        showEmptyState(true);
        if (badge) badge.innerText = '0 Productos';
        if (counter) counter.innerText = '0 resultados';
        return;
    }

    showEmptyState(false);
    if (badge) badge.innerText = `${products.length} Productos`;
    if (counter) counter.innerText = `${products.length} artículos disponibles`;

    products.forEach(product => {
        const priceFormatted = parseFloat(product.price || 0).toFixed(2);
        const cardHTML = `
            <div class="bg-[#12121a] border border-white/5 rounded-[2rem] p-4 flex flex-col justify-between hover:border-[#FFC300]/30 transition-all duration-300 group hover:-translate-y-1 shadow-lg relative overflow-hidden">
                <div>
                    <!-- Imagen del Producto -->
                    <div class="w-full aspect-square rounded-[1.5rem] bg-[#030305] mb-4 overflow-hidden relative border border-white/5">
                        <img src="${product.image_url || '/static/img/placeholder.png'}" alt="${product.name || 'Producto'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <span class="absolute top-3 left-3 bg-[#030305]/80 backdrop-blur-md border border-white/10 text-[#FFC300] text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                            ${product.category || 'General'}
                        </span>
                    </div>

                    <!-- Info -->
                    <h3 class="text-sm font-bold text-white line-clamp-2 mb-1 group-hover:text-[#FFC300] transition-colors">${product.name}</h3>
                    <p class="text-[10px] text-gray-500 font-medium mb-3 line-clamp-1">${product.short_description || product.description || ''}</p>
                </div>

                <div class="pt-3 border-t border-white/5 flex items-center justify-between mt-2">
                    <div>
                        <span class="text-[9px] text-gray-500 block uppercase font-bold">Precio</span>
                        <span class="text-lg font-[900] text-white italic tracking-tighter">$${priceFormatted}</span>
                    </div>
                    <button onclick="addToCart('${product.id}')" class="w-10 h-10 rounded-full bg-[#FFC300] text-black flex items-center justify-center hover:bg-yellow-400 transition shadow-[0_0_15px_rgba(255,195,0,0.2)]">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

/**
 * Filtro en tiempo real para buscar dentro del catálogo cargado
 */
function setupStoreSearch(slug) {
    const searchInputs = [
        document.getElementById('store-search-input'),
        document.getElementById('store-search-input-mobile')
    ];

    searchInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const cached = getValidCache(`gymen_vendor_cache_${slug.toLowerCase()}`);

            if (cached && cached.products) {
                const filtered = cached.products.filter(p => 
                    (p.name && p.name.toLowerCase().includes(query)) || 
                    (p.category && p.category.toLowerCase().includes(query))
                );
                renderVendorProducts(filtered);
            }
        });
    });
}

/**
 * Control del estado vacío
 */
function showEmptyState(show) {
    const emptyState = document.getElementById('vendor-empty-state');
    const grid = document.getElementById('vendor-products-grid');

    if (emptyState) emptyState.classList.toggle('hidden', !show);
    if (grid && show) grid.innerHTML = '';
}

/* ==========================================================================
   GESTOR DE CACHÉ LOCAL (LocalStorage)
   ========================================================================== */

function setCacheWithExpiry(key, value, timeToLiveInMinutes) {
    const item = {
        value: value,
        expiry: new Date().getTime() + timeToLiveInMinutes * 60 * 1000,
    };
    localStorage.setItem(key, JSON.stringify(item));
}

function getValidCache(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    try {
        const item = JSON.parse(itemStr);
        if (new Date().getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    } catch (e) {
        localStorage.removeItem(key);
        return null;
    }
}
