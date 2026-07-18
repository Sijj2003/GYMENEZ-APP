// ====================================================================
// GYMENEZ STORE CORE - INTERCEPTOR DE SESIÓN Y GESTOR DE CARRITO
// ====================================================================

const CART_KEY = 'gymenez_cart';
const TOKEN_KEY = 'jwt_token';
const PENDING_ACTION_KEY = 'gymenez_pending_action';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Actualizar el contador del carrito visualmente al cargar
    updateCartCount();
    
    // 2. Resolver acciones que quedaron pausadas (Ej: Añadir al carrito post-login)
    resolvePendingActions();
});

// ==========================================
// 🛒 MANEJO DEL CARRITO (LOCALSTORAGE)
// ==========================================
function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((acc, item) => acc + (item.qty || 1), 0);
    
    const countEl = document.getElementById('cartCount');
    if (countEl) {
        countEl.innerText = totalItems;
        
        // Pequeña animación "pop" (estilo Apple) al actualizar el número
        countEl.style.transform = 'scale(1.5)';
        countEl.style.transition = 'transform 0.2s ease-out';
        setTimeout(() => {
            countEl.style.transform = 'scale(1)';
        }, 200);
    }
}

// ==========================================
// 🛡️ EL INTERCEPTOR DE AUTENTICACIÓN
// ==========================================
function requireAuth(actionCallback, actionData) {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
        // 🚨 NO HAY SESIÓN: Congelamos la acción en la memoria a corto plazo
        const pendingState = {
            action: actionData,
            returnUrl: window.location.href // Guardamos exactamente de dónde viene
        };
        sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(pendingState));
        
        // Lo enviamos elegantemente al login
        window.location.href = '/apps/start/login.html';
        return;
    }

    // ✅ HAY SESIÓN: Dejamos que la acción ocurra inmediatamente
    actionCallback();
}

// ==========================================
// 🔄 RESOLUTOR DE ACCIONES (POST-LOGIN)
// ==========================================
function resolvePendingActions() {
    const token = localStorage.getItem(TOKEN_KEY);
    const pendingActionRaw = sessionStorage.getItem(PENDING_ACTION_KEY);

    // Si el usuario acaba de volver del login y hay una orden pendiente...
    if (token && pendingActionRaw) {
        const pendingState = JSON.parse(pendingActionRaw);
        
        // Purgamos la memoria inmediatamente para no repetir la acción al recargar
        sessionStorage.removeItem(PENDING_ACTION_KEY);

        // Identificamos el tipo de acción y la ejecutamos
        if (pendingState.action && pendingState.action.type === 'ADD_CART') {
            // Se ejecuta de forma 100% invisible para el usuario
            executeAddToCart(pendingState.action.payload);
        }
    }
}

// ==========================================
// 🛍️ FUNCIÓN PÚBLICA PARA BOTONES DE COMPRA
// ==========================================
function handleAddToCart(id, name, price, imageUrl, storeName) {
    const payload = { id, name, price, imageUrl, storeName, qty: 1 };
    
    // Envolvemos la ejecución en nuestro escudo protector requireAuth
    requireAuth(() => {
        executeAddToCart(payload);
    }, { type: 'ADD_CART', payload });
}

function executeAddToCart(product) {
    let cart = getCart();
    
    // Verificamos si el producto ya existe en el carrito
    let existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.qty += 1; // Sumamos cantidad
    } else {
        cart.push(product); // Añadimos como nuevo
    }

    saveCart(cart);
    
    // Feedback visual elegante
    showToast(`¡Añadido al carrito con éxito!`);
}

// ==========================================
// 🔔 UI FEEDBACK (TOAST NOTIFICATION)
// ==========================================
function showToast(message) {
    // Evitamos duplicar toasts
    const existingToast = document.getElementById('gymenez-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'gymenez-toast';
    // Usamos tus mismas clases de Tailwind (glass-panel) para la estética
    toast.className = 'fixed bottom-6 right-6 z-[9999] bg-[#0a0a0f]/90 backdrop-blur-md px-6 py-3.5 rounded-full border border-[#FFC300]/30 text-white text-[10px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,195,0,0.15)] flex items-center gap-3 transform translate-y-12 opacity-0 transition-all duration-300 ease-out';
    
    toast.innerHTML = `
        <span class="w-5 h-5 rounded-full bg-[#FFC300] flex items-center justify-center text-black">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </span>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Entrada animada
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-12', 'opacity-0');
    });

    // Salida animada después de 3.5 segundos
    setTimeout(() => {
        toast.classList.add('translate-y-12', 'opacity-0');
        setTimeout(() => toast.remove(), 300); // Esperar a que acabe la animación
    }, 3500);
}
