// Configuración de API
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// ==========================================
// MOCK DATA: SIMULADOR DE PLANIFICACIÓN TÁCTICA
// ==========================================
const MOCK_PROGRAM = {
    nombre: "Protocolo de Hipertrofia Táctica",
    descripcion: "Esquema de periodización ondulante enfocado en el aumento de la densidad muscular y mejora de los patrones de fuerza en ejercicios multiarticulares base.",
    duracion: "8 Semanas",
    nivel: "Avanzado",
    dias: [
        { id: 1, nombre: "Lunes", titulo: "Empuje Vectorial", enfoque: "Pecho, Hombros, Tríceps", ejercicios: 5, activo: true },
        { id: 2, nombre: "Martes", titulo: "Tracción Inferior", enfoque: "Cuádriceps, Pantorrillas", ejercicios: 6, activo: true },
        { id: 3, nombre: "Miércoles", titulo: "Día de Recuperación", enfoque: "Descanso Activo / Movilidad", ejercicios: 0, activo: false },
        { id: 4, nombre: "Jueves", titulo: "Tracción Superior", enfoque: "Espalda, Bíceps, Trapecio", ejercicios: 5, activo: true },
        { id: 5, nombre: "Viernes", titulo: "Cadena Posterior", enfoque: "Isquiosurales, Glúteos", ejercicios: 4, activo: true },
        { id: 6, nombre: "Sábado", titulo: "Potencia Global", enfoque: "Full Body / Core", ejercicios: 4, activo: true },
        { id: 7, nombre: "Domingo", titulo: "Día de Recuperación", enfoque: "Descanso Total", ejercicios: 0, activo: false }
    ]
};

// ==========================================
// RENDERIZADO DEL DOSSIER
// ==========================================
function renderMasterPlan(programData) {
    // Llenar Ficha Técnica
    document.getElementById('prog-name').textContent = programData.nombre || "Asignación Pendiente";
    document.getElementById('prog-desc').textContent = programData.descripcion || "Tu preparador aún no ha cargado la descripción de tu macrociclo actual.";
    document.getElementById('prog-duration').textContent = programData.duracion || "--";
    document.getElementById('prog-level').textContent = programData.nivel || "--";

    const grid = document.getElementById('weekly-grid');
    grid.innerHTML = '';

    // Renderizar Tarjetas de los 7 Días
    const dias = programData.dias || [];
    
    dias.forEach(dia => {
        const card = document.createElement('div');
        
        if (dia.activo) {
            // Estilo para Día de Entrenamiento (Brillante)
            card.className = "glass-panel rounded-2xl p-5 border border-white/5 hover:border-[#FFC300]/50 transition-all duration-300 group bg-white/[0.01] flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-[#FFC300] transition-colors">Día 0${dia.id} • ${dia.nombre}</span>
                        <div class="w-1.5 h-1.5 rounded-full bg-[#FFC300] shadow-[0_0_8px_#FFC300]"></div>
                    </div>
                    <h4 class="text-lg font-black uppercase tracking-tighter text-white">${dia.titulo}</h4>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">${dia.enfoque}</p>
                </div>
                <div class="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span class="text-xs font-mono font-bold text-white">${dia.ejercicios} <span class="text-[8px] text-gray-500 tracking-widest">BLOQUES</span></span>
                    <a href="/apps/user/workout.html" class="text-[9px] font-black text-[#FFC300] uppercase tracking-widest hover:text-white transition-colors">Ver Detalles →</a>
                </div>
            `;
        } else {
            // Estilo para Día de Descanso (Atenuado y Oscuro)
            card.className = "glass-panel rounded-2xl p-5 border border-white/5 bg-black/40 opacity-70 flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-[9px] font-black uppercase tracking-widest text-gray-600">Día 0${dia.id} • ${dia.nombre}</span>
                        <div class="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                    </div>
                    <h4 class="text-lg font-black uppercase tracking-tighter text-gray-500">${dia.titulo}</h4>
                    <p class="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">${dia.enfoque}</p>
                </div>
                <div class="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span class="text-xs font-mono font-bold text-gray-600">--</span>
                </div>
            `;
        }
        
        grid.appendChild(card);
    });
}

// ==========================================
// INICIALIZADOR CORE
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.href = '/apps/start/login.html';
        return;
    }

    try {
        // En producción: fetch al backend para obtener el "Master Plan"
        const response = await fetch(`${API_BASE_URL}/api/client/program`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const program = data.programa && Object.keys(data.programa).length > 0 ? data.programa : MOCK_PROGRAM;
            renderMasterPlan(program);
        } else {
            throw new Error("Endpoint no configurado");
        }
    } catch (e) {
        // Si no existe la API de programa aún, cargamos el simulador táctico
        console.log("Activando Simulador del Macrociclo (Fallback)");
        renderMasterPlan(MOCK_PROGRAM);
    }

    // Transición visual
    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('program-container').classList.remove('hidden');
    document.getElementById('program-container').classList.add('flex');
});
