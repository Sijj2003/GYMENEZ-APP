// ====================================================================
// ⚙️ CONTROLADOR PRINCIPAL DEL LANDING PAGE (INDEX)
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. ANIMACIONES DE REVELADO (SCROLL PARALLAX)
    // ==========================================
    // Configuración del observador: el elemento se revela cuando el 15% entra en pantalla
    const observerOptions = { 
        threshold: 0.15, 
        rootMargin: "0px 0px -50px 0px" 
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Añade la clase que dispara la animación CSS
                entry.target.classList.add('active');
                // Dejamos de observar el elemento para ahorrar recursos de memoria (se anima solo una vez)
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    // Seleccionamos todos los elementos con la clase .reveal y los ponemos en observación
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


    // ==========================================
    // 2. DOCK SOCIAL RETRÁCTIL (ESTILO CUPERTINO)
    // ==========================================
    const toggleBtn = document.getElementById('social-toggle-btn');
    const socialMenu = document.getElementById('social-menu');
    const iconOpen = document.getElementById('social-icon-open');
    const iconClose = document.getElementById('social-icon-close');
    
    let isMenuOpen = false;

    // Validación de seguridad para evitar errores si el HTML cambia
    if (toggleBtn && socialMenu) {
        
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el evento "click" dispare el cierre automático
            isMenuOpen = !isMenuOpen;
            
            if (isMenuOpen) {
                // 🟢 ABRIR MENÚ
                // Quitamos las clases que lo ocultan y lo empujan hacia abajo
                socialMenu.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
                // Añadimos las clases para mostrarlo en su posición original
                socialMenu.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
                
                // Animar ícono: Desvanecer y rotar el ícono de "Nodos"
                iconOpen.classList.replace('rotate-0', 'rotate-90');
                iconOpen.classList.replace('opacity-100', 'opacity-0');
                
                // Animar ícono: Aparecer el ícono de "X" (Cerrar)
                iconClose.classList.replace('-rotate-90', 'rotate-0');
                iconClose.classList.replace('opacity-0', 'opacity-100');
            } else {
                // 🔴 CERRAR MENÚ
                socialMenu.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
                socialMenu.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
                
                // Restaurar ícono de "Nodos"
                iconOpen.classList.replace('rotate-90', 'rotate-0');
                iconOpen.classList.replace('opacity-0', 'opacity-100');
                
                // Ocultar ícono de "X"
                iconClose.classList.replace('rotate-0', '-rotate-90');
                iconClose.classList.replace('opacity-100', 'opacity-0');
            }
        });

        // 🛡️ LÓGICA DE UX: Cerrar el menú si el usuario hace click fuera de él
        document.addEventListener('click', (e) => {
            if (isMenuOpen && !document.getElementById('social-dock').contains(e.target)) {
                // Si el menú está abierto y el clic NO fue dentro del Dock, simulamos un clic en el botón para cerrarlo
                toggleBtn.click();
            }
        });
    }
});
