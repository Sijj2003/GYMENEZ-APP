/**
 * Gymenez Store - Partner Store Profile & Catalog Engine
 * Arquitectura Zero-Trust: Lee de la memoria global del Catálogo para consistencia absoluta.
 */

// Memoria local de esta tienda para el buscador interno
window.vendorProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Capturar el slug o ID desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const storeIdentifier = urlParams.get('store') || urlParams.get('slug') || urlParams.get('id');

    if (!storeIdentifier) {
        console.warn('No se especificó la tienda. Redirigiendo al catálogo.');
        window.location.href = '/store/catalog.html';
        return;
    }

    // Iniciar ecosistema
    await loadVendorEcosystem(storeIdentifier);
    setupStoreSearch();
});

// Utilidad para limpiar textos y URLs
function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
        .replace(/\s+/g, '-')           
        .replace(/[^\w\-]+/g, '')       
        .replace(/\-\-+/g, '-');        
}

async function loadVendorEcosystem(identifier) {
    // ==========================================
    // 1. CARGAR PERFIL DEL PARTNER (Memoria Global)
    // ==========================================
    let partners = [];
    const rawPartnersCache = sessionStorage.getItem('gymenez_partners');
    
    if (rawPartnersCache) {
        try {
            const pData = JSON.parse(rawPartnersCache);
            if (new Date().getTime() - pData.timestamp < 5 * 60 * 1000) {
                partners = pData.partners;
            }
        } catch(e) {}
    }

    // Si no hay caché, pedir al backend
    if (partners.length === 0) {
        try {
            const res = await fetch('https://sijj2003.pythonanywhere.com/api/store/partners');
            const data = await res.json();
            if (data.success) {
                partners = data.partners;
                sessionStorage.setItem('gymenez_partners', JSON.stringify({partners, timestamp: new Date().getTime()}));
            }
        } catch(e) { console.error('Error cargando partners', e); }
    }

    // Buscar el partner actual (Por ID exacto o por Slug del nombre)
    const currentVendor = partners.find(p => p.id === identifier || slugify(p.store_name) === slugify(identifier));
    
    if (currentVendor) {
        renderVendorProfile(currentVendor);
    } else {
        renderVendorProfile({ store_name: identifier.replace(/-/g, ' ') }); // Fallback visual
    }

    // ==========================================
    // 2. CARGAR CATÁLOGO GLOBAL Y FILTRAR (Zero-Trust)
    // ==========================================
    let allProducts = [];
    // 🍎 Usamos v3 para forzar la recarga con la nueva matemática de precios
    const rawCatalogCache = sessionStorage.getItem('gymenez_catalog_v3');
    
    if (rawCatalogCache) {
        try {
            const cData = JSON.parse(rawCatalogCache);
            if (new Date().getTime() - cData.timestamp < 5 * 60 * 1000) {
                allProducts = cData.products;
            }
        } catch(e) {}
    }

    // Si no hay catálogo en memoria, lo pedimos todo y lo cacheamos
    if (allProducts.length === 0) {
        try {
            const res = await fetch('https://sijj2003.pythonanywhere.com/api/store/catalog');
            const data = await res.json();
            if (data.success) {
                allProducts = data.products;
                sessionStorage.setItem('gymenez_catalog_v3', JSON.stringify({products: allProducts, timestamp: new Date().getTime()}));
            }
        } catch(e) { console.error('Error cargando catálogo', e); }
    }

    // 🍎 LA MAGIA: Filtramos la memoria global matemáticamente perfecta
    window.vendorProducts = allProducts.filter(p => {
        return (currentVendor && p.partner_id === currentVendor.id) || 
               slugify(p.store_name) === slugify(identifier);
    });

    renderVendorProducts(window.vendorProducts);
}

function renderVendorProfile(vendor) {
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
            logoFallback.innerText = storeName.charAt(0).toUpperCase();
            logoFallback.classList.remove('hidden');
        }
        if (logoImg) logoImg.classList.add('hidden');
    }

    document.getElementById('vendor-logo-container')?.classList.remove('skeleton-pulse');
}

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

    grid.innerHTML = products.map(p => {
        // 🍎 ZERO-TRUST: Extraemos los números puros desde la memoria global
        const bestPriceNum = p.display_best_price ? parseFloat(p.display_best_price) : parseFloat(p.price_usd);
        const maxPriceNum = p.display_max_price ? parseFloat(p.display_max_price) : parseFloat(p.price_usd);
        
        // 🍎 LÓGICA DE MARKETING: Descuento real vs Pasarela
        const baseOriginalPrice = parseFloat(p.price_usd || 0);
        const partnerDiscountPercentage = parseInt(p.discount_percentage || p.discount) || 0;
        
        let gatewayDiscount = 0;
        if (maxPriceNum > bestPriceNum) {
            gatewayDiscount = Math.round(((maxPriceNum - bestPriceNum) / maxPriceNum) * 100);
        }

        // Elegimos el mayor descuento
        const visualDiscount = Math.max(partnerDiscountPercentage, gatewayDiscount);
        const hasDiscount = visualDiscount > 0;

        const bestPrice = bestPriceNum.toFixed(2);
        // Tachamos el mayor precio (El original o el inflado)
        const maxPrice = Math.max(baseOriginalPrice, maxPriceNum).toFixed(2);

        const storeName = p.store_name || 'Gymenez Partner';
        const category = p.category || 'General';

        const isOnDemand = (p.is_on_demand === true || p.is_on_demand === 'true' || p.is_on_demand === 'True');
        const hasFreeShipping = (p.free_shipping === true || p.free_shipping === 'true' || p.free_shipping === 'True');

        let etiquetasHtml = '';
        if (hasFreeShipping) {
            etiquetasHtml += `<span class="bg-emerald-500/90 text-black border border-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-[0_0_10px_rgba(16,185,129,0.3)]">🚚 Envío Gratis</span>`;
        }

        // 🍎 Lógica visual segura
        let priceBlockHtml = '';
        if (hasDiscount) {
            priceBlockHtml = `
                <div class="flex flex-col">
                    <span class="text-[9px] md:text-[10px] text-gray-500 line-through leading-none">$${maxPrice}</span>
                    <span class="text-white font-black text-sm md:text-base leading-none mt-1">$${bestPrice} <span class="text-[#FFC300] text-[8px] uppercase tracking-widest">Binance Pay</span></span>
                </div>
            `;
        } else {
            priceBlockHtml = `
                <div class="flex flex-col justify-end mt-2">
                    <span class="text-white font-black text-sm md:text-base leading-none">$${bestPrice} <span class="text-[#FFC300] text-[8px] uppercase tracking-widest">Binance Pay</span></span>
                </div>
            `;
        }

        return `
        <a href="/store/product.html?id=${p.id}" class="group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#FFC300]/50 transition-all cursor-pointer relative shadow-lg hover:shadow-[0_10px_30px_rgba(255,195,0,0.1)]">
            
            <div class="relative w-full aspect-square overflow-hidden bg-[#030305] border-b border-white/5 flex items-center justify-center">
                <img src="${p.image_url || '/static/img/placeholder.png'}" class="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-110 transition-transform duration-700" alt="${p.name}">
                
                ${hasDiscount ? `<span class="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg z-10">-${visualDiscount}% OFF</span>` : ''}
            </div>
            
            <div class="p-4 flex flex-col flex-grow relative">
                ${etiquetasHtml ? `<div class="absolute -top-3 left-3 flex gap-1 z-20">${etiquetasHtml}</div>` : ''}

                <h3 class="text-sm md:text-base font-bold text-white mb-1 uppercase tracking-tight truncate ${etiquetasHtml ? 'mt-2' : ''}">${p.name}</h3>
                
                <p class="text-[10px] md:text-xs text-gray-400 mb-2 font-medium capitalize">
                    ${category} • ${isOnDemand ? '<span class="text-purple-400 font-bold">Bajo Pedido</span>' : (p.stock > 0 ? p.stock + ' unidades' : '<span class="text-red-500 font-bold">Agotado</span>')}
                </p>
                
                <span class="text-[10px] font-black uppercase tracking-widest text-[#FFC300] mt-auto">${storeName}</span>
                
                <div class="flex items-center justify-between mt-4 border-t border-white/5 pt-3">
                    ${priceBlockHtml}
                    <div class="bg-white/10 p-2 rounded-full text-white group-hover:bg-[#FFC300] group-hover:text-black transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </div>
                </div>
            </div>
        </a>
        `;
    }).join('');
}

function setupStoreSearch() {
    const searchInputs = [
        document.getElementById('store-search-input'),
        document.getElementById('store-search-input-mobile')
    ];

    searchInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const rawQuery = e.target.value.toLowerCase().trim();

            if (rawQuery.length === 0) {
                renderVendorProducts(window.vendorProducts);
                return;
            }

            const queryTokens = rawQuery.split(/\s+/).filter(t => t.length > 0);

            const filtered = window.vendorProducts.filter(p => {
                const searchableText = `${p.name || ''} ${p.category || ''} ${p.description || ''} ${p.store_name || ''}`.toLowerCase();
                return queryTokens.every(token => searchableText.includes(token));
            });

            renderVendorProducts(filtered);
        });
    });
}

function showEmptyState(show) {
    const emptyState = document.getElementById('vendor-empty-state');
    const grid = document.getElementById('vendor-products-grid') || document.getElementById('catalog-grid');

    if (emptyState) emptyState.classList.toggle('hidden', !show);
    if (grid && show) grid.innerHTML = '';
}
