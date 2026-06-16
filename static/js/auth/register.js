// Configuración de API
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || 
                               window.location.hostname === 'localhost' || 
                               window.location.protocol === 'file:';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Estado de la UI
let activeStep = 1;

// --- FUNCIONES DE INTERFAZ (UI) ---

// Eliminar preloader inicial
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    const nav = document.getElementById('main-nav');
    const footer = document.getElementById('main-footer');

    preloader.style.opacity = '0';
    setTimeout(() => {
        preloader.style.display = 'none';
        document.body.classList.add('loaded');
        document.body.style.overflow = 'auto'; // Permitir scroll si es necesario
        
        // Revelar Nav y Footer
        nav.classList.remove('opacity-0', '-translate-y-4');
        footer.classList.remove('opacity-0');
        footer.classList.add('opacity-40');
    }, 1000);
});

// Mostrar feedback visual estándar
function showUIFeedback(message, type = 'error') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    
    // Limpiar clases previas
    box.className = 'fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px]';
    
    if(type === 'success') {
        box.classList.add('bg-emerald-950/80', 'text-emerald-400', 'border-emerald-500/30');
    } else {
        box.classList.add('bg-red-950/80', 'text-red-400', 'border-red-500/30');
    }
    
    // Animar entrada
    box.style.opacity = '1';
    box.style.transform = 'translate(-50%, 0)';
    
    // Animar salida
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translate(-50%, -20px)';
    }, 4000);
}

// Utilidad universal para abrir/cerrar modales suavemente
function toggleModal(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) {
        el.classList.remove('hidden');
        setTimeout(() => el.classList.remove('opacity-0'), 10);
    } else {
        el.classList.add('opacity-0');
        setTimeout(() => el.classList.add('hidden'), 300);
    }
}

// Formateador de Fecha de Nacimiento
function applyDateMask(e) {
    if (e.inputType === 'deleteContentBackward') return;
    const input = e.target;
    let v = input.value.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);
    let formatted = v;
    if (v.length >= 5) formatted = `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
    else if (v.length >= 3) formatted = `${v.substring(0, 2)}/${v.substring(2)}`;
    input.value = formatted;
}

// Filtros de entrada en tiempo real
document.getElementById('reg-name').addEventListener('input', function() { this.value = this.value.replace(/[^A-Za-zÁéíóúÁÉÍÓÚñÑ ]/g, ''); });
document.getElementById('reg-lastname').addEventListener('input', function() { this.value = this.value.replace(/[^A-Za-zÁéíóúÁÉÍÓÚñÑ ]/g, ''); });
document.getElementById('reg-dob').addEventListener('input', applyDateMask);
document.getElementById('reg-phone-num').addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });

// --- LÓGICA DE MULTIPASO ---

function validateFields(step) {
    const letterRegex = /^[A-Za-zÁéíóúÁÉÍÓÚñÑ ]+$/;

    if (step === 1) {
        const name = document.getElementById('reg-name').value.trim();
        const lastname = document.getElementById('reg-lastname').value.trim();
        const emailRaw = document.getElementById('reg-email').value;

        if (!name || !letterRegex.test(name) || !lastname || !letterRegex.test(lastname)) {
            showUIFeedback("Nombre y Apellido solo deben contener letras.", "error");
            return false;
        }

        if (emailRaw.includes(' ')) {
            showUIFeedback("El correo electrónico no puede contener espacios.", "error");
            return false;
        }

        const email = emailRaw.trim().toLowerCase();
        if (!email || email.length > 25 || !document.getElementById('reg-email').checkValidity()) {
            showUIFeedback("Ingresa un correo válido (Máximo 25 caracteres).", "error");
            return false;
        }

        const emailParts = email.split('@');
        if (emailParts.length !== 2) {
            showUIFeedback("Estructura de correo electrónico inválida.", "error");
            return false;
        }

        const domainPart = emailParts[1];
        const ALLOWED_DOMAINS = [
            'gmail.com',
            'hotmail.com', 'hotmail.es', 'windowslive.com',
            'outlook.com', 'outlook.es',
            'proton.me', 'protonmail.com',
            'yahoo.com', 'yahoo.es', 'ymail.com',
            'icloud.com'
        ];

        if (!ALLOWED_DOMAINS.includes(domainPart)) {
            showUIFeedback("Usa un proveedor seguro (Gmail, Hotmail, Outlook, Proton, Yahoo, iCloud).", "error");
            return false;
        }
    }
    if (step === 2) {
        const dob = document.getElementById('reg-dob').value.trim();
        const sex = document.getElementById('reg-sex').value;
        const phone = document.getElementById('reg-phone-num').value.trim();
        
        if (dob.length !== 10) {
            showUIFeedback("Ingresa una fecha de nacimiento válida (DD/MM/YYYY).", "error");
            return false;
        }
        if (!sex) {
            showUIFeedback("Selecciona tu sexo biológico.", "error");
            return false;
        }
        if (phone.length !== 7) {
            showUIFeedback("El número móvil debe tener exactamente 7 dígitos.", "error");
            return false;
        }
    }
    return true;
}

function goToStep(nextStep) {
    if (nextStep > activeStep && !validateFields(activeStep)) return;

    const currentSection = document.getElementById(`step-section-${activeStep}`);
    const nextSection = document.getElementById(`step-section-${nextStep}`);
    
    currentSection.style.opacity = '0';
    currentSection.style.transform = nextStep > activeStep ? 'translateX(-20px)' : 'translateX(20px)';
    document.getElementById(`dot-${activeStep}`).classList.remove('active');

    setTimeout(() => {
        currentSection.classList.add('hidden');
        nextSection.classList.remove('hidden');
        
        setTimeout(() => {
            nextSection.style.opacity = '1';
            nextSection.style.transform = 'translateX(0)';
            
            document.getElementById(`dot-${nextStep}`).classList.add('active');
            
            const titles = { 1: "Identidad Base", 2: "Biometría Básica", 3: "Seguridad" };
            document.getElementById('register-title').textContent = titles[nextStep];
            
            const subtitles = { 1: "Datos de Cuenta", 2: "Contacto", 3: "Clave de Acceso" };
            document.getElementById('register-subtitle').textContent = `Paso ${nextStep} de 3 • ${subtitles[nextStep]}`;
            
            activeStep = nextStep;
        }, 50);
    }, 400);
}

// Asignar eventos de navegación por clics nativos
document.getElementById('btn-next-1').addEventListener('click', () => goToStep(2));
document.getElementById('btn-prev-2').addEventListener('click', () => goToStep(1));
document.getElementById('btn-next-2').addEventListener('click', () => goToStep(3));
document.getElementById('btn-prev-3').addEventListener('click', () => goToStep(2));


// ======================================================================
// 🚀 CONTROL TOTAL DEL FLUJO DEL TECLADO Y FORMULARIO (Enter = Siguiente)
// ======================================================================

// 1. Bloqueamos cualquier intento de envío del navegador (sea por Enter, click en el teclado del móvil, etc.)
document.getElementById('multi-step-form').addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    // Si intentan enviar el formulario, mapeamos la acción al botón amarillo del paso actual
    if (activeStep === 1) {
        document.getElementById('btn-next-1').click();
    } else if (activeStep === 2) {
        document.getElementById('btn-next-2').click();
    } else if (activeStep === 3) {
        ejecutarRegistroAlBackend();
    }
});

// 2. Interceptamos explícitamente la tecla Enter en cualquier campo de texto
document.getElementById('multi-step-form').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // Evitamos que salte de línea o envíe cosas raras
        
        if (activeStep === 1) {
            document.getElementById('btn-next-1').click();
        } else if (activeStep === 2) {
            document.getElementById('btn-next-2').click();
        } else if (activeStep === 3) {
            ejecutarRegistroAlBackend();
        }
    }
});

// 3. Conectamos el botón final de envío a nuestra función manual
document.getElementById('btn-submit').addEventListener('click', function(e) {
    e.preventDefault();
    if (activeStep === 3) {
        ejecutarRegistroAlBackend();
    }
});


// ======================================================================
// --- LÓGICA DE REGISTRO AL SERVIDOR EXTRAÍDA ---
// ======================================================================
async function ejecutarRegistroAlBackend() {
    const password = document.getElementById('reg-password').value;
    if(password.length < 6 || password.length > 18) {
        showUIFeedback("La contraseña debe contener entre 6 y 18 caracteres.", "error");
        return;
    }

    const athleteName = document.getElementById('reg-name').value.trim().toUpperCase();
    const btn = document.getElementById('btn-submit');
    
    btn.disabled = true;
    btn.textContent = "VALIDANDO...";

    const ciPlaceholder = `V-TEMP-${Date.now().toString().slice(-6)}`; 
    
    const payload = {
        email: document.getElementById('reg-email').value.trim().toLowerCase(),
        password: password,
        name: athleteName,
        last_name: document.getElementById('reg-lastname').value.trim().toUpperCase(),
        id_number: ciPlaceholder,
        phone_number: `${document.getElementById('reg-phone-prefix').value}-${document.getElementById('reg-phone-num').value.trim()}`,
        dob: document.getElementById('reg-dob').value.trim(),
        sex: document.getElementById('reg-sex').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            triggerCinematicSetup(athleteName);
        } else {
            // 🛡️ REGLA: Si la IP ha superado los 10 registros por hora
            if (response.status === 429) {
                // Desplegamos la ventanita estética
                toggleModal('rate-limit-modal', true);
                
                // Auto-Cierre en 10 Segundos exactos
                setTimeout(() => {
                    const modal = document.getElementById('rate-limit-modal');
                    if (!modal.classList.contains('hidden')) {
                        toggleModal('rate-limit-modal', false);
                    }
                }, 10000);
                
                btn.disabled = false;
                btn.textContent = "Activar Perfil";
                return;
            }

            showUIFeedback(data.error || "No se pudo procesar el alta.", "error");
            btn.disabled = false;
            btn.textContent = "Activar Perfil";
        }
    } catch (err) {
        showUIFeedback("Fallo de conexión perimetral con el servidor.", "error");
        btn.disabled = false;
        btn.textContent = "Activar Perfil";
    }
}

// --- CINEMÁTICA FINAL ---
function triggerCinematicSetup(name) {
    const container = document.getElementById('register-container');
    const setup = document.getElementById('setup-screen');

    container.style.opacity = '0';
    container.style.transform = 'scale(0.95)';

    setTimeout(() => {
        container.classList.add('hidden');
        setup.classList.remove('hidden');
        setTimeout(() => {
            setup.classList.remove('opacity-0');
            runSequence(name);
        }, 100);
    }, 600);
}

function runSequence(name) {
    const steps = [
        { text: `Hola, ${name}`, time: 0 },
        { text: "Creando tu perfil en el Núcleo...", time: 1800 },
        { text: "Estructurando tu entrenamiento...", time: 3600 },
        { text: "Asegurando tu acceso...", time: 5400 },
        { text: "¡Bienvenido a la Élite!", time: 7200 }
    ];

    steps.forEach(s => {
        setTimeout(() => {
            const msgElement = document.getElementById('setup-message');
            msgElement.classList.add('opacity-0', 'blur-[6px]');
            
            setTimeout(() => {
                msgElement.textContent = s.text;
                msgElement.classList.remove('opacity-0', 'blur-[6px]');
                msgElement.classList.add('opacity-100', 'blur-0');
            }, 300);
        }, s.time);
    });

    setTimeout(() => window.location.href = '/apps/start/login.html', 8800);
}
