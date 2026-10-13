// ==========================================
// COMPRA ZERO TRUST & CARRITO DINÁMICO (VERSIÓN HACKEADA PARA PRUEBAS)
// ==========================================
function addToCart() {
    if (!currentProduct) return;
    
    const isOnDemand = (currentProduct.is_on_demand === true || currentProduct.is_on_demand === 'true' || currentProduct.is_on_demand === 'True');
    const hasFreeShipping = (currentProduct.free_shipping === true || currentProduct.free_shipping === 'true' || currentProduct.free_shipping === 'True');
    
    let maxStock = selectedVariant ? selectedVariant.stock : currentProduct.stock;
    
    if (isOnDemand) maxStock = 999;
    if (maxStock <= 0) return;

    let cartItemId = currentProduct.id;
    let cartItemName = currentProduct.name;
    
    if (selectedVariant) {
        cartItemId = `${currentProduct.id}_${selectedVariant.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        cartItemName = `${currentProduct.name} (${selectedVariant.name})`;
    }

    // 🔥 HACK INYECTADO: Ignoramos los precios reales del backend y forzamos $1.00
    console.warn("⚠️ MODO PRUEBA ACTIVO: Forzando precios a $1.00");
    const bestPriceToSave = 1.00; // Originalmente: currentProduct.display_best_price...
    const maxPriceToSave = 1.00;  // Originalmente: currentProduct.display_max_price...
    const pmPriceToSave = 1.00;   // Originalmente: currentProduct.display_pm_price...
    
    const discount = parseInt(currentProduct.discount_percentage || currentProduct.discount) || 0;

    const payload = {
        id: cartItemId,              
        real_id: currentProduct.id,  
        name: cartItemName,
        storeName: currentProduct.store_name, 
        price: bestPriceToSave,       
        pmPrice: pmPriceToSave,       
        basePrice: maxPriceToSave,    
        discount: discount,                
        imageUrl: currentProduct.image_url || currentProduct.imageUrl,
        qty: currentQuantity,
        maxStock: maxStock,
        weight_kg: currentProduct.weight_kg || 1, 
        is_on_demand: isOnDemand,
        free_shipping: hasFreeShipping,
        free_shipping_threshold: parseFloat(currentProduct.free_shipping_threshold || 0)
    };

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
        
        if(typeof updateCartCount === 'function') updateCartCount();
        showToastFallback(); 
        
    }, { type: 'ADD_CART', payload: payload });
}
