// ====================================================================
// ⚙️ CONFIGURACIÓN DE RED (ADMIN_TOKEN_KEY viene del middleware)
// ====================================================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM (App Shell)
    const frame = document.getElementById('os-frame');
    const loader = document.getElementById('os-loader');
    const navLinks = document.querySelectorAll('.os-nav-link');
    
    // Referencias de Seguridad
    const btnLogoutMobile = document.getElementById('btn-logout');
    const btnLogoutDesktop = document.getElementById('btn-logout-desktop');
    const btnDevices = document.getElementById('btn-devices'); 
    const modalDevices = document.getElementById('devices-modal'); 
    const listDevices = document.getElementById('devices-list');

    // ====================================================================
    // 1. LÓGICA DE NAVEGACIÓN "APP SHELL"
    // ====================================================================
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetUrl = link.getAttribute('data-url');
            
            if (frame.src.includes(targetUrl)) return;

            // Limpiar visualmente todos los botones
            navLinks.forEach(l => {
                l.classList.remove('bg-white/10', 'border-white/10', 'active');
                l.classList.add('border-transparent');
                
                const icon = l.querySelector('svg');
                const text = l.querySelector('span:not(.bg-gradient-to-br)');
                if(icon) { icon.classList.remove('text-white'); icon.classList.add('text-gray-500'); }
                if(text) text.classList.remove('text-white');
            });

            // Resaltar el botón activo
            link.classList.add('bg-white/10', 'border-white/10', 'active');
            link.classList.remove('border-transparent');
            const activeIcon = link.querySelector('svg');
            const activeText = link.querySelector('span');
            if(activeIcon) { activeIcon.classList.add('text-white'); activeIcon.classList.remove('text-gray-500'); }
            if(activeText) activeText.classList.add('text-white');

            // Transición Cinematográfica
            frame.classList.add('opacity-0'); 
            loader.classList.remove('hidden'); 
            
            requestAnimationFrame(() => loader.classList.remove('opacity-0'));

            // 🔥 CORRECCIÓN: Prevención del Efecto Inception (Bug del Botón Atrás)
            setTimeout(() => {
                if (frame.contentWindow) {
                    frame.contentWindow.location.replace(targetUrl);
                } else {
                    frame.src = targetUrl;
                }
            }, 300);
        });
    });

    frame.addEventListener('load', () => {
        if (frame.src && frame.src !== window.location.href) {
            loader.classList.add('opacity-0');
            frame.classList.remove('opacity-0');
            setTimeout(() => loader.classList.add('hidden'), 500);
        }
    });

    // Arranque inicial automático
    if (navLinks.length > 0) {
        setTimeout(() => navLinks[0].click(), 100);
    }

    // ====================================================================
    // 2. LÓGICA DE CIERRE DE SESIÓN SEGURO (Móvil y Desktop)
    // ====================================================================
    async function executeLogout(btnElement) {
        if(confirm('¿Cerrar la sesión administrativa de este dispositivo?')) {
            const token = localStorage.getItem(ADMIN_TOKEN_KEY);
            
            if(btnElement) {
                btnElement.innerHTML = `<div class="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>`;
                btnElement.disabled = true;
            }

            try {
                if (token) {
                    await fetch(`${API_BASE_URL}/api/admin/logout`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            } catch (e) {
                console.warn("Falla de red. Limpiando caché localmente.");
            } finally {
                localStorage.removeItem('adminSession'); 
                localStorage.removeItem(ADMIN_TOKEN_KEY); 
                window.top.location.href = '/apps/admin/login.html'; 
            }
        }
    }

    if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', () => executeLogout(btnLogoutMobile));
    if (btnLogoutDesktop) btnLogoutDesktop.addEventListener('click', () => executeLogout(btnLogoutDesktop));

    // ====================================================================
    // 🛡️ 3. GESTOR DE DISPOSITIVOS (SESIONES ACTIVAS)
    // ====================================================================
    if (btnDevices) btnDevices.addEventListener('click', loadActiveSessions);

    window.closeDevicesModal = function() {
        if (modalDevices) {
            modalDevices.classList.add('opacity-0');
            setTimeout(() => modalDevices.classList.add('hidden'), 300);
        }
    };

    async function loadActiveSessions() {
        if (!modalDevices || !listDevices) return;
        
        modalDevices.classList.remove('hidden');
        setTimeout(() => modalDevices.classList.remove('opacity-0'), 10);
        
        listDevices.innerHTML = `<div class="flex justify-center py-8"><div class="w-8 h-8 border-4 border-[#FFC300] border-t-transparent rounded-full animate-spin"></div></div>`;

        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.success) renderSessions(data.devices);
            else listDevices.innerHTML = `<p class="text-center text-red-500 font-bold text-xs uppercase tracking-widest py-4">Error cargando sesiones</p>`;
        } catch (e) {
            listDevices.innerHTML = `<p class="text-center text-red-500 font-bold text-xs uppercase tracking-widest py-4">Falla de conexión de red</p>`;
        }
    }

    function renderSessions(devices) {
        listDevices.innerHTML = '';
        
        let currentSid = '';
        try {
            const token = localStorage.getItem(ADMIN_TOKEN_KEY);
            if (token) {
                const base64Url = token.split('.')[1];
                const payload = JSON.parse(decodeURIComponent(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
                currentSid = payload.sid;
            }
        } catch (e) {}

        devices.forEach((dev) => {
            const isCurrent = dev.session_id === currentSid;
            const dateObj = new Date(dev.date);
            const dateStr = !isNaN(dateObj) ? dateObj.toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha desconocida';
            
            let deviceName = "Dispositivo Desconocido";
            if (dev.device.includes("iPhone") || dev.device.includes("iPad")) deviceName = "Apple iOS";
            else if (dev.device.includes("Mac OS")) deviceName = "Apple macOS";
            else if (dev.device.includes("Windows")) deviceName = "PC Windows";
            else if (dev.device.includes("Android")) deviceName = "Android Device";

            const bgClass = isCurrent ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/10';
            const badge = isCurrent ? `<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-black ml-2 shadow-[0_0_10px_rgba(16,185,129,0.4)]">Actual</span>` : '';
            
            listDevices.innerHTML += `
                <div class="p-4 rounded-2xl border ${bgClass} flex justify-between items-center transition-all hover:bg-white/5">
                    <div>
                        <div class="flex items-center mb-1">
                            <h4 class="text-xs font-black text-white uppercase tracking-widest">${deviceName} ${badge}</h4>
                        </div>
                        <p class="text-[9px] text-gray-400 font-mono">IP: ${dev.ip}</p>
                        <p class="text-[8px] text-gray-500 uppercase font-bold tracking-widest mt-1">Conectado: ${dateStr}</p>
                    </div>
                    ${!isCurrent ? `
                    <button onclick="revokeSession('${dev.session_id}')" class="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 shrink-0 shadow-sm" title="Expulsar Dispositivo">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"></path></svg>
                    </button>
                    ` : ''}
                </div>
            `;
        });
    }

    window.revokeSession = async function(sessionId) {
        if(!confirm("⚠️ ADVERTENCIA: ¿Estás seguro de expulsar este dispositivo de la red? Perderá el acceso de inmediato.")) return;
        
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && data.success) loadActiveSessions(); 
            else alert(data.error || "Error al intentar expulsar el dispositivo.");
        } catch (e) {
            alert("Falla de conexión de red.");
        }
    };
});
