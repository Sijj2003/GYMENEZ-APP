// Configuración de API
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Generador atómico de tarjetas Pulse
function createPulseCard(notification) {
    const card = document.createElement('div');
    
    // Categorización inteligente para colorimetría y tags de la marca
    const category = (notification.category || 'general').toLowerCase();
    let themeClasses = "border-white/5 bg-white/[0.01]";
    let dotClass = "bg-gray-400 shadow-[0_0_10px_rgba(156,163,175,0.5)]";
    let tagLabel = "Anuncio";

    if (category === 'oferta') {
        themeClasses = "border-[#FFC300]/10 bg-gradient-to-r from-[#FFC300]/5 to-transparent";
        dotClass = "bg-[#FFC300] shadow-[0_0_10px_#FFC300]";
        tagLabel = "Oferta Exclusiva";
    } else if (category === 'alerta' || category === 'critico') {
        themeClasses = "border-red-500/10 bg-gradient-to-r from-red-500/[0.02] to-transparent";
        dotClass = "bg-red-500 shadow-[0_0_10px_#ef4444]";
        tagLabel = "Alerta Sistema";
    } else if (category === 'comunidad') {
        themeClasses = "border-sky-500/10 bg-gradient-to-r from-sky-500/[0.02] to-transparent";
        dotClass = "bg-sky-400 shadow-[0_0_10px_#38bdf8]";
        tagLabel = "Comunidad";
    }

    card.className = `glass-panel rounded-2xl md:rounded-3xl p-5 md:p-6 border flex flex-col justify-between transition-all duration-300 hover:border-white/10 group ${themeClasses}`;
    
    // Formatear la fecha para que luzca limpia
    const messageDate = notification.created_at ? new Date(notification.created_at).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }) : 'Reciente';

    card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2.5">
                <span class="w-2 h-2 rounded-full ${dotClass}"></span>
                <span class="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">${tagLabel}</span>
            </div>
            <span class="text-[8px] font-bold font-mono uppercase text-gray-600">${messageDate}</span>
        </div>
        <div>
            <h4 class="text-base md:text-lg font-black uppercase tracking-tighter text-white mb-1.5">${notification.title || 'Comunicado Central'}</h4>
            <p class="text-gray-400 text-xs md:text-sm font-medium leading-relaxed break-words">${notification.message || ''}</p>
        </div>
    `;
    
    return card;
}

// Motor Principal de Carga
window.addEventListener('DOMContentLoaded', async () => {
    // Quitar cortina de difuminado inicial del body
    document.body.classList.add('loaded');

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    const spinner = document.getElementById('loading-spinner');
    const container = document.getElementById('pulse-container');
    const emptyState = document.getElementById('pulse-empty-state');

    try {
        // Hacemos el fetch al endpoint del backend para capturar las notificaciones globales
        const response = await fetch(`${API_BASE_URL}/api/client/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Fallo de comunicación.");

        const data = await response.json();
        const list = data.notifications || [];

        // Apagar spinner
        if (spinner) spinner.classList.add('hidden');

        if (list.length === 0) {
            // Activar estado vacío de alta gama si no hay nada en la colección
            if (emptyState) emptyState.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('flex');
        } else {
            // Limpiar contenedor e inyectar cada tarjeta de forma limpia
            container.innerHTML = '';
            list.forEach(item => {
                container.appendChild(createPulseCard(item));
            });
            
            // Mostrar bloque principal
            container.classList.remove('hidden');
            container.classList.add('flex');
        }

    } catch (error) {
        console.error("Error sincronizando PULSE:", error);
        if (spinner) {
            spinner.innerHTML = '<p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">❌ Falla de Enlace de Datos Central.</p>';
        }
    }
});
