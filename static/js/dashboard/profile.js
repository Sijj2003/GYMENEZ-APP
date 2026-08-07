const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

async function loadAthleteBiometricsDashboard() {
    // Busca el token bajo los nombres estándar de tu ecosistema de autenticación
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token') || localStorage.getItem('admin_token');
    
    const spinner = document.getElementById('loading-spinner');
    const content = document.getElementById('profile-content');
    const requestContainer = document.getElementById('request-metrics-container');

    if (!token) {
        if (spinner) spinner.innerHTML = `<p class="text-red-400 text-[10px] font-black uppercase tracking-widest">Sesión Inexistente o Expirada</p>`;
        return;
    }

    try {
        // 🔄 PETICIÓN DOBLE: Consultamos métricas Y perfil en paralelo para tener ambas bases de datos
        const [resMetrics, resProfile] = await Promise.all([
            fetch(`${API_BASE_URL}/api/client/metrics`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }),
            fetch(`${API_BASE_URL}/api/profile/me`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
        ]);

        const dataMetrics = await resMetrics.json();
        const dataProfile = await resProfile.json();

        if (dataMetrics.success && dataProfile.success) {
            const m = dataMetrics.metrics || {};   // <--- Aquí vienen tus medidas corporales
            const p = dataProfile.profile || {};   // <--- Aquí viene tu fecha de vencimiento y nivel

            // Si el atleta no tiene registros de composición corporal, activamos el botón de solicitud
            if (!m.weight && !m.height && requestContainer) {
                requestContainer.classList.remove('hidden');
            }

            // Inyector Defensivo: Evita bloqueos fatales si un ID cambia en el HTML
            const safeInject = (elementId, value, fallback = '--') => {
                const target = document.getElementById(elementId);
                if (target) {
                    target.textContent = (value !== undefined && value !== null && value !== '') ? value : fallback;
                }
            };
            
            // 1. ACOPLAMIENTO DE TARJETA DE IDENTIDAD
            if (p) {
                console.log("Datos del backend:", p);
                
                safeInject('p-fullname', `${p.name || ''} ${p.last_name || ''}`.trim());
                safeInject('p-email', p.email);
                safeInject('p-dob', p.dob);
                safeInject('p-sex', p.sex);
                safeInject('p-active-since', p.activo_desde);
                
                const subBadge = document.getElementById('p-subscription');
                if (subBadge && p.subscription_level) {
                    subBadge.textContent = p.subscription_level;
                    // Cambios estéticos de la Bento-Card según nivel
                    if (p.subscription_level === 'ULTRA') {
                        subBadge.className = "px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[8px] md:text-[9px] font-black rounded border border-cyan-500/20 uppercase tracking-widest inline-block mb-4 shadow-sm";
                    } else if (p.subscription_level === 'PLUS') {
                        subBadge.className = "px-3 py-1 bg-purple-500/10 text-purple-400 text-[8px] md:text-[9px] font-black rounded border border-purple-500/20 uppercase tracking-widest inline-block mb-4 shadow-sm";
                    } else {
                        subBadge.className = "px-3 py-1 bg-gray-500/10 text-gray-400 text-[8px] md:text-[9px] font-black rounded border border-gray-500/20 uppercase tracking-widest inline-block mb-4 shadow-sm";
                    }
                }

                // Lógica de inyección para la fecha de vencimiento
                const expireText = (p.subscription_level && p.subscription_level.toUpperCase() === 'BASICO') 
                    ? 'ILIMITADO' 
                    : p.subscription_expires_at;
                
                safeInject('p-subscription-expire', expireText);
            }

            // 2. ACOPLAMIENTO DE MÉTRICAS BASE
            safeInject('m-peso', m.weight);
            safeInject('m-estatura', m.height);
            safeInject('m-edad', m.age);
            safeInject('m-grasa', m.fat_percent ? `${m.fat_percent}%` : '--');
            safeInject('m-musculo', m.muscle_percent ? `${m.muscle_percent}%` : '--');

            // 3. ACOPLAMIENTO DE TREN SUPERIOR
            safeInject('m-cuello', m.neck ? `${m.neck} cm` : '--');
            safeInject('m-espalda', m.back ? `${m.back} cm` : '--');
            safeInject('m-torax', m.thorax ? `${m.thorax} cm` : '--');
            safeInject('m-abdomen', m.abdomen ? `${m.abdomen} cm` : '--');
            safeInject('m-brazo_der', m.bicep_right ? `${m.bicep_right} cm` : '--');
            safeInject('m-brazo_izq', m.bicep_left ? `${m.bicep_left} cm` : '--');
            safeInject('m-antebrazo_der', m.forearm_right ? `${m.forearm_right} cm` : '--');
            safeInject('m-antebrazo_izq', m.forearm_left ? `${m.forearm_left} cm` : '--');

            // 4. ACOPLAMIENTO DE TREN INFERIOR
            safeInject('m-cintura', m.waist ? `${m.waist} cm` : '--');
            safeInject('m-femur_der', m.femur_right ? `${m.femur_right} cm` : '--');
            safeInject('m-femur_izq', m.femur_left ? `${m.femur_left} cm` : '--');
            safeInject('m-tibia_der', m.tibia_right ? `${m.tibia_right} cm` : '--');
            safeInject('m-tibia_izq', m.tibia_left ? `${m.tibia_left} cm` : '--');

            // 5. ACOPLAMIENTO DE CAPACIDAD MECÁNICA (1RM)
            safeInject('m-push', m.rm_push ? `${m.rm_push} kg` : '--');
            safeInject('m-pull', m.rm_pull ? `${m.rm_pull} kg` : '--');
            safeInject('m-legs', m.rm_legs ? `${m.rm_legs} kg` : '--');

            // 6. ACOPLAMIENTO DE FICHA MÉDICA
            safeInject('m-alergias', m.allergies, 'Ninguna registrada.');
            safeInject('m-enfermedades', m.chronic_diseases, 'Ninguna registrada.');
            safeInject('m-otros', m.medical_notes, 'Sin observaciones.');
            
        } else {
            if (spinner) spinner.innerHTML = `<p class="text-red-400 text-[10px] font-black uppercase tracking-widest">Error del Servidor Central</p>`;
        }
    } catch (error) {
        console.error("Fallo crítico de red:", error);
        if (spinner) spinner.innerHTML = `<p class="text-red-400 text-[10px] font-black uppercase tracking-widest">Error en la línea de comunicación</p>`;
    } finally {
        // 🔒 BLOQUEO REMATE DE SEGURIDAD: Ocurra o no un error, se esconde el spinner y se revela la Grid
        if (spinner) spinner.classList.add('hidden');
        if (content) {
            content.classList.remove('hidden');
            content.classList.add('flex');
        }
        document.body.classList.add('loaded');
    }
}

// Inicialización automática al cargar el DOM
window.addEventListener('DOMContentLoaded', loadAthleteBiometricsDashboard);
