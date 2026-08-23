/**
 * Gymenez OS - Core Injector (SPA Engine Nivel Apple)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar la app por defecto (Directorio 360)
    loadApp('users');

    // 2. Lógica del Omnibar (Cmd/Ctrl + K)
    const omnibar = document.getElementById('omnibar-search');
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            omnibar.focus();
        }
    });
});

/**
 * Función maestra de enrutamiento SPA
 */
async function loadApp(appName) {
    const loader = document.getElementById('os-loader');
    const container = document.getElementById('module-container');
    const navItems = document.querySelectorAll('.nav-item');

    // 1. Actualizar UI de la barra lateral
    navItems.forEach(btn => btn.classList.remove('active'));
    // Busca el botón que hizo clic por su atributo onclick
    const activeBtn = Array.from(navItems).find(btn => btn.getAttribute('onclick')?.includes(appName));
    if (activeBtn) activeBtn.classList.add('active');

    // 2. Mostrar Loader
    loader.classList.remove('hidden');
    container.innerHTML = ''; 

    try {
        // 3. Fetching del HTML de la "App"
        // Asegúrate de que las rutas coincidan con tu servidor
        const response = await fetch(`/apps/admin/${appName}.html`);
        if (!response.ok) throw new Error(`Error 404: App ${appName} no encontrada.`);
        const htmlText = await response.text();

        // 4. Parsear HTML y aislar el contenido útil
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        // Magia: Buscamos cualquier contenedor principal dentro del body de la app vieja
        // (Por ejemplo, todo lo que no sea un script o el propio header que ya no necesitamos)
        const appBody = doc.body;
        
        // Creamos un wrapper temporal para la animación
        const wrapper = document.createElement('div');
        wrapper.className = 'w-full h-full overflow-hidden flex';
        
        // Mover nodos (Ignorando Scripts viejos y headers redundantes si los hay)
        Array.from(appBody.childNodes).forEach(node => {
            if (node.tagName !== 'SCRIPT') {
                wrapper.appendChild(node.cloneNode(true));
            }
        });

        container.appendChild(wrapper);

        // 5. Inyectar Scripts dinámicamente
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(oldScript => {
            // No recargamos tailwind ni middlewares globales
            if (oldScript.src && (oldScript.src.includes('tailwindcss') || oldScript.src.includes('admin_middleware'))) return;

            const newScript = document.createElement('script');
            if (oldScript.src) newScript.src = oldScript.src;
            else newScript.textContent = oldScript.innerHTML;
            document.body.appendChild(newScript);
        });

        // 6. Terminar transición
        setTimeout(() => {
            loader.classList.add('hidden');
            // Retrigger fade animation
            container.classList.remove('fade-enter');
            void container.offsetWidth; // trigger reflow
            container.classList.add('fade-enter');
        }, 200);

    } catch (error) {
        console.error("Error OS:", error);
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center">
                <div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500 border border-red-500/20">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <h3 class="text-lg font-bold text-white tracking-tight">App no disponible</h3>
                <p class="text-sm text-gray-500 mt-1">El módulo ${appName} no se pudo cargar.</p>
            </div>
        `;
        loader.classList.add('hidden');
    }
}

// Global System Toast (Reemplaza alert y message-box)
window.showOSMessage = function(msg, type = 'success') {
    const toast = document.getElementById('global-toast');
    const msgEl = document.getElementById('toast-msg');
    const iconEl = document.getElementById('toast-icon');

    msgEl.innerText = msg;
    
    if (type === 'error') {
        iconEl.innerHTML = '<svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
    } else {
        iconEl.innerHTML = '<svg class="w-4 h-4 text-[#FFC300]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    }

    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)'; // Baja a su posición

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)'; // Sube y desaparece
    }, 3000);
};
