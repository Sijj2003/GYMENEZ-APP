let currentProduct = null;
let currentQuantity = 1;
let finalPrice = 0;

const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

document.addEventListener('DOMContentLoaded', () => {
    // store_core.js maneja globalmente updateCartCount() de fondo
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = '/store/home.html';
        return;
    }
    loadProductData(productId);
});

async function loadProductData(id) {
    // ⚡ ESTRATEGIA APPLE: Buscar primero en Caché del Catálogo para velocidad instantánea
    const cachedCatalog = sessionStorage.getItem('gymenez_catalog');
    
    if (cachedCatalog) {
        const catalogArray = JSON.parse(cachedCatalog);
        const foundProduct = catalogArray.find(p => p.id === id);
        
        if (foundProduct) {
            currentProduct = foundProduct;
            renderProduct();
            return; // Salimos de la función sin tocar el backend
        }
    }

    // 🌍 ESTRATEGIA B: Si no hay caché (alguien abrió un enlace directo)
    try {
        const response = await fetch(`${API_BASE_URL}/api/store/catalog/${id}`);
        const data = await response.json();

        if (response.ok && data.success) {
            currentProduct = data.product;
            renderProduct();
        } else {
            alert("El producto no existe o fue eliminado.");
            window.location.href = '/store/home.html';
        }
    } catch (error) {
        console.error("Error cargando producto:", error);
    }
}

function renderProduct() {
    // Esconder Spinner y Mostrar Contenedor
    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('product-container').classList.remove('hidden');

    // Llenar Datos Visuales
    document.getElementById('prod-img').src = currentProduct.image_url;
    document.getElementById('prod-title').innerText = currentProduct.name;
    document.getElementById('prod-store').innerText = currentProduct.store_name || "Gymenez Partner";
    document.getElementById('prod-desc').innerText = currentProduct.description || "Sin descripción disponible.";
    
    // Control de Stock
    const stockEl = document.getElementById('prod-stock');
    if (currentProduct.stock > 0) {
        stockEl.innerText = `${currentProduct.stock} unidades disponibles`;
    } else {
        stockEl.innerText = "Agotado";
        stockEl.classList.replace('text-emerald-400', 'text-red-500');
        document.getElementById('btn-add-cart').disabled = true;
        document.getElementById('btn-add-cart').classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Calcular Precio y Descuento
    const basePrice = parseFloat(currentProduct.price_usd);
    const discount = parseInt(currentProduct.discount_percentage) || 0;
    
    if (discount > 0) {
        finalPrice = basePrice - (basePrice * (discount / 100));
        document.getElementById('prod-old-price').innerText = `$${basePrice.toFixed(2)}`;
        document.getElementById('prod-old-price').classList.remove('hidden');
        
        const badge = document.getElementById('prod-discount-badge');
        badge.innerText = `-${discount}% OFF`; // Ajustado al estándar de la tienda
        badge.classList.remove('hidden');
    } else {
        finalPrice = basePrice;
    }

    document.getElementById('prod-price').innerText = `$${finalPrice.toFixed(2)}`;
    updateTotalDisplay();
}

// ==========================================
// LÓGICA DEL SELECTOR DE CANTIDAD
// ==========================================
function updateQty(delta) {
    if (!currentProduct || currentProduct.stock <= 0) return;

    let newQty = currentQuantity + delta;
    
    // No bajar de 1, no subir más allá del stock disponible
    if (newQty < 1) newQty = 1;
    if (newQty > currentProduct.stock) {
        newQty = currentProduct.stock;
    }

    currentQuantity = newQty;
    document.getElementById('prod-qty').value = currentQuantity;
    updateTotalDisplay();
}

function updateTotalDisplay() {
    const total = finalPrice * currentQuantity;
    document.getElementById('prod-total-price').innerText = `$${total.toFixed(2)}`;
}

// ==========================================
// LÓGICA DE COMPRA PROTEGIDA (ZERO TRUST)
// ==========================================
function addToCart() {
    if (!currentProduct || currentProduct.stock <= 0) return;

    // Preparamos los datos con el formato que entiende store_core.js y el checkout
    const payload = {
        id: currentProduct.id,
        name: currentProduct.name,
        storeName: currentProduct.store_name, // Estandarizado camelCase para store_core
        price: finalPrice,
        imageUrl: currentProduct.image_url,
        qty: currentQuantity,
        maxStock: currentProduct.stock
    };

    // 🛡️ ENVOLVEMOS LA ACCIÓN EN EL INTERCEPTOR DE AUTENTICACIÓN
    requireAuth(() => {
        // Leer el carrito actual
        let cart = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
        const existingIndex = cart.findIndex(item => item.id === payload.id);

        if (existingIndex !== -1) {
            // Si existe, sumar la cantidad validando stock
            let totalQty = cart[existingIndex].qty + payload.qty;
            if (totalQty > currentProduct.stock) totalQty = currentProduct.stock;
            cart[existingIndex].qty = totalQty;
        } else {
            // Si es nuevo, añadirlo
            cart.push(payload);
        }

        // Guardar en LocalStorage
        localStorage.setItem('gymenez_cart', JSON.stringify(cart));
        
        // Ejecutar utilidades de store_core.js
        if(typeof updateCartCount === 'function') updateCartCount();
        
        showToast(); // Mostrar notificación visual
        
    }, { type: 'ADD_CART', payload: payload });
}

function showToast() {
    const toast = document.getElementById('toast-cart');
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
