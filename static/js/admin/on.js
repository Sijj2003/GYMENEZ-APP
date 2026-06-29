// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

// Memoria RAM
let allVideosData = [];
let activeVideoId = null;
let currentCategoryFilter = '';
let chapterCount = 0; // Para llevar la cuenta de episodios al añadir

function getSecureHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gymen_admin_token')}` };
}

function showUIFeedback(message, type = 'success') {
    const box = document.getElementById('message-box');
    if(!box) return;
    box.textContent = message;
    box.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-300 text-center border backdrop-blur-md ${type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 3000);
}

// ==========================================
// 📡 CARGA INICIAL (RAM)
// ==========================================
async function fetchAllVideos() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/on/films`, { headers: getSecureHeaders() });
        const data = await res.json();
        
        if (data.success) {
            allVideosData = data.films || [];
            refreshActiveList();
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        document.getElementById('inventory-list').innerHTML = `<div class="p-4 text-center text-red-500 font-bold text-[10px] uppercase tracking-widest">Error de red leyendo catálogo</div>`;
    }
}

// ==========================================
// 🎛️ CONTROL DE LISTA E INVENTARIO
// ==========================================
function filterCategory(cat) {
    currentCategoryFilter = cat;
    
    document.querySelectorAll('.cat-filter').forEach(btn => {
        if(btn.textContent.trim().toLowerCase() === (cat ? cat.toLowerCase() : 'todos') || (cat==='' && btn.textContent.trim()==='Todos')) {
            btn.className = "cat-filter px-3 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[8px] font-black uppercase tracking-widest shrink-0 transition-all";
        } else {
            btn.className = "cat-filter px-3 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white text-[8px] font-black uppercase tracking-widest shrink-0 transition-all";
        }
    });

    refreshActiveList(document.getElementById('search-inventory').value);
}

function refreshActiveList(searchTerm = '') {
    const normalizeText = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const term = normalizeText(searchTerm);
    const filterCat = normalizeText(currentCategoryFilter);
    const container = document.getElementById('inventory-list');
    container.innerHTML = '';

    let list = allVideosData.filter(v => {
        const vTitle = normalizeText(v.title);
        const vCat = normalizeText(v.category);
        
        const matchesTerm = vTitle.includes(term) || vCat.includes(term);
        const matchesCat = currentCategoryFilter === '' || vCat.includes(filterCat);
        return matchesTerm && matchesCat;
    });

    if (list.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 font-bold uppercase tracking-widest text-[9px]">Sin producciones registradas.</div>`;
        return;
    }

    list.forEach(video => {
        const div = document.createElement('div');
        const isActive = activeVideoId === video.id;
        
        let tierColor = 'text-gray-400 border-gray-500/30';
        if(video.subscription_tier === 'PLUS') tierColor = 'text-sky-400 border-sky-500/30';
        if(video.subscription_tier === 'ULTRA') tierColor = 'text-[#FFC300] border-[#FFC300]/30';

        div.className = `p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-1 ${isActive ? 'bg-white/10 border-red-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`;
        div.onclick = () => loadVideoWorkspace(video.id);

        const chapCount = video.chapters ? video.chapters.length : 0;

        div.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="font-black text-[11px] uppercase tracking-tight truncate text-white">${video.title}</span>
                <span class="px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest shrink-0 ${tierColor}">${video.subscription_tier || 'Básico'}</span>
            </div>
            <div class="flex justify-between items-center mt-1">
                <span class="text-[8px] font-mono text-red-400 uppercase tracking-wider truncate">${video.category || 'Serie'}</span>
                <span class="text-[8px] text-gray-500 font-bold uppercase tracking-widest">${chapCount} Cap.</span>
            </div>
        `;
        container.appendChild(div);
    });
}

let searchTimeout;
document.getElementById('search-inventory').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => refreshActiveList(e.target.value), 200);
});

// ==========================================
// 🖥️ CREADOR DINÁMICO DE CAPÍTULOS
// ==========================================
function addChapterRow(data = null) {
    chapterCount++;
    const container = document.getElementById('chapters-container');
    const rowId = `chapter-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const div = document.createElement('div');
    div.id = rowId;
    
    div.className = "chapter-card bg-black/40 border border-white/10 p-4 rounded-xl relative group transition-all hover:border-red-500/40 hover:bg-white/[0.05]";
    
    div.innerHTML = `
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors opacity-50 hover:opacity-100">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 pr-6">
            <div class="md:col-span-2">
                <label class="block text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Cap. Nº</label>
                <input type="number" class="chap-num w-full glass-input p-2.5 rounded-lg text-center font-mono text-xs" value="${data ? data.chapter_number : chapterCount}" required min="1">
            </div>
            <div class="md:col-span-7">
                <label class="block text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Título del Episodio</label>
                <input type="text" class="chap-title w-full glass-input p-2.5 rounded-lg text-xs" value="${data ? data.title : ''}" placeholder="El Despertar" required>
            </div>
            <div class="md:col-span-3">
                <label class="block text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Duración</label>
                <input type="text" class="chap-duration w-full glass-input p-2.5 rounded-lg text-center text-xs" value="${data ? data.duration : ''}" placeholder="45:00" required>
            </div>
            <div class="md:col-span-12">
                <label class="block text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">URL (YouTube / Vimeo)</label>
                <input type="url" class="chap-url w-full glass-input p-2.5 rounded-lg text-xs font-mono text-sky-400" value="${data ? data.video_url : ''}" oninput="updateVideoPreview(this.value)" placeholder="https://youtube.com/..." required>
            </div>
            <div class="md:col-span-12">
                <label class="block text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Descripción Breve</label>
                <textarea class="chap-desc w-full glass-input p-2.5 rounded-lg text-xs resize-none" rows="2" placeholder="Resumen del capítulo...">${data ? (data.description || '') : ''}</textarea>
            </div>
        </div>
    `;
    container.appendChild(div);
}

function extractChapters() {
    const rows = document.querySelectorAll('#chapters-container .chapter-card');
    const chapters = [];
    rows.forEach(row => {
        chapters.push({
            chapter_number: parseInt(row.querySelector('.chap-num').value),
            title: row.querySelector('.chap-title').value.trim(),
            duration: row.querySelector('.chap-duration').value.trim(),
            video_url: row.querySelector('.chap-url').value.trim(),
            description: row.querySelector('.chap-desc').value.trim()
        });
    });
    return chapters.sort((a, b) => a.chapter_number - b.chapter_number);
}

// ==========================================
// 🖥️ CONTROL DEL LIENZO Y PREVISUALIZADOR
// ==========================================
function hideWorkspace() {
    document.getElementById('ws-empty').classList.add('hidden');
    document.getElementById('ws-video').classList.add('hidden');
    document.getElementById('ws-video').classList.remove('flex');
}

function openCreateWorkspace() {
    activeVideoId = null;
    refreshActiveList(document.getElementById('search-inventory').value);
    hideWorkspace();
    
    document.getElementById('ws-video').classList.remove('hidden');
    document.getElementById('ws-video').classList.add('flex');
    
    document.getElementById('v-header-title').textContent = "Nueva Producción";
    document.getElementById('v-header-title').className = "text-2xl font-black uppercase tracking-tighter text-red-500";
    document.getElementById('v-cat-badge').textContent = "Edición Activa";
    document.getElementById('v-btn-delete').classList.add('hidden');
    
    document.getElementById('video-form').reset();
    document.getElementById('v-id').value = '';
    document.getElementById('v-is-edit').value = 'false';
    
    // Limpiamos los capítulos y agregamos uno vacío
    document.getElementById('chapters-container').innerHTML = '';
    chapterCount = 0;
    addChapterRow();

    updateVideoPreview('');
}

function loadVideoWorkspace(id) {
    const video = allVideosData.find(x => x.id === id); 
    if (!video) return;

    activeVideoId = id;
    refreshActiveList(document.getElementById('search-inventory').value); 
    hideWorkspace();
    
    document.getElementById('ws-video').classList.remove('hidden');
    document.getElementById('ws-video').classList.add('flex');
    
    document.getElementById('v-header-title').textContent = video.title;
    document.getElementById('v-header-title').className = "text-2xl font-black uppercase tracking-tighter text-white";
    document.getElementById('v-cat-badge').textContent = video.category || 'N/A';
    document.getElementById('v-btn-delete').classList.remove('hidden');
    
    // Rellenamos el formulario general
    document.getElementById('v-id').value = video.id;
    document.getElementById('v-is-edit').value = 'true';
    document.getElementById('v-title').value = video.title || '';
    
    const selectCat = document.getElementById('v-category');
    const dbCat = video.category || 'Otro';
    const exactMatch = Array.from(selectCat.options).some(opt => opt.value === dbCat);
    if(exactMatch) selectCat.value = dbCat; else selectCat.value = 'Otro';

    document.getElementById('v-tier').value = video.subscription_tier || 'BASICO';
    document.getElementById('v-year').value = video.year || 2026;
    document.getElementById('v-age').value = video.age_rating || 'TP';
    document.getElementById('v-cover').value = video.cover_url || '';
    document.getElementById('v-trailer').value = video.trailer_url || '';
    document.getElementById('v-desc').value = video.synopsis || '';

    // Reconstruimos los Capítulos Dinámicos
    document.getElementById('chapters-container').innerHTML = '';
    chapterCount = 0;
    
    let firstVideoUrl = '';
    if (video.chapters && video.chapters.length > 0) {
        video.chapters.forEach(chap => {
            addChapterRow(chap);
            if (!firstVideoUrl) firstVideoUrl = chap.video_url; // Guardamos el del primer cap para el preview
        });
    } else {
        addChapterRow(); 
    }

    updateVideoPreview(firstVideoUrl);
}

// 🎬 Monitor de Previsualización Inteligente
function updateVideoPreview(url) {
    const emptyDiv = document.getElementById('v-preview-empty');
    const iframe = document.getElementById('v-preview-iframe');

    if (!url) {
        emptyDiv.classList.remove('hidden'); iframe.classList.add('hidden'); iframe.src = ''; return;
    }

    // Extraer ID de YouTube
    let videoId = null;
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(ytRegex);
    if (match && match[1]) { videoId = match[1]; }

    if (videoId) {
        emptyDiv.classList.add('hidden');
        iframe.classList.remove('hidden');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&showinfo=0&controls=1`;
    } else {
        emptyDiv.classList.remove('hidden'); iframe.classList.add('hidden'); iframe.src = '';
    }
}

// ==========================================
// 💾 GESTIÓN DE GUARDADO Y ELIMINADO
// ==========================================
async function saveVideo() {
    const form = document.getElementById('video-form');
    if(!form.checkValidity()) { form.reportValidity(); return; }

    const chapters = extractChapters();
    if (chapters.length === 0) { showUIFeedback("Debes añadir al menos 1 capítulo.", "error"); return; }

    const isEdit = document.getElementById('v-is-edit').value === 'true';
    const vId = document.getElementById('v-id').value;
    const btn = document.getElementById('v-btn-save');

    // Mapeo Exacto con la Estructura Original Backend
    const payload = {
        title: document.getElementById('v-title').value.trim(),
        category: document.getElementById('v-category').value,
        subscription_tier: document.getElementById('v-tier').value,
        year: parseInt(document.getElementById('v-year').value) || 2026,
        age_rating: document.getElementById('v-age').value,
        cover_url: document.getElementById('v-cover').value.trim(),
        trailer_url: document.getElementById('v-trailer').value.trim(),
        synopsis: document.getElementById('v-desc').value.trim(),
        chapters: chapters
    };

    btn.disabled = true; btn.textContent = '...';
    // Mantiene la ruta perimetral original que dictaste en tus reglas previas
    const urlEndpoint = isEdit ? `${API_BASE_URL}/api/admin/on/film/${vId}` : `${API_BASE_URL}/api/admin/on/film`;

    try {
        const res = await fetch(urlEndpoint, { method: isEdit ? 'PUT' : 'POST', headers: getSecureHeaders(), body: JSON.stringify(payload) });
        const data = await res.json();
        
        if (data.success) { 
            showUIFeedback("Producción publicada en Gymenez ON."); 
            await fetchAllVideos(); 
            if(!isEdit) {
                const newV = allVideosData.find(v => (v.title||v.name).toLowerCase() === payload.title.toLowerCase());
                if(newV) loadVideoWorkspace(newV.id);
            }
        } else {
            showUIFeedback(data.error, 'error');
        }
    } catch (e) { showUIFeedback("Falla de red.", 'error'); }
    btn.disabled = false; btn.textContent = 'Publicar Producción';
}

async function deleteCurrentVideo() {
    const id = document.getElementById('v-id').value;
    if(!confirm('¿Dar de baja? Esta serie/película ya no estará disponible para los usuarios.')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/on/film/${id}`, { method: 'DELETE', headers: getSecureHeaders() });
        if((await res.json()).success) { 
            showUIFeedback("Señal interrumpida (Eliminado)."); 
            hideWorkspace(); 
            document.getElementById('ws-empty').classList.remove('hidden');
            fetchAllVideos(); 
        }
    } catch(e) {}
}

// INICIALIZAR
window.addEventListener('DOMContentLoaded', fetchAllVideos);
