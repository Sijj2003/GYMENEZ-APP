let currentProduct = null;
let currentQuantity = 1;
let finalPrice = 0;

document.addEventListener('DOMContentLoaded', () => {
    updateCartCounter();
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = '/store/home.html';
        return;
    }
    loadProductData(productId);
});

async function loadProductData(id) {
    try {
        const response = await fetch(`https://sijj2003.pythonanywhere.com/api/store/catalog/${id}`);
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
        badge.innerText = `-${discount}%`;
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
        // Opcional: Mostrar una sacudida o alerta de límite alcanzado
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
// LÓGICA DEL CARRITO DE COMPRAS (LOCALSTORAGE)
// ==========================================
function addToCart() {
    if (!currentProduct || currentProduct.stock <= 0) return;

    // Leer el carrito actual
    let cart = JSON.parse(localStorage.getItem('gymenez_cart')) || [];

    // Buscar si el producto ya está en el carrito
    const existingIndex = cart.findIndex(item => item.id === currentProduct.id);

    if (existingIndex !== -1) {
        // Si existe, sumar la cantidad (validando que no exceda el stock)
        let totalQty = cart[existingIndex].quantity + currentQuantity;
        if (totalQty > currentProduct.stock) totalQty = currentProduct.stock;
        cart[existingIndex].quantity = totalQty;
    } else {
        // Si es nuevo, añadirlo al array
        cart.push({
            id: currentProduct.id,
            name: currentProduct.name,
            store_name: currentProduct.store_name,
            price: finalPrice,
            image_url: currentProduct.image_url,
            quantity: currentQuantity,
            max_stock: currentProduct.stock
        });
    }

    // Guardar en el navegador
    localStorage.setItem('gymenez_cart', JSON.stringify(cart));
    
    // Actualizar icono y mostrar Toast de confirmación
    updateCartCounter();
    showToast();
}

function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-counter').innerText = totalItems;
}

function showToast() {
    const toast = document.getElementById('toast-cart');
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
