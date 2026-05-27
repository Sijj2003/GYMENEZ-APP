// Configuración de API
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Variables Globales de Estado
let currentWeekData = {};
let selectedDay = 1;
let completedExercises = new Set(); // Almacena los IDs de los ejercicios marcados

// Días de la Semana
const DAYS = [
    { id: 1, label: "LUN" }, { id: 2, label: "MAR" }, 
    { id: 3, label: "MIE" }, { id: 4, label: "JUE" }, 
    { id: 5, label: "VIE" }, { id: 6, label: "SAB" }, { id: 7, label: "DOM" }
];

// ==========================================
// RENDERIZADO DEL SELECTOR DE DÍAS
// ==========================================
function renderDaySelector() {
    const container = document.getElementById('day-selector');
    container.innerHTML = '';

    DAYS.forEach(day => {
        const btn = document.createElement('button');
        const isActive = day.id === selectedDay;
        
        btn.className = `px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
            isActive 
            ? 'bg-[#FFC300] text-black border-[#FFC300] shadow-[0_0_15px_rgba(255,195,0,0.4)]' 
            : 'bg-black/40 text-gray-500 border-white/5 hover:border-white/20 hover:text-white'
        }`;
        btn.textContent = day.label;
        btn.onclick = () => {
            selectedDay = day.id;
            renderDaySelector(); // Re-dibujar botones
            renderRoutineForSelectedDay(); // Cargar la rutina del día
        };
        
        container.appendChild(btn);
    });
}

// ==========================================
// INTERACTIVIDAD Y PROGRESO
// ==========================================
function toggleExerciseComplete(exerciseId) {
    if (completedExercises.has(exerciseId)) {
        completedExercises.delete(exerciseId);
    } else {
        completedExercises.add(exerciseId);
    }
    
    // Actualizar UI de la tarjeta
    const card = document.getElementById(`ex-card-${exerciseId}`);
    const btn = document.getElementById(`ex-btn-${exerciseId}`);
    
    if (completedExercises.has(exerciseId)) {
        card.classList.add('exercise-done');
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Completado';
    } else {
        card.classList.remove('exercise-done');
        btn.innerHTML = 'Marcar Completado';
    }

    updateProgressBar();
}

function updateProgressBar() {
    const routine = currentWeekData[selectedDay];
    if (!routine || !routine.ejercicios || routine.ejercicios.length === 0) return;

    const total = routine.ejercicios.length;
    const completed = completedExercises.size;
    const pct = Math.round((completed / total) * 100);

    document.getElementById('workout-progress-bar').style.width = `${pct}%`;
    document.getElementById('workout-progress-text').textContent = `${pct}%`;
    
    // Cambiar a verde si se completa todo
    if (pct === 100) {
        document.getElementById('workout-progress-bar').classList.replace('bg-[#FFC300]', 'bg-emerald-500');
        document.getElementById('workout-progress-text').classList.replace('text-[#FFC300]', 'text-emerald-500');
    } else {
        document.getElementById('workout-progress-bar').classList.replace('bg-emerald-500', 'bg-[#FFC300]');
        document.getElementById('workout-progress-text').classList.replace('text-emerald-500', 'text-[#FFC300]');
    }
}

// ==========================================
// RENDERIZADO DE RUTINA DIARIA
// ==========================================
function renderRoutineForSelectedDay() {
    completedExercises.clear(); // Limpiar progreso al cambiar de día
    
    const titleEl = document.getElementById('routine-title');
    const descEl = document.getElementById('routine-desc');
    const listEl = document.getElementById('exercises-list');
    const restState = document.getElementById('rest-day-state');
    
    const routine = currentWeekData[selectedDay];

    if (!routine || !routine.ejercicios || routine.ejercicios.length === 0) {
        // Día de descanso o sin rutina
        titleEl.textContent = "Sin Asignación";
        descEl.textContent = "Fase de Recuperación Activa";
        listEl.innerHTML = '';
        listEl.classList.add('hidden');
        restState.classList.remove('hidden');
        restState.classList.add('flex');
        
        document.getElementById('workout-progress-bar').style.width = `0%`;
        document.getElementById('workout-progress-text').textContent = `0%`;
        return;
    }

    // Si hay rutina
    restState.classList.add('hidden');
    restState.classList.remove('flex');
    listEl.classList.remove('hidden');
    
    titleEl.textContent = routine.titulo || "Bloque de Entrenamiento";
    descEl.textContent = routine.enfoque || "Ejecución Táctica";

    listEl.innerHTML = ''; // Limpiar lista
    
    routine.ejercicios.forEach((ex, index) => {
        const exId = ex.id || `temp-${index}`;
        
        const card = document.createElement('div');
        card.id = `ex-card-${exId}`;
        card.className = "glass-panel rounded-2xl p-5 border border-white/5 transition-all duration-300";
        
        card.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between gap-4">
                <div class="flex-grow">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-black uppercase tracking-widest text-gray-400">${ex.grupo_muscular || 'Global'}</span>
                    </div>
                    <h4 class="text-lg md:text-xl font-black uppercase tracking-tighter text-white mb-4">${ex.nombre}</h4>
                    
                    <div class="grid grid-cols-3 gap-2">
                        <div class="bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                            <p class="text-[8px] font-black text-gray-500 uppercase tracking-widest">Series</p>
                            <p class="text-lg font-mono font-bold text-white mt-0.5">${ex.series}</p>
                        </div>
                        <div class="bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                            <p class="text-[8px] font-black text-gray-500 uppercase tracking-widest">Reps</p>
                            <p class="text-lg font-mono font-bold text-white mt-0.5">${ex.repeticiones}</p>
                        </div>
                        <div class="bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                            <p class="text-[8px] font-black text-gray-500 uppercase tracking-widest">Descanso</p>
                            <p class="text-lg font-mono font-bold text-[#FFC300] mt-0.5">${ex.descanso || '90s'}</p>
                        </div>
                    </div>
                    
                    ${ex.notas ? `<p class="text-[10px] text-gray-500 font-medium uppercase tracking-wide mt-4 border-l-2 border-white/10 pl-2">${ex.notas}</p>` : ''}
                </div>
                
                <div class="flex items-end justify-end sm:w-40">
                    <button id="ex-btn-${exId}" onclick="toggleExerciseComplete('${exId}')" class="done-btn w-full sm:w-auto px-6 py-3.5 bg-white/5 border border-white/10 hover:border-[#FFC300] hover:text-[#FFC300] text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2">
                        Marcar Completado
                    </button>
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });

    updateProgressBar();
}

// ==========================================
// SIMULADOR DE DATOS (MOCK)
// ==========================================
// Si el backend no devuelve nada, usamos esto para mostrar el potencial del módulo.
const MOCK_ROUTINE_DATA = {
    1: { // Lunes
        titulo: "Día 1: Empuje Vectorial", enfoque: "Pecho, Hombros y Tríceps",
        ejercicios: [
            { id: 'e1', nombre: "Press de Banca Plano", grupo_muscular: "Pecho", series: 4, repeticiones: "8-10", descanso: "120s", notas: "Control excéntrico de 3 segundos." },
            { id: 'e2', nombre: "Press Militar c/ Mancuernas", grupo_muscular: "Hombros", series: 4, repeticiones: "10-12", descanso: "90s" },
            { id: 'e3', nombre: "Extensiones de Tríceps en Polea", grupo_muscular: "Tríceps", series: 3, repeticiones: "12-15", descanso: "60s", notas: "Apretar un segundo en contracción máxima." }
        ]
    },
    3: { // Miércoles
        titulo: "Día 3: Tracción Pesada", enfoque: "Espalda y Bíceps",
        ejercicios: [
            { id: 'e4', nombre: "Dominadas Lastradas", grupo_muscular: "Espalda", series: 4, repeticiones: "6-8", descanso: "120s" },
            { id: 'e5', nombre: "Remo con Barra", grupo_muscular: "Espalda", series: 4, repeticiones: "8-10", descanso: "90s" },
            { id: 'e6', nombre: "Curl de Bíceps Alterno", grupo_muscular: "Bíceps", series: 3, repeticiones: "12", descanso: "60s" }
        ]
    }
};

// ==========================================
// INICIALIZADOR CORE
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) { window.location.href = '/apps/start/login.html'; return; }

    // Fijar el día actual basado en la fecha real (1=Lunes ... 7=Domingo)
    let today = new Date().getDay();
    selectedDay = today === 0 ? 7 : today; 

    try {
        // Intentar obtener las rutinas reales del backend
        const response = await fetch(`${API_BASE_URL}/api/client/routines`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            // Si el backend devuelve data real, la usamos. Si está vacío, inyectamos el simulador.
            currentWeekData = (data.rutinas && Object.keys(data.rutinas).length > 0) ? data.rutinas : MOCK_ROUTINE_DATA;
        } else {
            throw new Error("Sin endpoint de rutinas");
        }
    } catch (e) {
        // Si el endpoint aún no existe o falla, cargamos el simulador táctico para que la UI no quede vacía.
        console.log("Activando Simulador Táctico de Rutinas (Fallback)");
        currentWeekData = MOCK_ROUTINE_DATA;
    }

    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('workout-container').classList.remove('hidden');
    document.getElementById('workout-container').classList.add('flex');

    renderDaySelector();
    renderRoutineForSelectedDay();
});
