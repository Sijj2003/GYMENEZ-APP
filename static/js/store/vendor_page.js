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
        window.location.href = '/store/catalog.html';
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
        
        // Petición real al backend de Flask por slug/id
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
    if (!vendor) return;

    const titleEl = document.getElementById('vendor-title');
    const descEl = document.getElementById('vendor-description');
    const logoFallback = document.getElementById('vendor-logo-fallback');
    const logoImg = document.getElementById('vendor-logo-img');

    const storeName = vendor.store_name || vendor.name || 'Tienda Oficial';

    if (titleEl) titleEl.innerText = storeName;
    if (descEl) descEl.innerText = vendor.description || 'Socio comercial verificado dentro del ecosistema Gymenez Store.';

    if (vendor.logo_url) {
        if (logoImg) {
            logoImg.src = vendor.logo_url;
            logoImg.alt = storeName;
            logoImg.classList.remove('hidden');
        }
        if (logoFallback) logoFallback.classList.add('hidden');
    } else {
        if (logoFallback) {
            const initial = storeName.charAt(0).toUpperCase();
            logoFallback.innerText = initial;
            logoFallback.classList.remove('hidden');
        }
        if (logoImg) logoImg.classList.add('hidden');
    }

    // Retirar estilo skeleton
    document.getElementById('vendor-logo-container')?.classList.remove('skeleton-pulse');
}

/**
 * Renderiza la grilla de productos idéntica a catalog.js (Precios, Descuentos y Envíos Gratis)
 */
function renderVendorProducts(products) {
    const grid = document.getElementById('vendor-products-grid') || document.getElementById('catalog-grid');
    const counter = document.getElementById('results-counter');
    const badge = document.getElementById('vendor-products-badge');

    if (!grid) return;

    if (!products || products.length === 0) {
        showEmptyState(true);
        if (badge) badge.innerText = '0 Productos';
        if (counter) counter.innerText = '0 resultados';
        return;
    }

    showEmptyState(false);
    if (badge) badge.innerText = `${products.length} Productos`;
    if (counter) counter.innerText = `${products.length} artículos disponibles`;

    // Renderizado eficiente con mapeo idéntico a catalog.js
    grid.innerHTML = products.map(p => {
        // Parseo seguro de Firestore (soporta price_usd o price)
        const priceNum = parseFloat(p.price_usd || p.price) || 0;
        const discount = parseInt(p.discount_percentage) || 0;
        const hasDiscount = discount > 0;
        const finalPrice = hasDiscount ? (priceNum * (1 - discount / 100)).toFixed(2) : priceNum.toFixed(2);

        const storeName = p.store_name || 'Gymenez Partner';
        const category = p.category || 'General';

        // Banderas booleanas (soporta String o Boolean)
        const isOnDemand = (p.is_on_demand === true || p.is_on_demand === 'true' || p.is_on_demand === 'True');
        const hasFreeShipping = (p.free_shipping === true || p.free_shipping === 'true' || p.free_shipping === 'True');

        let etiquetasHtml = '';
        if (hasFreeShipping) {
            etiquetasHtml += `<span class="bg-emerald-500/90 text-black border border-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-[0_0_10px_rgba(16,185,129,0.3)]">🚚 Envío Gratis</span>`;
        }

        return `
        <a href="/store/product.html?id=${p.id}" class="group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#FFC300]/50 transition-all cursor-pointer relative">
            
            <!-- IMAGEN LIMPIA Y BADGE DE DESCUENTO -->
            <div class="relative w-full aspect-square overflow-hidden bg-[#030305] border-b border-white/5 flex items-center justify-center">
                <img src="${p.image_url || '/static/img/placeholder.png'}" class="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-110 transition-transform duration-700" alt="${p.name}">
                
                ${hasDiscount ? `<span class="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg z-10">-${discount}%</span>` : ''}
            </div>
            
            <!-- INFORMACIÓN Y PRECIOS -->
            <div class="p-4 flex flex-col flex-grow relative">
                
                <!-- ETIQUETAS FLOTANTES SOBRE EL TÍTULO -->
                ${etiquetasHtml ? `<div class="absolute -top-3 left-3 flex gap-1 z-20">${etiquetasHtml}</div>` : ''}

                <!-- Título -->
                <h3 class="text-sm md:text-base font-bold text-white mb-1 uppercase tracking-tight truncate ${etiquetasHtml ? 'mt-2' : ''}">${p.name}</h3>
                
                <!-- Categoría y Unidades -->
                <p class="text-[10px] md:text-xs text-gray-400 mb-2 font-medium capitalize">
                    ${category} • ${isOnDemand ? '<span class="text-purple-400 font-bold">Bajo Pedido</span>' : (p.stock > 0 ? p.stock + ' unidades' : '<span class="text-red-500 font-bold">Agotado</span>')}
                </p>
                
                <!-- Nombre de la Tienda -->
                <span class="text-[10px] font-black uppercase tracking-widest text-[#FFC300] mt-auto">${storeName}</span>
                
                <!-- Precio y Botón -->
                <div class="flex items-center justify-between mt-4 border-t border-white/5 pt-3">
                    ${hasDiscount 
                        ? `<div class="flex flex-col"><span class="text-xs text-gray-500 line-through leading-none">$${priceNum.toFixed(2)}</span><span class="text-white font-black text-sm md:text-base leading-none mt-1">$${finalPrice}</span></div>` 
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

/**
 * Filtro flexible inteligente en tiempo real por palabras clave (Tokens)
 */
function setupStoreSearch(slug) {
    const searchInputs = [
        document.getElementById('store-search-input'),
        document.getElementById('store-search-input-mobile')
    ];

    searchInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const rawQuery = e.target.value.toLowerCase().trim();
            const cached = getValidCache(`gymen_vendor_cache_${slug.toLowerCase()}`);

            if (!cached || !cached.products) return;

            // Si el buscador está vacío, renderiza todo el catálogo
            if (rawQuery.length === 0) {
                renderVendorProducts(cached.products);
                return;
            }

            // Separar la búsqueda en palabras clave individuales (ignorando espacios múltiples)
            const queryTokens = rawQuery.split(/\s+/).filter(token => token.length > 0);

            const filtered = cached.products.filter(p => {
                // Creamos un súper texto con todos los atributos del producto
                const searchableText = `
                    ${p.name || ''} 
                    ${p.category || ''} 
                    ${p.description || ''} 
                    ${p.short_description || ''} 
                    ${p.store_name || ''}
                `.toLowerCase();

                // El producto cumple si CADA palabra buscada existe en alguna parte del texto del producto
                return queryTokens.every(token => searchableText.includes(token));
            });

            renderVendorProducts(filtered);
        });
    });
}
/**
 * Control del estado vacío
 */
function showEmptyState(show) {
    const emptyState = document.getElementById('vendor-empty-state');
    const grid = document.getElementById('vendor-products-grid') || document.getElementById('catalog-grid');

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
