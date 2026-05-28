const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let recoveryProtocolsPool = [];

// ==========================================
// 🎥 PARSER ATÓMICO DE YOUTUBE 
// ==========================================
function extractYoutubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ==========================================
// CONTROLADOR DEL MODAL CINEMÁTICO OVERLAY
// ==========================================
function openRecoveryOverlay(protocolId) {
    const item = recoveryProtocolsPool.find(x => x.id === protocolId);
    if (!item) return;

    const overlay = document.getElementById('video-overlay');
    const iframe = document.getElementById('overlay-iframe-player');
    
    // Extraer ID e Inyectar parámetros anti-branding para la inmersión del ecosistema
    const ytId = extractYoutubeId(item.link_tutorial);
    
    if (ytId) {
        // modestbranding=1 oculta el logo, rel=0 quita sugerencias externas, iv_load_policy=3 quita anotaciones
        iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&controls=1&color=white`;
    } else {
        iframe.src = ''; // Fallback si no hay video cargado por el administrador
    }

    // Inyectar ficha técnica
    document.getElementById('overlay-title').textContent = item.name;
    document.getElementById('overlay-desc').textContent = item.description;

    // Transición fluida de entrada
    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
    }, 10);
}

function closeRecoveryOverlay() {
    const overlay = document.getElementById('video-overlay');
    const iframe = document.getElementById('overlay-iframe-player');
    
    // Apagar opacidad
    overlay.classList.add('opacity-0');
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        iframe.src = ''; // 🟢 CRÍTICO: Matamos el src para que el video deje de sonar en segundo plano
    }, 500);
}

// ==========================================
// REPRODUCTOR Y SINCRONIZACIÓN CON BACKEND
// ==========================================
async function loadRecoveryProtocols() {
    const container = document.getElementById('recovery-pool');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/client/recovery`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            recoveryProtocolsPool = data.protocols;
            container.innerHTML = ''; // Limpiar preloader
            
            if (recoveryProtocolsPool.length === 0) {
                container.innerHTML = `<div class="col-span-full text-center py-8 text-gray-600 font-bold uppercase tracking-widest text-[10px]">No hay protocolos de descarga configurados en este momento.</div>`;
                return;
            }

            // Renderizar Bento-Cards dinámicas
            recoveryProtocolsPool.forEach((item, index) => {
                const card = document.createElement('div');
                // Estructura estilizada heredando las animaciones premium
                card.className = "glass-panel group relative overflow-hidden rounded-[28px] min-h-[160px] md:min-h-[200px] flex flex-col justify-end p-6 border border-white/5 hover:border-sky-500/50 transition-all duration-500 cursor-pointer fade-in-up";
                card.style.animationDelay = `${0.1 * (index + 1)}s`;
                
                // Ejecutar apertura al hacer click
                card.onclick = () => openRecoveryOverlay(item.id);

                card.innerHTML = `
                    <div class="absolute inset-0 z-0">
                        <img src="${item.image_url || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600'}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-50" alt="${item.name}">
                        <div class="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/60 to-transparent"></div>
                    </div>
                    <div class="relative z-10 transform transition-transform duration-300 group-hover:-translate-y-2">
                        <span class="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mb-1 block group-hover:text-sky-400 transition-colors">Protocolo 0${index + 1}</span>
                        <h3 class="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">${item.name}</h3>
                    </div>
                `;
                container.appendChild(card);
            });

        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-red-500 font-bold uppercase tracking-widest text-[10px]">❌ Error sincronizando el comando de descarga.</div>`;
    }
}

// Inicializador Core
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    loadRecoveryProtocols();
});
