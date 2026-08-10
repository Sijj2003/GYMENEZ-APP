// ==========================================
// MÓDULO 2: INTERFAZ Y NAVEGACIÓN
// ==========================================

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-white/5', 'text-white', 'border-white/5');
        btn.classList.add('text-gray-500', 'border-transparent');
        const svg = btn.querySelector('svg');
        if(svg && !btn.querySelector('span.bg-red-500')) svg.classList.remove('text-[#FFC300]');
    });
    document.getElementById(tabId).classList.add('active');
    element.classList.remove('text-gray-500', 'border-transparent');
    element.classList.add('bg-white/5', 'text-white', 'border-white/5');
    const activeSvg = element.querySelector('svg');
    if(activeSvg && !element.querySelector('span.bg-red-500')) activeSvg.classList.add('text-[#FFC300]');
}

function switchTabMobile(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-[#FFC300]');
        btn.classList.add('text-gray-500');
    });
    document.getElementById(tabId).classList.add('active');
    element.classList.remove('text-gray-500');
    element.classList.add('text-[#FFC300]');
}

// Control del Modal de Productos
let modal;
let modalInner;

function initModals() {
    modal = document.getElementById('product-modal');
    modalInner = modal ? modal.querySelector('div') : null;
}

function openModal() {
    if (!modal) initModals(); 
    if (!modal) return;
    
    document.getElementById('add-product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('file-name-display').innerText = 'Tocar para subir JPG o PNG...';
    document.getElementById('btn-save-prod').innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg> Publicar Producto';
    document.getElementById('prod-image').required = true; 
    
    document.getElementById('prod-category').value = 'general';
    if(typeof toggleVariantFields === 'function') toggleVariantFields(); 

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if(window.innerWidth < 768) modalInner.classList.remove('translate-y-full');
        else modalInner.classList.remove('scale-95');
    }, 10);
}

function closeModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    if(window.innerWidth < 768) modalInner.classList.add('translate-y-full');
    else modalInner.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 400);
}

function updateFileName(input) {
    const display = document.getElementById('file-name-display');
    if (input.files && input.files[0]) {
        display.innerText = input.files[0].name;
        display.classList.remove('text-gray-400');
        display.classList.add('text-emerald-400');
    } else {
        display.innerText = 'Tocar para subir JPG o PNG...';
        display.classList.remove('text-emerald-400');
        display.classList.add('text-gray-400');
    }
}
