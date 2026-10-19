// ==========================================
// 🧬 MICROSERVICIO: BIOLAB & NUTRICIÓN
// ==========================================

const MEASURABLE_METRICS = [
    { id: "weight", label: "Peso Corporal Base", unit: "kg" },
    { id: "fat_percent", label: "% Grasa Estimada", unit: "%" },
    { id: "muscle_percent", label: "% Masa Muscular", unit: "%" },
    { id: "waist", label: "Perímetro Cintura", unit: "cm" },
    { id: "rm_push", label: "Potencia: 1RM Empuje", unit: "kg" },
    { id: "rm_pull", label: "Potencia: 1RM Tracción", unit: "kg" },
    { id: "rm_legs", label: "Potencia: 1RM Pierna", unit: "kg" },
    { id: "custom", label: "Hábito Cualitativo", unit: "" }
];

window.loadBiolabData = async function(userId) {
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/fitness-profile/${userId}`, { headers: window.getSecureHeaders() });
        const data = await res.json();
        
        if (data.success) {
            const m = data.metrics || {};
            document.getElementById('m-weight').value = m.weight || '';
            document.getElementById('m-height').value = m.height || '';
            document.getElementById('m-age').value = m.age || '--';
            document.getElementById('m-neck').value = m.neck || '';
            document.getElementById('m-back').value = m.back || '';
            document.getElementById('m-thorax').value = m.thorax || '';
            document.getElementById('m-abdomen').value = m.abdomen || '';
            document.getElementById('m-bicep-l').value = m.bicep_left || '';
            document.getElementById('m-bicep-r').value = m.bicep_right || '';
            document.getElementById('m-forearm-l').value = m.forearm_left || '';
            document.getElementById('m-forearm-r').value = m.forearm_right || '';
            document.getElementById('m-waist').value = m.waist || '';
            document.getElementById('m-femur-l').value = m.femur_left || '';
            document.getElementById('m-femur-r').value = m.femur_right || '';
            document.getElementById('m-tibia-l').value = m.tibia_left || '';
            document.getElementById('m-tibia-r').value = m.tibia_right || '';
            document.getElementById('m-push').value = m.rm_push || '';
            document.getElementById('m-pull').value = m.rm_pull || '';
            document.getElementById('m-legs').value = m.rm_legs || '';
            document.getElementById('m-allergies').value = m.allergies || '';
            document.getElementById('m-diseases').value = m.chronic_diseases || '';
            document.getElementById('m-medical-notes').value = m.medical_notes || '';

            window.autoCalculateBiometrics();

            const g = data.goals || {};
            document.getElementById('g-focus').value = g.focus || 'Masa Muscular';
            document.getElementById('st-goals-container').innerHTML = '';
            document.getElementById('mt-goals-container').innerHTML = '';
            document.getElementById('lt-goals-container').innerHTML = '';
            
            const normalize = (val) => Array.isArray(val) ? val : (val && val.description ? [val] : []);
            normalize(g.short_term).forEach(goal => window.addGoalRow('st-goals-container', goal));
            normalize(g.medium_term).forEach(goal => window.addGoalRow('mt-goals-container', goal));
            normalize(g.long_term).forEach(goal => window.addGoalRow('lt-goals-container', goal));
        }
    } catch (e) { console.warn("Error leyendo biometría"); }
};

window.loadDietData = async function(userId, tier) {
    if (tier !== 'ULTRA') {
        document.getElementById('diet-locked').classList.remove('hidden');
        document.getElementById('diet-editor').classList.add('hidden');
    } else {
        document.getElementById('diet-locked').classList.add('hidden');
        document.getElementById('diet-editor').classList.remove('hidden');
        document.getElementById('d-title').value = ""; document.getElementById('d-text').value = "";
        try {
            const resDiet = await fetch(`${window.API_BASE_URL}/api/admin/diet/${userId}`, { headers: window.getSecureHeaders() });
            const dataDiet = await resDiet.json();
            if (dataDiet.success && dataDiet.has_diet) {
                document.getElementById('d-title').value = dataDiet.diet.title || "";
                document.getElementById('d-text').value = dataDiet.diet.menu_text || "";
            }
        } catch(e) {}
    }
};

window.autoCalculateBiometrics = function() {
    const weight = parseFloat(document.getElementById('m-weight').value);
    const heightCm = parseFloat(document.getElementById('m-height').value);
    let age = parseInt(document.getElementById('m-age').value);
    const sex = document.getElementById('f-sex').value;

    const fatInput = document.getElementById('m-fat');
    const muscleInput = document.getElementById('m-muscle');

    if (isNaN(age) || age <= 0) {
        const dobVal = document.getElementById('f-dob').value;
        if (dobVal) {
            const diff = Date.now() - new Date(dobVal).getTime();
            age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
            document.getElementById('m-age').value = age;
        }
    }

    if (weight > 0 && heightCm > 0 && age > 0) {
        const bmi = weight / ((heightCm/100) * (heightCm/100)); 
        const sexFactor = sex === 'Hombre' ? 1 : (sex === 'Mujer' ? 0 : 0.5);
        let fatPercent = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
        if (fatPercent < 3) fatPercent = 3; if (fatPercent > 65) fatPercent = 65;
        const muscleFactor = sex === 'Hombre' ? 0.52 : (sex === 'Mujer' ? 0.47 : 0.495);
        
        fatInput.value = fatPercent.toFixed(1);
        muscleInput.value = ((100 - fatPercent) * muscleFactor).toFixed(1);
    } else {
        fatInput.value = ''; muscleInput.value = '';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('m-weight').addEventListener('input', window.autoCalculateBiometrics);
    document.getElementById('m-height').addEventListener('input', window.autoCalculateBiometrics);
    document.getElementById('f-sex').addEventListener('change', window.autoCalculateBiometrics);
    document.getElementById('f-dob').addEventListener('input', () => { document.getElementById('m-age').value = ''; window.autoCalculateBiometrics(); });
});

window.addGoalRow = function(containerId, data = null) {
    const row = document.createElement('div');
    row.className = 'goal-row flex flex-col md:flex-row gap-3 p-4 bg-[#12121a] border border-white/5 rounded-xl items-end relative mt-2';
    row.innerHTML = `
        <div class="w-full md:w-1/5"><label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Variable</label>
            <select class="g-key executive-input p-2 rounded-lg text-[10px] w-full">${MEASURABLE_METRICS.map(m => `<option value="${m.id}" ${data && data.metric_key === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
        </div>
        <div class="w-full md:w-[12%]"><label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Inicio</label><input type="text" class="g-st executive-input p-2 text-xs font-mono w-full" value="${data?data.start_value||'':''}"></div>
        <div class="w-full md:w-[12%]"><label class="block text-[8px] text-[#FFC300] uppercase font-black mb-1">Target</label><input type="text" class="g-tg executive-input p-2 text-xs font-mono w-full !border-[#FFC300]/30 !text-[#FFC300]" value="${data?data.target_value||'':''}"></div>
        <div class="w-full md:flex-grow"><label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Directiva</label><input type="text" class="g-ds executive-input p-2 text-xs w-full" value="${data?data.description||'':''}"></div>
        <div class="w-full md:w-[15%]"><label class="block text-[8px] text-gray-500 uppercase font-black mb-1">Estado</label>
            <select class="g-stt executive-input p-2 rounded-lg text-[9px] font-black uppercase w-full ${data && data.status==='Cumplido'?'text-emerald-400':'text-gray-300'}"><option value="En progreso" ${data && data.status!=='Cumplido'?'selected':''}>En progreso</option><option value="Cumplido" ${data && data.status==='Cumplido'?'selected':''}>Cumplido</option></select>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="w-full md:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase shrink-0 transition-colors">X</button>
    `;
    document.getElementById(containerId).appendChild(row);
};

document.getElementById('metrics-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!window.activeUserId) return;
    const btn = document.getElementById('btn-submit-metrics');
    
    const payload = {
        weight: document.getElementById('m-weight').value, height: document.getElementById('m-height').value,
        fat_percent: document.getElementById('m-fat').value, muscle_percent: document.getElementById('m-muscle').value,
        neck: document.getElementById('m-neck').value, back: document.getElementById('m-back').value,
        thorax: document.getElementById('m-thorax').value, abdomen: document.getElementById('m-abdomen').value,
        bicep_left: document.getElementById('m-bicep-l').value, bicep_right: document.getElementById('m-bicep-r').value,
        forearm_left: document.getElementById('m-forearm-l').value, forearm_right: document.getElementById('m-forearm-r').value,
        waist: document.getElementById('m-waist').value, femur_left: document.getElementById('m-femur-l').value,
        femur_right: document.getElementById('m-femur-r').value, tibia_left: document.getElementById('m-tibia-l').value,
        tibia_right: document.getElementById('m-tibia-r').value, rm_push: document.getElementById('m-push').value,
        rm_pull: document.getElementById('m-pull').value, rm_legs: document.getElementById('m-legs').value,
        allergies: document.getElementById('m-allergies').value, chronic_diseases: document.getElementById('m-diseases').value,
        medical_notes: document.getElementById('m-medical-notes').value
    };

    btn.disabled = true; btn.textContent = "Sincronizando...";
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/metrics/${window.activeUserId}`, { method: 'POST', headers: window.getSecureHeaders(), body: JSON.stringify(payload) });
        if((await res.json()).success) window.showUIFeedback("Telemetría asentada.");
    } catch (e) {}
    btn.disabled = false; btn.textContent = "Guardar Biometría";
});

document.getElementById('goals-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!window.activeUserId) return;
    const btn = document.getElementById('btn-submit-goals');
    
    const payload = {
        focus: document.getElementById('g-focus').value,
        short_term: Array.from(document.querySelectorAll('#st-goals-container .goal-row')).map(r => ({ metric_key: r.querySelector('.g-key').value, start_value: r.querySelector('.g-st').value, target_value: r.querySelector('.g-tg').value, description: r.querySelector('.g-ds').value, status: r.querySelector('.g-stt').value })),
        medium_term: Array.from(document.querySelectorAll('#mt-goals-container .goal-row')).map(r => ({ metric_key: r.querySelector('.g-key').value, start_value: r.querySelector('.g-st').value, target_value: r.querySelector('.g-tg').value, description: r.querySelector('.g-ds').value, status: r.querySelector('.g-stt').value })),
        long_term: Array.from(document.querySelectorAll('#lt-goals-container .goal-row')).map(r => ({ metric_key: r.querySelector('.g-key').value, start_value: r.querySelector('.g-st').value, target_value: r.querySelector('.g-tg').value, description: r.querySelector('.g-ds').value, status: r.querySelector('.g-stt').value }))
    };

    btn.disabled = true; btn.textContent = "Procesando...";
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/goals/${window.activeUserId}`, { method: 'POST', headers: window.getSecureHeaders(), body: JSON.stringify(payload) });
        if((await res.json()).success) window.showUIFeedback("Matriz estratégica fijada.");
    } catch (e) {}
    btn.disabled = false; btn.textContent = "Fijar Matriz Estratégica";
});

window.saveDiet = async function() {
    const title = document.getElementById('d-title').value.trim();
    const text = document.getElementById('d-text').value.trim();
    const btn = document.getElementById('btn-save-diet');

    if (!title || !text) { window.showUIFeedback("Título y menú requeridos", "error"); return; }

    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/diet/${window.activeUserId}`, { method: 'POST', headers: window.getSecureHeaders(), body: JSON.stringify({ title: title, menu_text: text }) });
        if ((await res.json()).success) window.showUIFeedback("Nutrición sincronizada con App.");
    } catch(e) { window.showUIFeedback("Falla de red.", "error"); }
    btn.disabled = false; btn.textContent = 'Publicar en App';
};

window.deleteDiet = async function() {
    if (!confirm("⚠️ ¿Revocar plan nutricional del atleta de forma permanente?")) return;
    try {
        const res = await fetch(`${window.API_BASE_URL}/api/admin/diet/${window.activeUserId}`, { method: 'DELETE', headers: window.getSecureHeaders() });
        if ((await res.json()).success) { 
            window.showUIFeedback("Plan nutricional purgado."); 
            document.getElementById('d-title').value = ""; document.getElementById('d-text').value = "";
        }
    } catch(e) {}
};
