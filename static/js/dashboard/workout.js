const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let currentWeekData = {};
let todayProgressData = {}; 
let selectedDay = 1;
let completedExercises = new Set();
let exerciseStates = {}; 
let sessionId = "";
let isRoutineLocked = false;

const DAYS = [
    { id: 1, label: "LUN" }, { id: 2, label: "MAR" }, 
    { id: 3, label: "MIE" }, { id: 4, label: "JUE" }, 
    { id: 5, label: "VIE" }, { id: 6, label: "SAB" }, { id: 7, label: "DOM" }
];

function showFeedback(msg, type='success') {
    const box = document.getElementById('message-box');
    box.textContent = msg;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md w-11/12 max-w-[350px] ${type==='success'?'bg-emerald-950/90 text-emerald-400 border-emerald-500/30':'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function renderDaySelector() {
    const container = document.getElementById('day-selector');
    container.innerHTML = '';
    DAYS.forEach(day => {
        const btn = document.createElement('button');
        const isActive = day.id === selectedDay;
        btn.className = `px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${isActive ? 'bg-[#FFC300] text-black border-[#FFC300] shadow-[0_0_15px_rgba(255,195,0,0.4)]' : 'bg-black/40 text-gray-500 border-white/5 hover:border-white/20 hover:text-white'}`;
        btn.textContent = day.label;
        btn.onclick = () => { 
            selectedDay = day.id; 
            renderDaySelector(); 
            renderRoutineForSelectedDay(); 
        };
        container.appendChild(btn);
    });
}

function toggleAccordion(exId) {
    const content = document.getElementById(`acc-content-${exId}`);
    const icon = document.getElementById(`acc-icon-${exId}`);
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.classList.add('expanded');
        icon.style.transform = 'rotate(180deg)';
    }
}

function toggleSetComplete(exId, setIndex) {
    if (isRoutineLocked) return;

    const btn = document.getElementById(`btn-set-${exId}-${setIndex}`);
    const repInput = document.getElementById(`reps-${exId}-${setIndex}`);
    const weightInput = document.getElementById(`weight-${exId}-${setIndex}`);

    if(!repInput.value) { showFeedback('Ingresa las reps logradas primero.', 'error'); return; }

    const isDone = exerciseStates[exId].sets[setIndex].done;
    
    if (!isDone) {
        exerciseStates[exId].sets[setIndex] = { done: true, reps: repInput.value, weight: weightInput.value || 0 };
        btn.innerHTML = '✅';
        btn.classList.replace('bg-white/5', 'bg-emerald-500/20');
        btn.classList.replace('text-gray-400', 'text-emerald-400');
        btn.classList.replace('border-white/10', 'border-emerald-500/50');
        repInput.disabled = true; weightInput.disabled = true;
    } else {
        exerciseStates[exId].sets[setIndex].done = false;
        btn.innerHTML = '⬜';
        btn.classList.replace('bg-emerald-500/20', 'bg-white/5');
        btn.classList.replace('text-emerald-400', 'text-gray-400');
        btn.classList.replace('border-emerald-500/50', 'border-white/10');
        repInput.disabled = false; weightInput.disabled = false;
    }

    checkAllSetsCompleted(exId);
}

function checkAllSetsCompleted(exId) {
    const allDone = exerciseStates[exId].sets.every(set => set.done);
    const rpeSection = document.getElementById(`rpe-section-${exId}`);
    
    if (allDone && !isRoutineLocked) {
        rpeSection.classList.remove('hidden');
        setTimeout(() => { rpeSection.style.opacity = '1'; rpeSection.style.transform = 'translateY(0)'; }, 50);
    } else {
        rpeSection.classList.add('hidden');
        rpeSection.style.opacity = '0'; rpeSection.style.transform = 'translateY(10px)';
    }
}

function selectRPE(exId, value) {
    if (isRoutineLocked) return;
    exerciseStates[exId].rpe = value;
    
    for(let i=1; i<=5; i++) {
        const btn = document.getElementById(`rpe-btn-${exId}-${i}`);
        if(i === value) {
            btn.classList.add('ring-2', 'ring-white', 'scale-110');
        } else {
            btn.classList.remove('ring-2', 'ring-white', 'scale-110');
        }
    }
    
    const submitBtn = document.getElementById(`submit-journal-${exId}`);
    submitBtn.disabled = false;
    submitBtn.classList.replace('opacity-50', 'opacity-100');
    submitBtn.classList.replace('cursor-not-allowed', 'hover:scale-[1.02]');
}

// ==========================================
// 📦 EMISOR TÁCTICO CON VARIABLE BIO-NUTRITIVAS
// ==========================================
async function saveToJournal(exId) {
    if(isRoutineLocked || !exerciseStates[exId].rpe) return;
    
    const submitBtn = document.getElementById(`submit-journal-${exId}`);
    submitBtn.innerHTML = '<div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>';

    const totalExercises = currentWeekData[selectedDay].ejercicios.length;
    const isLastExercise = (completedExercises.size + 1 === totalExercises);

    // Buscamos la plantilla actual del ejercicio para clonar su ADN en el Journal
    const currentExRaw = currentWeekData[selectedDay].ejercicios.find(e => e.id === exId);

    const journalData = {
        session_id: sessionId,
        exercise_id: exId,
        exercise_name: currentExRaw.nombre,
        search_name: currentExRaw.search_name || "unknown", // 🤖 Puente exacto al catálogo
        main_muscle: currentExRaw.grupo_muscular || "Global", // 🤖 Músculo Primario
        movement_pattern: currentExRaw.movement_pattern || "Desconocido", // 🤖 Patrón mecánico
        equipment: currentExRaw.equipment || "Ninguno", // 🤖 Equipamiento
        date: new Date().toISOString(),
        rpe: exerciseStates[exId].rpe,
        sets_execution: exerciseStates[exId].sets.map(s => ({ done: s.done, reps: s.reps, weight: s.weight })),
        status: isLastExercise ? 'Finalizado' : 'En progreso'
    };

    try {
        const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/client/routines`, {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(journalData)
        });

        if (!res.ok) throw new Error("Fallo al actualizar sesión.");

        showFeedback('Sobrecarga registrada en el Journal Unificado.');
        
        if (!todayProgressData[selectedDay]) {
            todayProgressData[selectedDay] = { status: journalData.status, exercises: {} };
        }
        todayProgressData[selectedDay].exercises[exId] = { 
            nombre: journalData.exercise_name,
            search_name: journalData.search_name,
            main_muscle: journalData.main_muscle,
            movement_pattern: journalData.movement_pattern,
            equipment: journalData.equipment,
            rpe: journalData.rpe, 
            sets_execution: journalData.sets_execution 
        };
        todayProgressData[selectedDay].status = journalData.status;

        completedExercises.add(exId);
        updateProgressBar();
        toggleAccordion(exId);
        
        const card = document.getElementById(`ex-card-${exId}`);
        card.classList.add('exercise-done');
        
        const statusBadge = document.getElementById(`badge-status-${exId}`);
        statusBadge.textContent = 'ASENTADO';
        statusBadge.className = 'px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded text-[8px] font-black uppercase tracking-widest';

        if (isLastExercise) {
            isRoutineLocked = true;
            document.getElementById('cooldown-badge').classList.remove('hidden');
            setTimeout(showVictoryModal, 800);
        }

    } catch(e) {
        console.error(e);
        showFeedback('Error de conexión al asentar ejercicio.', 'error');
        submitBtn.innerHTML = 'Reintentar Guardado';
    }
}

function showVictoryModal() {
    const modal = document.getElementById('victory-modal');
    const content = document.getElementById('victory-modal-content');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100'); }, 10);
}

function closeVictoryModal() {
    const modal = document.getElementById('victory-modal');
    const content = document.getElementById('victory-modal-content');
    content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.remove('flex'); modal.classList.add('hidden'); }, 500);
}

function exitToHub() { window.location.href = '/apps/start/inicio.html'; }

// ==========================================
// 🏗️ RENDERIZADOR DATA-DRIVEN RECONSTRUCTOR
// ==========================================
function renderRoutineForSelectedDay() {
    completedExercises.clear();
    exerciseStates = {};
    sessionId = `session_${selectedDay}_${getTodayDateString()}`;
    
    const currentProgress = todayProgressData[selectedDay];
    if (currentProgress) {
        isRoutineLocked = (currentProgress.status === 'Finalizado');
        const badge = document.getElementById('cooldown-badge');
        if (isRoutineLocked) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    } else {
        isRoutineLocked = false;
        document.getElementById('cooldown-badge').classList.add('hidden');
    }
    
    const titleEl = document.getElementById('routine-title'), descEl = document.getElementById('routine-desc');
    const listEl = document.getElementById('exercises-list'), restState = document.getElementById('rest-day-state');
    
    const routine = currentWeekData[selectedDay];

    if ((!routine || !routine.ejercicios || routine.ejercicios.length === 0) && !currentProgress) {
        titleEl.textContent = "Sin Asignación"; descEl.textContent = "Fase de Recuperación Activa";
        listEl.innerHTML = ''; listEl.classList.add('hidden');
        restState.classList.remove('hidden'); restState.classList.add('flex');
        updateProgressBar();
        return;
    }

    restState.classList.add('hidden'); restState.classList.remove('flex');
    listEl.classList.remove('hidden');
    listEl.innerHTML = '';

    let exercisesToRender = [];

    if (isRoutineLocked && currentProgress && currentProgress.exercises) {
        // 🛡️ RECONSTRUCCIÓN PREMIUM HISTÓRICA: Se alimenta 100% del Journal Snapshot
        titleEl.textContent = "Bitácora de Sesión";
        descEl.textContent = "Registro Histórico de Ejecución";
        
        Object.keys(currentProgress.exercises).forEach((exId, index) => {
            const savedEx = currentProgress.exercises[exId];
            exercisesToRender.push({
                id: exId,
                nombre: savedEx.nombre || "Ejercicio",
                grupo_muscular: savedEx.main_muscle || "Global",
                movement_pattern: savedEx.movement_pattern || "Desconocido",
                equipment: savedEx.equipment || "Ninguno",
                series: savedEx.sets_execution.length,
                repeticiones: "-", 
                isSaved: true,
                savedData: savedEx
            });
        });
    } else if (routine && routine.ejercicios) {
        // MODO EN VIVO O EN PROGRESO: Usamos la plantilla actual
        titleEl.textContent = routine.titulo || "Bloque de Entrenamiento";
        descEl.textContent = routine.enfoque || "Ejecución Táctica";
        
        routine.ejercicios.forEach(ex => {
            const exId = ex.id;
            const savedEx = (currentProgress && currentProgress.exercises) ? currentProgress.exercises[exId] : null;
            exercisesToRender.push({
                id: exId,
                nombre: ex.nombre,
                search_name: ex.search_name,
                grupo_muscular: ex.grupo_muscular,
                movement_pattern: ex.movement_pattern,
                equipment: ex.equipment,
                series: ex.series,
                repeticiones: ex.repeticiones,
                link_tutorial: ex.link_tutorial,
                isSaved: !!savedEx,
                savedData: savedEx
            });
        });
    }

    // Renderizamos las tarjetas finales
    exercisesToRender.forEach((ex, index) => {
        const numSets = parseInt(ex.series) || 3;
        
        if (ex.isSaved) {
            exerciseStates[ex.id] = { rpe: ex.savedData.rpe, sets: ex.savedData.sets_execution.map(s => ({ done: true, reps: s.reps, weight: s.weight })) };
            completedExercises.add(ex.id);
        } else {
            exerciseStates[ex.id] = { rpe: null, sets: Array(numSets).fill(null).map(() => ({ done: false, reps: '', weight: '' })) };
        }
        
        const memState = exerciseStates[ex.id];

        let setsHtml = '';
        for(let i=0; i<numSets; i++) {
            const setMem = memState.sets[i];
            setsHtml += `
            <div class="flex items-center gap-2 mb-2 p-2 rounded-lg bg-black/40 border border-white/5">
                <span class="w-6 text-center text-[10px] font-black text-gray-500">${i+1}</span>
                <div class="flex-1 flex gap-2">
                    <div class="relative w-full">
                        <span class="absolute -top-2 left-2 text-[7px] font-black text-gray-500 uppercase bg-black px-1">Reps ${!ex.isSaved ? `(${ex.repeticiones})` : ''}</span>
                        <input type="number" id="reps-${ex.id}-${i}" value="${setMem.reps}" ${ex.isSaved || isRoutineLocked ? 'disabled' : ''} class="w-full telemetry-input p-2.5 rounded-lg text-sm" placeholder="-" />
                    </div>
                    <div class="relative w-full">
                        <span class="absolute -top-2 left-2 text-[7px] font-black text-gray-500 uppercase bg-black px-1">KG</span>
                        <input type="number" id="weight-${ex.id}-${i}" value="${setMem.weight}" ${ex.isSaved || isRoutineLocked ? 'disabled' : ''} class="w-full telemetry-input p-2.5 rounded-lg text-sm" placeholder="0" />
                    </div>
                </div>
                ${ex.isSaved || isRoutineLocked 
                  ? `<div class="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center text-xs">✅</div>`
                  : `<button id="btn-set-${ex.id}-${i}" onclick="toggleSetComplete('${ex.id}', ${i})" class="w-10 h-10 rounded-lg ${setMem.done ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-400'} font-bold text-xs flex items-center justify-center transition-colors">${setMem.done ? '✅' : '⬜'}</button>`
                }
            </div>`;
        }

        const card = document.createElement('div');
        card.id = `ex-card-${ex.id}`;
        card.className = `glass-panel rounded-2xl border transition-all duration-500 overflow-hidden ${ex.isSaved ? 'exercise-done border-emerald-500/40' : 'border-white/5'}`;
        
        card.innerHTML = `
            <div class="p-5 cursor-pointer flex justify-between items-center group" onclick="toggleAccordion('${ex.id}')">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#FFC300] font-black text-sm">
                        ${index + 1}
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-0.5">
                            <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[7px] font-black uppercase tracking-widest text-gray-400">${ex.grupo_muscular}</span>
                            <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[7px] font-black uppercase tracking-widest text-gray-500 hidden md:inline-block">${ex.equipment}</span>
                            <span class="px-2 py-0.5 ${ex.isSaved ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-transparent border-gray-600 text-gray-500'} rounded text-[7px] font-black uppercase tracking-widest border">
                                ${ex.isSaved ? 'ASENTADO' : 'PENDIENTE'}
                            </span>
                        </div>
                        <h4 class="ex-header-title text-lg font-black uppercase tracking-tighter text-white group-hover:text-[#FFC300] transition-colors">${ex.nombre}</h4>
                        <p class="text-[9px] font-bold text-gray-500 tracking-widest uppercase mt-1">${ex.isSaved ? `${numSets} Series Completadas` : `${ex.series} Series • Objetivo: ${ex.repeticiones} Reps`}</p>
                    </div>
                </div>
                <svg id="acc-icon-${ex.id}" class="w-5 h-5 text-gray-500 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>

            <div id="acc-content-${ex.id}" class="accordion-content bg-black/20 border-t border-white/5">
                <div class="p-5">
                    ${ex.link_tutorial && !isRoutineLocked ? `
                    <a href="${ex.link_tutorial}" target="_blank" class="w-full mb-6 py-3 rounded-xl bg-white/5 border border-white/10 flex justify-center items-center gap-2 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors">
                        <svg class="w-4 h-4 text-[#FFC300]" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"/></svg> Ver Tutorial de Ejecución
                    </a>` : ''}

                    <div class="mb-6">${setsHtml}</div>
                    
                    ${!ex.isSaved && !isRoutineLocked ? `
                    <div id="rpe-section-${ex.id}" class="hidden opacity-0 transform translate-y-2 transition-all duration-500 border-t border-white/10 pt-5">
                        <p class="text-center text-[10px] font-black uppercase tracking-widest text-[#FFC300] mb-3">¿RPE - Dificultad?</p>
                        <div class="flex justify-between gap-2 mb-6">
                            ${[1,2,3,4,5].map(i => `<button id="rpe-btn-${ex.id}-${i}" onclick="selectRPE('${ex.id}', ${i})" class="flex-1 py-3 rounded-lg border text-xs font-black transition-all ${i===1?'bg-emerald-500/20 text-emerald-400 border-emerald-500/30':i===2?'bg-lime-500/20 text-lime-400 border-lime-500/30':i===3?'bg-yellow-500/20 text-yellow-400 border-yellow-500/30':i===4?'bg-orange-500/20 text-orange-400 border-orange-500/30':'bg-red-500/20 text-red-400 border-red-500/30'}">${i}</button>`).join('')}
                        </div>
                        <button id="submit-journal-${ex.id}" onclick="saveToJournal('${ex.id}')" disabled class="w-full btn-gold py-4 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,195,0,0.2)] opacity-50 cursor-not-allowed transition-all">Asentar en Journal</button>
                    </div>` : `
                    <div class="border-t border-white/10 pt-4 text-center">
                        <p class="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Bloque Registrado (RPE: ${memState.rpe})</p>
                    </div>`}
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });

    if (isRoutineLocked) {
        document.getElementById('workout-progress-bar').style.width = `100%`;
        document.getElementById('workout-progress-text').textContent = `100%`;
        document.getElementById('workout-progress-bar').classList.replace('bg-[#FFC300]', 'bg-emerald-500');
        document.getElementById('workout-progress-text').classList.replace('text-[#FFC300]', 'text-emerald-500');
    } else {
        updateProgressBar();
    }
}

function updateProgressBar() {
    const routine = currentWeekData[selectedDay];
    if (!routine || !routine.ejercicios || routine.ejercicios.length === 0) {
        document.getElementById('workout-progress-bar').style.width = `0%`;
        document.getElementById('workout-progress-text').textContent = `0%`;
        return;
    }

    const total = routine.ejercicios.length;
    const completed = completedExercises.size;
    const pct = Math.round((completed / total) * 100);

    document.getElementById('workout-progress-bar').style.width = `${pct}%`;
    document.getElementById('workout-progress-text').textContent = `${pct}%`;
    
    if (pct === 100) {
        document.getElementById('workout-progress-bar').classList.replace('bg-[#FFC300]', 'bg-emerald-500');
        document.getElementById('workout-progress-text').classList.replace('text-[#FFC300]', 'text-emerald-500');
    } else {
        document.getElementById('workout-progress-bar').classList.replace('bg-emerald-500', 'bg-[#FFC300]');
        document.getElementById('workout-progress-text').classList.replace('text-emerald-500', 'text-[#FFC300]');
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token') || localStorage.getItem('token');
    if (!token) { window.location.href = '/apps/start/login.html'; return; }

    let today = new Date().getDay();
    selectedDay = today === 0 ? 7 : today; 

    try {
        const response = await fetch(`${API_BASE_URL}/api/client/routines`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            currentWeekData = data.rutinas || {};
            todayProgressData = data.today_progress || {}; 
        }
    } catch (e) {
        console.error("Error cargando sincronización táctica:", e);
    }

    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('workout-container').classList.remove('hidden');
    document.getElementById('workout-container').classList.add('flex');
    document.body.classList.add('loaded');

    renderDaySelector();
    renderRoutineForSelectedDay();
});
