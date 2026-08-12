let currentProduct = null;
let currentQuantity = 1;
let finalPrice = 0;
let parsedVariants = [];
let selectedVariant = null; 

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = '/store/home.html';
        return;
    }
    loadProductData(productId);
});

async function loadProductData(id) {
    // ⚡ ESTRATEGIA APPLE: Buscar primero en Caché (Carga Instantánea)
    const rawCache = sessionStorage.getItem('gymenez_catalog');
    
    if (rawCache) {
        try {
            const cachedData = JSON.parse(rawCache);
            if (!Array.isArray(cachedData) && cachedData.products && cachedData.timestamp) {
                const now = new Date().getTime();
                const CACHE_LIMIT = 5 * 60 * 1000; // 5 minutos
                
                if (now - cachedData.timestamp < CACHE_LIMIT) {
                    const foundProduct = cachedData.products.find(p => String(p.id) === String(id));
                    if (foundProduct) {
                        currentProduct = foundProduct;
                        renderProduct();
                        return; 
                    }
                }
            }
        } catch (e) { console.warn("Caché local ignorado o formato viejo."); }
    }

    // 🌍 ESTRATEGIA B: Si no hay caché válido, consultar al backend
    try {
        const response = await fetch(`${API_BASE_URL}/api/store/catalog/${id}`);
        const data = await response.json();

        if (response.ok && data.success) {
            currentProduct = data.product;
            renderProduct();
        } else {
            alert("El producto no existe o fue retirado de la plataforma.");
            window.location.href = '/store/home.html';
        }
    } catch (error) {
        console.error("Error cargando producto:", error);
    }
}

function renderProduct() {
    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('product-container').classList.remove('hidden');

    // Llenar Datos Visuales Base
    document.getElementById('prod-img').src = currentProduct.image_url || currentProduct.imageUrl;
    document.getElementById('prod-title').innerText = currentProduct.name;
    document.getElementById('prod-store').innerText = currentProduct.store_name || "Gymenez Partner";
    document.getElementById('prod-desc').innerText = currentProduct.description || "Sin descripción disponible.";
    
    // 🍎 DETECCIÓN DE REGLAS DE NEGOCIO
    const isOnDemand = (currentProduct.is_on_demand === true || currentProduct.is_on_demand === 'true' || currentProduct.is_on_demand === 'True');
    const hasFreeShipping = (currentProduct.free_shipping === true || currentProduct.free_shipping === 'true' || currentProduct.free_shipping === 'True');

    // 🍎 INYECTAR ESCUDOS (BADGES)
    const badgesContainer = document.getElementById('prod-badges-container');
    if (badgesContainer) {
        let badgesHtml = '';
        if (hasFreeShipping) {
            const threshold = parseFloat(currentProduct.free_shipping_threshold);
            const extraText = threshold > 0 ? ` compras mayores a $${threshold}` : '';
            badgesHtml += `<span class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase px-2 py-1 rounded shadow-inner flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg> Envío Gratis${extraText}</span>`;
        }
        if (isOnDemand) {
            badgesHtml += `<span class="bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase px-2 py-1 rounded shadow-inner flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Compra Bajo Pedido</span>`;
        }
        badgesContainer.innerHTML = badgesHtml;
    }
    
    // Calcular Precio y Descuento
    const basePrice = parseFloat(currentProduct.price_usd || currentProduct.price);
    const discount = parseInt(currentProduct.discount_percentage || currentProduct.discount) || 0;
    
    if (discount > 0) {
        finalPrice = basePrice - (basePrice * (discount / 100));
        document.getElementById('prod-old-price').innerText = `$${basePrice.toFixed(2)}`;
        document.getElementById('prod-old-price').classList.remove('hidden');
        
        const badge = document.getElementById('prod-discount-badge');
        badge.innerText = `-${discount}% OFF`; 
        badge.classList.remove('hidden');
    } else {
        finalPrice = basePrice;
    }
    document.getElementById('prod-price').innerText = `$${finalPrice.toFixed(2)}`;
    updateTotalDisplay();

    // ===============================================
    // LÓGICA DE VARIANTES (APPLE PILLS)
    // ===============================================
    const variantsContainer = document.getElementById('variants-container');
    const variantsList = document.getElementById('variants-list');

    parsedVariants = [];
    if (currentProduct.variants_matrix) {
        try {
            parsedVariants = typeof currentProduct.variants_matrix === 'string' 
                ? JSON.parse(currentProduct.variants_matrix) 
                : currentProduct.variants_matrix;
        } catch (e) { console.error("Error parseando variantes"); }
    }

    // Si el producto tiene matriz de variantes (Tallas, Colores, Sabores)
    if (parsedVariants && parsedVariants.length > 0) {
        variantsContainer.classList.remove('hidden');
        
        variantsList.innerHTML = parsedVariants.map((v, index) => {
            // 🍎 Si es Bajo Pedido, ignoramos el stock y NUNCA lo marcamos agotado
            const isOutOfStock = !isOnDemand && (v.stock <= 0);
            
            return `
                <button 
                    type="button"
                    onclick="selectVariant(${index})"
                    id="var-btn-${index}"
                    ${isOutOfStock ? 'disabled' : ''}
                    class="px-5 py-3 rounded-full border ${isOutOfStock ? 'border-red-500/20 text-red-500/50 cursor-not-allowed line-through bg-[#050505]' : 'border-white/10 text-gray-400 hover:border-white hover:text-white bg-[#12121a] hover:bg-[#1a1a24] transition-all shadow-inner'} text-xs font-bold"
                >
                    ${v.name}
                </button>
            `;
        }).join('');
        
        // Estado Inicial: Botón de compra bloqueado hasta que seleccione variante
        const stockEl = document.getElementById('prod-stock');
        stockEl.innerText = "Selecciona una opción";
        stockEl.className = "text-[9px] font-black uppercase tracking-widest text-[#FFC300] bg-[#FFC300]/10 border border-[#FFC300]/20 px-3 py-1.5 rounded-md shadow-inner";
        
        document.getElementById('btn-add-cart').disabled = true;

    } else {
        // Producto Normal (Sin variantes, se rige por stock global)
        variantsContainer.classList.add('hidden');
        selectedVariant = null;
        updateStockDisplay(currentProduct.stock);
    }
}

// Función que se ejecuta al tocar una "Píldora" de Talla/Color/Sabor
function selectVariant(index) {
    selectedVariant = parsedVariants[index];
    
    // 1. Resetear colores de todas las píldoras disponibles
    document.querySelectorAll('[id^="var-btn-"]').forEach(btn => {
        if(!btn.disabled) {
            btn.className = 'px-5 py-3 rounded-full border border-white/10 text-gray-400 hover:border-white hover:text-white bg-[#12121a] hover:bg-[#1a1a24] transition-all shadow-inner text-xs font-bold';
        }
    });
    
    // 2. Iluminar la selección activa (Efecto Apple)
    const activeBtn = document.getElementById(`var-btn-${index}`);
    activeBtn.className = 'px-5 py-3 rounded-full border border-[#FFC300] text-black bg-[#FFC300] transition-all text-xs font-black shadow-[0_0_20px_rgba(255,195,0,0.5)] transform scale-105';
    
    // 3. Actualizar Stock y Botón de Compra basados en esta variante
    updateStockDisplay(selectedVariant.stock);
    currentQuantity = 1;
    document.getElementById('prod-qty').value = currentQuantity;
    updateTotalDisplay();
}

function updateStockDisplay(stock) {
    const stockEl = document.getElementById('prod-stock');
    const btnAddCart = document.getElementById('btn-add-cart');
    const qtyInput = document.getElementById('prod-qty');
    
    // 🍎 REEVALUAMOS SI ES BAJO PEDIDO PARA ESTA FUNCIÓN
    const isOnDemand = (currentProduct.is_on_demand === true || currentProduct.is_on_demand === 'true' || currentProduct.is_on_demand === 'True');

    if (isOnDemand) {
        // 🔮 Lógica Premium para Bajo Pedido
        stockEl.innerText = "Bajo Pedido";
        stockEl.className = "text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-md shadow-[0_0_15px_rgba(168,85,247,0.2)]";
        btnAddCart.disabled = false;
        if(qtyInput) qtyInput.max = 999; // Le permitimos comprar todo lo que quiera
        
    } else if (stock > 0) {
        // 🟢 Lógica Normal con Stock
        stockEl.innerText = `${stock} disponibles`;
        stockEl.className = "text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-md shadow-inner";
        btnAddCart.disabled = false;
        if(qtyInput) qtyInput.max = stock; // Topamos el máximo a lo que hay en inventario
        
    } else {
        // 🔴 Lógica Agotado
        stockEl.innerText = "Agotado temporalmente";
        stockEl.className = "text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-md shadow-inner";
        btnAddCart.disabled = true;
        if(qtyInput) qtyInput.max = 1;
    }
}

// ==========================================
// LÓGICA DEL SELECTOR DE CANTIDAD (+ / -)
// ==========================================
function updateQty(delta) {
    const isOnDemand = (currentProduct.is_on_demand === true || currentProduct.is_on_demand === 'true' || currentProduct.is_on_demand === 'True');
    
    // Definimos el tope basados en si eligió variante o es producto global
    let maxStock = selectedVariant ? selectedVariant.stock : (currentProduct ? currentProduct.stock : 0);
    
    // 🍎 TRAMPA MATEMÁTICA CORREGIDA: Si es Bajo Pedido, asumimos que tenemos 999 de stock lógico
    if (isOnDemand) maxStock = 999;
    
    if (maxStock <= 0) return;

    let newQty = currentQuantity + delta;
    if (newQty < 1) newQty = 1;
    if (newQty > maxStock) newQty = maxStock;

    currentQuantity = newQty;
    document.getElementById('prod-qty').value = currentQuantity;
    updateTotalDisplay();
}

function updateTotalDisplay() {
    const total = finalPrice * currentQuantity;
    document.getElementById('prod-total-price').innerText = `$${total.toFixed(2)}`;
}

// ==========================================
// COMPRA ZERO TRUST & CARRITO DINÁMICO
// ==========================================
function addToCart() {
    if (!currentProduct) return;
    
    const isOnDemand = (currentProduct.is_on_demand === true || currentProduct.is_on_demand === 'true' || currentProduct.is_on_demand === 'True');
    const hasFreeShipping = (currentProduct.free_shipping === true || currentProduct.free_shipping === 'true' || currentProduct.free_shipping === 'True');
    
    let maxStock = selectedVariant ? selectedVariant.stock : currentProduct.stock;
    
    // 🍎 TRAMPA MATEMÁTICA CORREGIDA PARA EL CARRITO
    if (isOnDemand) maxStock = 999;
    
    if (maxStock <= 0) return;

    // Generamos un ID Dinámico para el carrito.
    let cartItemId = currentProduct.id;
    let cartItemName = currentProduct.name;
    
    if (selectedVariant) {
        cartItemId = `${currentProduct.id}_${selectedVariant.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        cartItemName = `${currentProduct.name} (${selectedVariant.name})`;
    }

    const payload = {
        id: cartItemId,              
        real_id: currentProduct.id,  
        name: cartItemName,
        storeName: currentProduct.store_name, 
        price: finalPrice,
        imageUrl: currentProduct.image_url || currentProduct.imageUrl,
        qty: currentQuantity,
        maxStock: maxStock,
        weight_kg: currentProduct.weight_kg || 1, 
        // 🍎 AÑADIMOS ESTO: Le pasamos la inteligencia al Carrito
        is_on_demand: isOnDemand,
        free_shipping: hasFreeShipping
    };

    // 🛡️ ENVOLVEMOS LA ACCIÓN EN EL INTERCEPTOR DE AUTENTICACIÓN
    requireAuth(() => {
        let cart = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
        const existingIndex = cart.findIndex(item => String(item.id) === String(payload.id));

        if (existingIndex !== -1) {
            let totalQty = cart[existingIndex].qty + payload.qty;
            if (totalQty > maxStock) totalQty = maxStock;
            cart[existingIndex].qty = totalQty;
        } else {
            cart.push(payload);
        }

        localStorage.setItem('gymenez_cart', JSON.stringify(cart));
        
        // Ejecutar utilidades visuales
        if(typeof updateCartCount === 'function') updateCartCount();
        
        showToastFallback(); 
        
    }, { type: 'ADD_CART', payload: payload });
}

function showToastFallback() {
    // Si la píldora animada del HTML no existe, usamos el toast básico
    if (document.getElementById('toast-premium')) return;
    
    const toast = document.getElementById('toast-cart');
    if(toast) {
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }
}
