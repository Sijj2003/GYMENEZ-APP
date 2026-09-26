/**
 * Gymenez Store - Partner Store Profile & Catalog Engine
 * Gestiona el caché en localStorage para minimizar llamadas a la BD.
 */

const CACHE_TTL_MINUTES = 15; // Expiración de caché (15 mins)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener identificador de la tienda desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const vendorId = urlParams.get('vendor_id') || urlParams.get('id') || urlParams.get('slug');

    if (!vendorId) {
        console.warn('No se especificó la tienda asociada. Redirigiendo al catálogo general.');
        window.location.href = '/store/home.html';
        return;
    }

    // 2. Cargar perfil y catálogo utilizando caché local
    await loadPartnerStoreData(vendorId);

    // 3. Vincular buscadores internos
    setupStoreSearch();
});

/**
 * Carga los datos de la tienda utilizando caché en LocalStorage
 */
async function loadPartnerStoreData(vendorId) {
    const cacheKey = `gymen_vendor_cache_${vendorId}`;
    const cachedData = getValidCache(cacheKey);

    if (cachedData) {
        console.log(`[Gymenez Cache] Datos de tienda '${vendorId}' cargados desde caché local.`);
        renderVendorProfile(cachedData.vendor);
        renderVendorProducts(cachedData.products);
        return;
    }

    try {
        console.log(`[Gymenez Network] Solicitando datos de la tienda '${vendorId}' al backend...`);
        
        // PUNTOS DE CONEXIÓN CON EL BACKEND FLASK/PYTHON:
        // const response = await fetch(`/api/store/vendors/${vendorId}`);
        // const data = await response.json();

        // SIMULACIÓN DE RESPUESTA DE API
        const data = await mockBackendFetch(vendorId);

        if (data && data.success) {
            // Guardar en caché con marca de tiempo
            setCacheWithExpiry(cacheKey, data, CACHE_TTL_MINUTES);
            
            renderVendorProfile(data.vendor);
            renderVendorProducts(data.products);
        } else {
            showEmptyState(true);
        }
    } catch (error) {
        console.error('Error al conectar con el backend de la tienda:', error);
        showEmptyState(true);
    }
}

/**
 * Renderiza el encabezado del perfil de la tienda
 */
function renderVendorProfile(vendor) {
    const titleEl = document.getElementById('vendor-title');
    const descEl = document.getElementById('vendor-description');
    const logoFallback = document.getElementById('vendor-logo-fallback');
    const logoImg = document.getElementById('vendor-logo-img');

    if (titleEl) titleEl.innerText = vendor.name || 'Tienda Asociada';
    if (descEl) descEl.innerText = vendor.description || 'Socio comercial verificado dentro del ecosistema Gymenez Store.';

    if (vendor.logo_url) {
        logoImg.src = vendor.logo_url;
        logoImg.classList.remove('hidden');
        logoFallback.classList.add('hidden');
    } else {
        const initial = (vendor.name || 'P').charAt(0).toUpperCase();
        logoFallback.innerText = initial;
        logoFallback.classList.remove('hidden');
        logoImg.classList.add('hidden');
    }

    // Quitar esqueletos
    document.getElementById('vendor-logo-container')?.classList.remove('skeleton-pulse');
}

/**
 * Renderiza el catálogo filtrado exclusivo de esta tienda
 */
function renderVendorProducts(products) {
    const grid = document.getElementById('vendor-products-grid');
    const counter = document.getElementById('results-counter');
    const badge = document.getElementById('vendor-products-badge');

    if (!grid) return;

    grid.innerHTML = ''; // Limpiar esqueletos

    if (!products || products.length === 0) {
        showEmptyState(true);
        if (badge) badge.innerText = '0 Productos';
        if (counter) counter.innerText = '0 resultados';
        return;
    }

    showEmptyState(false);
    if (badge) badge.innerText = `${products.length} Productos`;
    if (counter) counter.innerText = `${products.length} artículos disponibles`;

    // Renderizado de tarjetas usando el formato de Gymenez Store
    products.forEach(product => {
        const cardHTML = `
            <div class="bg-[#12121a] border border-white/5 rounded-[2rem] p-4 flex flex-col justify-between hover:border-[#FFC300]/30 transition-all duration-300 group hover:-translate-y-1 shadow-lg relative overflow-hidden">
                <div>
                    <!-- Imagen del Producto -->
                    <div class="w-full aspect-square rounded-[1.5rem] bg-[#030305] mb-4 overflow-hidden relative border border-white/5">
                        <img src="${product.image_url || '/static/img/placeholder.png'}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <span class="absolute top-3 left-3 bg-[#030305]/80 backdrop-blur-md border border-white/10 text-[#FFC300] text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                            ${product.category || 'General'}
                        </span>
                    </div>

                    <!-- Info -->
                    <h3 class="text-sm font-bold text-white line-clamp-2 mb-1 group-hover:text-[#FFC300] transition-colors">${product.name}</h3>
                    <p class="text-[10px] text-gray-500 font-medium mb-3 line-clamp-1">${product.short_description || ''}</p>
                </div>

                <div class="pt-3 border-t border-white/5 flex items-center justify-between mt-2">
                    <div>
                        <span class="text-[9px] text-gray-500 block uppercase font-bold">Precio</span>
                        <span class="text-lg font-[900] text-white italic tracking-tighter">$${parseFloat(product.price).toFixed(2)}</span>
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
 * Filtro de búsqueda en tiempo real dentro de la tienda
 */
function setupStoreSearch() {
    const searchInputs = [
        document.getElementById('store-search-input'),
        document.getElementById('store-search-input-mobile')
    ];

    searchInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const urlParams = new URLSearchParams(window.location.search);
            const vendorId = urlParams.get('vendor_id') || urlParams.get('id') || urlParams.get('slug');
            const cached = getValidCache(`gymen_vendor_cache_${vendorId}`);

            if (cached && cached.products) {
                const filtered = cached.products.filter(p => 
                    p.name.toLowerCase().includes(query) || 
                    (p.category && p.category.toLowerCase().includes(query))
                );
                renderVendorProducts(filtered);
            }
        });
    });
}

/**
 * Muestra u oculta el estado vacío cuando no hay artículos
 */
function showEmptyState(show) {
    const emptyState = document.getElementById('vendor-empty-state');
    const grid = document.getElementById('vendor-products-grid');

    if (emptyState) emptyState.classList.toggle('hidden', !show);
    if (grid && show) grid.innerHTML = '';
}

/* ==========================================================================
   UTILIDADES DE CACHÉ EN LOCALSTORAGE (Evita lecturas redundantes a la BD)
   ========================================================================== */

function setCacheWithExpiry(key, value, timeToLiveInMinutes) {
    const now = new Date();
    const item = {
        value: value,
        expiry: now.getTime() + timeToLiveInMinutes * 60 * 1000,
    };
    localStorage.setItem(key, JSON.stringify(item));
}

function getValidCache(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    try {
        const item = JSON.parse(itemStr);
        const now = new Date();

        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key); // Expirado
            return null;
        }
        return item.value;
    } catch (e) {
        localStorage.removeItem(key);
        return null;
    }
}

/* ==========================================================================
   SIMULADOR BACKEND (Sustituir por endpoint Flask real /api/store/vendors/<id>)
   ========================================================================== */

async function mockBackendFetch(vendorId) {
    // Simula retardo de red de 400ms
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
        success: true,
        vendor: {
            id: vendorId,
            name: "Sport Nutrition Pro",
            description: "Distribuidor oficial de suplementos de alta pureza, proteínas aisladas y creatinas micronizadas con garantía de autenticidad.",
            logo_url: "" // Si está vacío usa la inicial corporativa
        },
        products: [
            {
                id: "prod-101",
                name: "Iso Pure Whey Protein 5lbs",
                short_description: "Proteína aislada de rápida absorción.",
                price: 74.99,
                category: "Suplementos",
                image_url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=400&auto=format&fit=crop"
            },
            {
                id: "prod-102",
                name: "Creatine Monohydrate 500g",
                short_description: "Creatina 100% pura grado farmacéutico.",
                price: 34.50,
                category: "Suplementos",
                image_url: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?q=80&w=400&auto=format&fit=crop"
            }
        ]
    };
}
