// ==========================================
// 4. TRANSICIÓN A LA BÓVEDA Y PAYLOAD DE VARIANTES
// ==========================================
document.getElementById('btn-enter-vault').addEventListener('click', (e) => {
    const uniqueStores = new Set(cartItems.map(item => item.storeName || item.store_name || 'Gymenez Store'));
    
    if (uniqueStores.size > 1 && !hasAcceptedMultiStore) {
        document.getElementById('modal-stores-count').innerText = `${uniqueStores.size}`;
        const modal = document.getElementById('multi-store-modal');
        const modalContent = document.getElementById('multi-store-modal-content');
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95');
        }, 10);
        return; 
    }

    executeVaultEntry();
});

window.closeMultiStoreModal = function() {
    const modal = document.getElementById('multi-store-modal');
    const modalContent = document.getElementById('multi-store-modal-content');
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

window.acceptMultiStoreAndProceed = function() {
    hasAcceptedMultiStore = true; 
    closeMultiStoreModal();
    executeVaultEntry(); 
}

async function executeVaultEntry() {
    const btn = document.getElementById('btn-enter-vault');
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    btn.disabled = true;
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> <span>Reservando Inventario...</span>';

    // 🧠 PAYLOAD PERFECTO PARA EL BACKEND (Ahora incluye las banderas de logística)
    const cleanItems = cartItems.map(item => ({
        id: item.id, 
        real_id: item.real_id || item.id, 
        name: item.name,
        price: item.price,
        qty: item.quantity || item.qty || 1,
        storeName: item.storeName || item.store_name || 'Gymenez Store',
        weight_kg: item.weight_kg || 1,
        // 👇 ESCUDO 4 y 5: Le decimos a Python lo que el cliente tiene en su caché
        free_shipping: item.free_shipping === true || item.free_shipping === 'true',
        free_shipping_threshold: parseFloat(item.free_shipping_threshold || 0)
    }));

    // 👇 ESCUDO 5: Capturamos si el cliente activó el switch ANTES de entrar a la bóveda
    const toggleFreeShipping = document.getElementById('toggle-free-shipping');
    const wantsFreeShipping = toggleFreeShipping ? toggleFreeShipping.checked : false;

    try {
        const res = await fetch(`${API_BASE_URL}/api/store/checkout/reserve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            // 👇 Enviamos la variable wants_free_shipping al backend
            body: JSON.stringify({ 
                items: cleanItems,
                wants_free_shipping: wantsFreeShipping
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            // 🧠 Lógica Inteligente: Verificar si ya había un tiempo corriendo guardado en memoria
            let expiresAt = localStorage.getItem('gymen_vault_expires_at');
            
            // Si NO hay tiempo guardado o el tiempo que estaba ya expiró, creamos uno nuevo de 8 min
            if (!expiresAt || new Date().getTime() > parseInt(expiresAt)) {
                expiresAt = new Date().getTime() + (8 * 60 * 1000); 
                localStorage.setItem('gymen_vault_expires_at', expiresAt);
            } else {
                // Si recargó la página, rescatamos el tiempo exacto que le quedaba
                expiresAt = parseInt(expiresAt);
            }
            
            document.getElementById('wizard-view').classList.add('hidden');
            document.getElementById('vault-view').classList.remove('hidden');
            isCartLocked = true;
            renderCartSummary(); 
            startVaultTimer(expiresAt);

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // 👇 Si Python bloquea por precio o envíos cambiados, saldrá esta alerta roja
            alert(data.error || "Imposible reservar el inventario. Es probable que algún producto ya no tenga stock suficiente.");
            btn.disabled = false;
            btn.innerHTML = '<span>Proceder al Pago</span>';
        }
    } catch (error) {
        alert("Fallo de red al conectar con el inventario maestro.");
        btn.disabled = false;
        btn.innerHTML = '<span>Proceder al Pago</span>';
    }
}

// ==========================================
// 5. MOTOR DEL CRONÓMETRO Y CANCELACIÓN
// ==========================================
function startVaultTimer(expiresAt) {
    const timerEl = document.getElementById('vault-timer');
    clearInterval(vaultInterval);

    // Creamos la lógica en una función aislada
    function updateTimer() {
        const now = new Date().getTime();
        const distance = expiresAt - now;

        if (distance <= 0) {
            clearInterval(vaultInterval);
            handleVaultExpiration();
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Formateo 00:00
        timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Alerta roja en el último minuto
        if (distance < 60000) { 
            timerEl.classList.add('timer-danger');
        } else {
            timerEl.classList.remove('timer-danger');
        }
    }

    updateTimer(); // <-- Ejecución INMEDIATA para matar el parpadeo
    vaultInterval = setInterval(updateTimer, 1000);
}

async function handleVaultExpiration() {
    localStorage.removeItem('gymen_vault_expires_at');
    alert("⏳ ¡Sesión expirada! Los productos han sido devueltos a la tienda pública.");
    window.location.reload(); 
}

document.getElementById('btn-cancel-vault').addEventListener('click', async () => {
    const btn = document.getElementById('btn-cancel-vault');
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('jwt_token');
    
    btn.disabled = true;
    btn.innerText = 'Liberando...';
    clearInterval(vaultInterval);
    localStorage.removeItem('gymen_vault_expires_at');

    try {
        await fetch(`${API_BASE_URL}/api/store/checkout/release`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) { console.warn("Fallo en release manual."); }
    window.location.reload(); 
});
