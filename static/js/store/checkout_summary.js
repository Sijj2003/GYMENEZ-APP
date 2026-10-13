// ==========================================
// 1. DIBUJAR RESUMEN DEL CARRITO (ARQUITECTURA ZERO-TRUST)
// ==========================================

// Memoria del switch de envío gratis
if (typeof window.userWantsFreeShipping === 'undefined') {
    window.userWantsFreeShipping = true;
}

window.renderCartSummary = function() {
    const container = document.getElementById('cart-items-container');
    if (container) container.innerHTML = '';
    
    let sumMaxPrices = 0;
    let sumBestPrices = 0;
    let hasOnDemand = false;
    
    const storeSet = new Set();
    const storeTotals = {};
    
    // 🧠 1. AGRUPAR Y CALCULAR
    cartItems.forEach(item => {
        const store = item.storeName || item.store_name || 'Gymenez Store';
        const qty = item.quantity || item.qty || 1;
        
        // 🍎 Leemos ambos precios guardados desde product.js
        const bestP = parseFloat(item.price); 
        const maxP = parseFloat(item.basePrice || item.price);
        
        sumBestPrices += (bestP * qty);
        sumMaxPrices += (maxP * qty);
        storeSet.add(store);
        
        if (!storeTotals[store]) {
            storeTotals[store] = { total: 0, offersFreeShipping: false, threshold: 0 }; 
        }
        storeTotals[store].total += (bestP * qty);
        
        if (item.free_shipping === true || item.free_shipping === 'true') {
            storeTotals[store].offersFreeShipping = true;
            const threshold = parseFloat(item.free_shipping_threshold || 0);
            if (threshold > storeTotals[store].threshold) storeTotals[store].threshold = threshold; 
        }
        
        if (item.is_on_demand === true || item.is_on_demand === 'true') hasOnDemand = true;
    });

    let storesWithFreeShippingEarned = 0;
    let pendingShippingHtml = '';
    const totalStores = Object.keys(storeTotals).length;

    for (const store in storeTotals) {
        if (storeTotals[store].offersFreeShipping) {
            if (storeTotals[store].total >= storeTotals[store].threshold) {
                storeTotals[store].earnedFreeShipping = true;
                storesWithFreeShippingEarned++;
            } else {
                storeTotals[store].earnedFreeShipping = false;
                const diff = storeTotals[store].threshold - storeTotals[store].total;
                pendingShippingHtml += `
                    <div class="mt-2 border-l-2 border-red-500 pl-3">
                        <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">${store}</span>
                        <span class="text-[10px] text-red-400 font-black uppercase">Agrega $${formatMoney(diff)} más para ganar Envío Gratis</span>
                    </div>
                `;
            }
        }
    }

    const isHybrid = storesWithFreeShippingEarned > 0 && storesWithFreeShippingEarned < totalStores;

    // 🧠 2. DIBUJAR PRODUCTOS
    cartItems.forEach((item, index) => {
        const qty = item.quantity || item.qty || 1;
        const bestPrice = parseFloat(item.price);
        const maxPrice = parseFloat(item.basePrice || item.price);
        const store = item.storeName || item.store_name || 'Gymenez Store';
        
        // 🍎 CÁLCULO VISUAL REAL
        let visualDiscount = 0;
        if (maxPrice > bestPrice) {
            visualDiscount = Math.round(((maxPrice - bestPrice) / maxPrice) * 100);
        }

        let displayName = item.name;
        let variantBadgeHtml = '';
        const variantMatch = item.name.match(/(.*)\s\((.*)\)$/);
        if (variantMatch) {
            displayName = variantMatch[1].trim();
            variantBadgeHtml = `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-inner inline-block">${variantMatch[2]}</span>`;
        }

        let logicBadges = '';
        if (storeTotals[store].earnedFreeShipping && (item.free_shipping === true || item.free_shipping === 'true')) {
            logicBadges += `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-inner inline-block">🚚 Envío Gratis</span>`;
        }
        if (item.is_on_demand === true || item.is_on_demand === 'true') {
            logicBadges += `<span class="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-inner inline-block">⚡ Bajo Pedido</span>`;
        }
        
        // Etiqueta roja SOLO si eligen Binance y hay descuento matemático
        if (window.currentPaymentMethod === 'binance' && visualDiscount > 0) {
            logicBadges += `<span class="bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-inner inline-block">-${visualDiscount}% OFF</span>`;
        }

        const deleteBtnHtml = isCartLocked ? '' : `<button onclick="removeCheckoutItem(${index})" class="text-gray-500 hover:text-red-500 transition-colors p-1"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>`;

        const controlsHtml = isCartLocked ? `
        <span class="text-[9px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1.5 shadow-inner">Reservado: ${qty}</span>` : `
        <div class="flex items-center bg-[#030305] rounded-full border border-white/10 h-7 shadow-inner">
            <button onclick="updateCheckoutItemQty(${index}, -1)" class="px-2.5 text-gray-400 hover:text-white font-black text-sm">-</button>
            <span class="text-[10px] font-black text-white w-3 text-center">${qty}</span>
            <button onclick="updateCheckoutItemQty(${index}, 1)" class="px-2.5 text-gray-400 hover:text-white font-black text-sm">+</button>
        </div>`;

        // 🍎 VISUAL DINÁMICO: Solo tacha si escogen Binance
        let priceVisualHtml = '';
        if (window.currentPaymentMethod === 'binance' && maxPrice > bestPrice) {
            priceVisualHtml = `
                <span class="text-[9px] text-gray-500 line-through leading-none mb-0.5 font-bold uppercase tracking-widest">$${formatMoney(maxPrice * qty)}</span>
                <span class="font-black text-white text-sm tracking-tight leading-none">$${formatMoney(bestPrice * qty)}</span>
            `;
        } else {
            priceVisualHtml = `<span class="font-black text-white text-sm tracking-tight leading-none">$${formatMoney(maxPrice * qty)}</span>`;
        }

        if(container) {
            container.innerHTML += `
            <div class="bg-[#050508]/50 p-3 rounded-[1.5rem] border ${isCartLocked ? 'border-emerald-500/30' : 'border-white/5'} mb-3">
                <div class="flex gap-3">
                    <div class="w-16 h-16 bg-white/5 rounded-xl border border-white/5 p-1 shrink-0 flex items-center justify-center">
                        <img src="${item.imageUrl || item.image_url}" class="max-h-full object-contain" alt="${displayName}">
                    </div>
                    <div class="flex-grow flex flex-col justify-between min-w-0">
                        <div class="flex justify-between items-start">
                            <div class="pr-2 min-w-0">
                                <h4 class="text-xs font-bold text-white truncate w-full">${displayName}</h4>
                                <span class="text-[8px] text-[#FFC300] uppercase font-bold tracking-widest block truncate w-full">${store}</span>
                            </div>
                            <div class="shrink-0">${deleteBtnHtml}</div>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-1">${variantBadgeHtml}${logicBadges}</div>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    ${controlsHtml}
                    <div class="flex flex-col items-end">${priceVisualHtml}</div>
                </div>
            </div>`;
        }
    });

    // 🧠 3. CÁLCULO DEL TOTAL FINAL (Dictado por el Método de Pago)
    cartTotal = (window.currentPaymentMethod === 'binance') ? sumBestPrices : sumMaxPrices;
    const currentSavings = sumMaxPrices - cartTotal;

    if(document.getElementById('summary-raw-total')) document.getElementById('summary-raw-total').innerText = `$${formatMoney(sumMaxPrices)}`;
    if(document.getElementById('summary-total')) document.getElementById('summary-total').innerText = `$${formatMoney(cartTotal)}`;
    
    const savingsRow = document.getElementById('summary-savings-row');
    const savingsVal = document.getElementById('summary-savings');

    if (savingsRow && savingsVal) {
        if (currentSavings > 0 && window.currentPaymentMethod === 'binance') {
            savingsRow.classList.remove('hidden');
            savingsVal.innerText = `-$${formatMoney(currentSavings)}`;
            savingsRow.innerHTML = `<span class="text-[10px] uppercase font-bold tracking-widest">Ahorro Binance Pay</span><span class="font-bold text-sm">-$${formatMoney(currentSavings)}</span>`;
        } else {
            savingsRow.classList.add('hidden');
        }
    }

    // 🧠 4. RENDERIZADO DE ALERTAS
    if (document.getElementById('alert-multi-store')) document.getElementById('alert-multi-store').classList.toggle('hidden', storeSet.size <= 1);
    if (document.getElementById('alert-on-demand')) document.getElementById('alert-on-demand').classList.toggle('hidden', !hasOnDemand);
    
    const alertFreeShipping = document.getElementById('alert-free-shipping');
    const shippingLabel = document.getElementById('summary-shipping-label');
    
    if (alertFreeShipping) {
        if (storesWithFreeShippingEarned > 0) {
            alertFreeShipping.classList.remove('hidden');
            alertFreeShipping.className = "bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col gap-3 mt-4";
            const checkedAttr = window.userWantsFreeShipping ? 'checked' : '';
            alertFreeShipping.innerHTML = `
                <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                    <div class="pr-2">
                        <span class="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">¡Envío Gratis Desbloqueado!</span>
                        <p class="text-[10px] text-gray-400 leading-relaxed">Tu orden superó el mínimo requerido.</p>
                    </div>
                </div>
                <div class="flex items-center justify-between border-t border-emerald-500/20 pt-3 mt-1">
                    <span class="text-[10px] font-bold text-white uppercase tracking-widest">¿Activar Envío Gratis?</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="toggle-free-shipping" class="sr-only peer" ${checkedAttr} onchange="updateShippingLabelUI(this.checked, ${isHybrid})">
                        <div class="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                </div>
                ${pendingShippingHtml}
            `;
            if (shippingLabel) shippingLabel.innerText = window.userWantsFreeShipping ? (isHybrid ? "Híbrido" : "Gratis") : "Cobro a Destino";
            
        } else if (pendingShippingHtml !== '') {
            alertFreeShipping.classList.remove('hidden');
            alertFreeShipping.className = "bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex flex-col gap-3 mt-4";
            alertFreeShipping.innerHTML = `
                <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-[#FFC300] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <div class="pr-2 w-full">
                        <span class="block text-xs font-bold text-[#FFC300] uppercase tracking-widest mb-1">Envío Gratis No Alcanzado</span>
                        ${pendingShippingHtml}
                    </div>
                </div>
            `;
            if (shippingLabel) shippingLabel.innerText = "Cobro a Destino";
        } else {
            alertFreeShipping.classList.add('hidden');
            if (shippingLabel) shippingLabel.innerText = "Cobro a Destino";
        }
    }

    const vesContainer = document.getElementById('summary-ves-container');
    const warningMsg = document.getElementById('bcv-warning-msg');
    const btnProcess = document.getElementById('btn-process-order');

    if (isBcvValid && currentBcvRate > 0) {
        const totalBs = formatMoney(cartTotal * currentBcvRate);
        if(document.getElementById('summary-total-ves')) document.getElementById('summary-total-ves').innerText = `Bs. ${totalBs}`;
        if(document.getElementById('bcv-rate-display')) document.getElementById('bcv-rate-display').innerText = `Tasa Oficial BCV: Bs. ${formatMoney(currentBcvRate)}`;
        if(vesContainer) vesContainer.classList.remove('hidden');
        if(warningMsg) warningMsg.classList.add('hidden');
        if(window.currentPaymentMethod === 'pago_movil' && btnProcess) btnProcess.querySelector('span').innerText = `Pagar Bs. ${totalBs}`;
    } else {
        if(vesContainer) vesContainer.classList.add('hidden');
        if(warningMsg) warningMsg.classList.remove('hidden');
        if(window.currentPaymentMethod === 'pago_movil' && btnProcess) btnProcess.querySelector('span').innerText = `Completar Compra (Calcular BCV)`;
    }

    if (cartItems.length === 0) {
        document.getElementById('checkout-content')?.classList.remove('hidden'); 
        document.getElementById('checkout-container')?.classList.add('hidden'); 
        document.getElementById('empty-cart-msg')?.classList.remove('hidden'); 
    } else {
        document.getElementById('checkout-container')?.classList.remove('hidden');
        document.getElementById('empty-cart-msg')?.classList.add('hidden');
    }
}

window.updateShippingLabelUI = function(isChecked, isHybrid) {
    window.userWantsFreeShipping = isChecked; 
    const shippingLabel = document.getElementById('summary-shipping-label');
    if (shippingLabel) {
        shippingLabel.innerText = isChecked ? (isHybrid ? "Híbrido" : "Gratis") : "Cobro a Destino";
    }
};

window.updateCheckoutItemQty = function(index, delta) {
    if (isCartLocked) return;
    let item = cartItems[index];
    let newQty = (item.quantity || item.qty || 1) + delta;
    if (newQty < 1) newQty = 1;
    const max = item.maxStock || item.max_stock || 99; 
    if (newQty > max) newQty = max;
    item.qty = newQty;
    item.quantity = newQty; 
    saveAndReRenderCart();
};

window.removeCheckoutItem = function(index) {
    if (isCartLocked) return;
    cartItems.splice(index, 1);
    saveAndReRenderCart();
};

function saveAndReRenderCart() {
    localStorage.setItem('gymenez_cart', JSON.stringify(cartItems));
    if(typeof window.renderCartSummary === 'function') window.renderCartSummary();
    
    const totalItems = cartItems.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
    const badgeDesktop = document.getElementById('cartCountDesktop');
    const badgeMobile = document.getElementById('cartCountMobile');
    
    if (badgeDesktop) badgeDesktop.innerText = totalItems;
    if (badgeMobile) {
        badgeMobile.innerText = totalItems;
        if(totalItems > 0) badgeMobile.classList.remove('hidden');
        else badgeMobile.classList.add('hidden');
    }
}
