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
            
            // Si ya estamos en esa app, no hacemos nada para ahorrar recursos
            if (frame.src.includes(targetUrl)) return;

            // Actualización Visual del Menú Activo
            navLinks.forEach(l => {
                l.classList.remove('bg-white/10', 'border-white/10', 'active');
                l.classList.add('border-transparent');
                
                // Resetear íconos a gris
                const icon = l.querySelector('svg');
                const text = l.querySelector('span:not(.bg-gradient-to-br)');
                if(icon) icon.classList.remove('text-white');
                if(icon) icon.classList.add('text-gray-500');
                if(text) text.classList.remove('text-white');
            });

            // Resaltar el botón clickeado (Estilo Glassmorphism activo)
            link.classList.add('bg-white/10', 'border-white/10', 'active');
            link.classList.remove('border-transparent');
            const activeIcon = link.querySelector('svg');
            const activeText = link.querySelector('span');
            if(activeIcon) activeIcon.classList.add('text-white');
            if(activeIcon) activeIcon.classList.remove('text-gray-500');
            if(activeText) activeText.classList.add('text-white');

            // 2. Transición Cinematográfica (Cortina de Carga)
            frame.classList.add('opacity-0'); // Ocultar iframe actual suavemente
            loader.classList.remove('hidden'); // Asegurar que el loader exista en el DOM
            
            // Esperamos un frame para que el CSS aplique el opacity
            requestAnimationFrame(() => {
                loader.classList.remove('opacity-0');
            });

            // Dar tiempo a la animación de salida (300ms) antes de cambiar la URL pesada
            setTimeout(() => {
                frame.src = targetUrl;
            }, 300);
        });
    });

    // 3. Receptor de Carga Exitosa
    // Cuando el iframe termina de descargar el módulo (ej: routines.html), levantamos la cortina
    frame.addEventListener('load', () => {
        // Solo quitamos el loader si el src no está vacío
        if (frame.src && frame.src !== window.location.href) {
            // Desvanecer el loader
            loader.classList.add('opacity-0');
            // Mostrar el iframe suavemente
            frame.classList.remove('opacity-0');
            
            // Retirar el loader del DOM tras la transición para no bloquear clics
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 500);
        }
    });

    // 4. Lógica de Cierre de Sesión Seguro (Ruta Corregida)
    btnLogout.addEventListener('click', () => {
        // Confirmación nativa ligera
        if(confirm('¿Cerrar la sesión administrativa?')) {
            localStorage.removeItem('adminSession'); 
            localStorage.removeItem('gymen_admin_token'); 
            window.location.href = '/apps/admin/login.html'; // <- RUTA CORREGIDA AQUÍ
        }
    });

    // 5. Arranque inicial del Sistema Operativo
    window.addEventListener('load', () => {
        if (navLinks.length > 0) {
            // Simulamos un clic en el primer módulo (Directorio) para que haga el ruteo automático
            navLinks[0].click();
        }
    });
});
