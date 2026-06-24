document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const frame = document.getElementById('os-frame');
    const loader = document.getElementById('os-loader');
    const navLinks = document.querySelectorAll('.os-nav-link');
    const btnLogout = document.getElementById('btn-logout');

    // 1. Lógica de Navegación "App Shell"
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetUrl = link.getAttribute('data-url');
            
            // Si ya estamos en esa app, no hacemos nada
            if (frame.src.includes(targetUrl)) return;

            // Actualización Visual del Menú Activo
            navLinks.forEach(l => {
                l.classList.remove('bg-white/10', 'border-white/10', 'active');
                l.classList.add('border-transparent');
                
                const icon = l.querySelector('svg');
                const text = l.querySelector('span:not(.bg-gradient-to-br)');
                if(icon) icon.classList.remove('text-white');
                if(icon) icon.classList.add('text-gray-500');
                if(text) text.classList.remove('text-white');
            });

            // Resaltar el botón clickeado
            link.classList.add('bg-white/10', 'border-white/10', 'active');
            link.classList.remove('border-transparent');
            const activeIcon = link.querySelector('svg');
            const activeText = link.querySelector('span');
            if(activeIcon) activeIcon.classList.add('text-white');
            if(activeIcon) activeIcon.classList.remove('text-gray-500');
            if(activeText) activeText.classList.add('text-white');

            // 2. Transición Cinematográfica
            frame.classList.add('opacity-0'); 
            loader.classList.remove('hidden'); 
            
            requestAnimationFrame(() => {
                loader.classList.remove('opacity-0');
            });

            setTimeout(() => {
                frame.src = targetUrl;
            }, 300);
        });
    });

    // 3. Receptor de Carga Exitosa del Iframe
    frame.addEventListener('load', () => {
        if (frame.src && frame.src !== window.location.href) {
            loader.classList.add('opacity-0');
            frame.classList.remove('opacity-0');
            
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 500);
        }
    });

    // 4. Lógica de Cierre de Sesión Seguro (Forzando escape del iframe)
    btnLogout.addEventListener('click', () => {
        if(confirm('¿Cerrar la sesión administrativa?')) {
            localStorage.removeItem('adminSession'); 
            localStorage.removeItem('gymen_admin_token'); 
            // Usamos window.top para asegurar que toda la ventana vaya al login, no solo el iframe
            window.top.location.href = '/apps/admin/login.html'; 
        }
    });

    // 5. Arranque inicial seguro (Remplaza el frame.onload defectuoso)
    if (navLinks.length > 0) {
        setTimeout(() => {
            // Simulamos el clic en "Directorio 360" para arrancar el sistema
            navLinks[0].click();
        }, 100);
    }
});
