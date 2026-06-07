const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let allFilms = [];
let chapterCount = 0;

function showToast(message, type = 'success') {
    const box = document.getElementById('admin-toast');
    box.textContent = message;
    box.className = `fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-2xl z-[9999] transition-all duration-400 text-center border backdrop-blur-md w-11/12 max-w-[360px] ${type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}`;
    box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(-50%, -20px)'; }, 4000);
}

async function fetchAllFilms() {
    const token = localStorage.getItem('gymen_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/on/films`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (res.ok && data.success) {
            allFilms = data.films;
            renderFilmsGrid(allFilms);
            document.getElementById('admin-spinner').classList.add('hidden');
            document.getElementById('admin-panel-content').classList.remove('hidden');
        }
    } catch (e) { showToast("Error de conexión con el servidor.", "error"); }
}

function addChapterRow(data = null) {
    chapterCount++;
    const container = document.getElementById('chapters-container');
    const rowId = `chapter-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const div = document.createElement('div');
    div.id = rowId;
    div.className = "chapter-card bg-black/40 border border-white/5 p-4 rounded-xl relative group hover:border-red-500/30";
    
    div.innerHTML = `
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-red-500 hover:text-red-400 text-lg leading-none font-bold">&times;</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div class="md:col-span-1">
                <label class="block text-[8px] text-gray-500 font-bold uppercase mb-1">Nº</label>
                <input type="number" class="chap-num w-full glass-input p-2 rounded-lg text-center font-mono" value="${data ? data.chapter_number : chapterCount}" required min="1">
            </div>
            <div class="md:col-span-5">
                <label class="block text-[8px] text-gray-500 font-bold uppercase mb-1">Título del Capítulo</label>
                <input type="text" class="chap-title w-full glass-input p-2 rounded-lg" value="${data ? data.title : ''}" placeholder="Ej: El Despertar" required>
            </div>
            <div class="md:col-span-2">
                <label class="block text-[8px] text-gray-500 font-bold uppercase mb-1">Duración</label>
                <input type="text" class="chap-duration w-full glass-input p-2 rounded-lg text-center" value="${data ? data.duration : ''}" placeholder="Ej: 45m" required>
            </div>
            <div class="md:col-span-4">
                <label class="block text-[8px] text-gray-500 font-bold uppercase mb-1">URL YouTube</label>
                <input type="url" class="chap-url w-full glass-input p-2 rounded-lg text-[9px] font-mono text-sky-400" value="${data ? data.video_url : ''}" placeholder="https://youtube.com/watch?v=..." required>
            </div>
            <div class="md:col-span-12">
                <label class="block text-[8px] text-gray-500 font-bold uppercase mb-1">Descripción Breve</label>
                <input type="text" class="chap-desc w-full glass-input p-2 rounded-lg text-[10px]" value="${data ? (data.description || '') : ''}" placeholder="Resumen del capítulo...">
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

function openFilmModal(filmData = null) {
    const modal = document.getElementById('film-modal');
    document.getElementById('film-form').reset();
    document.getElementById('chapters-container').innerHTML = '';
    chapterCount = 0;

    if (filmData) {
        document.getElementById('modal-film-title').textContent = "Editar Producción";
        document.getElementById('form-film-id').value = filmData.id;
        document.getElementById('form-title').value = filmData.title;
        document.getElementById('form-category').value = filmData.category;
        document.getElementById('form-year').value = filmData.year;
        document.getElementById('form-age').value = filmData.age_rating;
        document.getElementById('form-tier').value = filmData.subscription_tier;
        document.getElementById('form-cover').value = filmData.cover_url || '';
        document.getElementById('form-synopsis').value = filmData.synopsis || '';
        
        if (filmData.chapters && filmData.chapters.length > 0) {
            filmData.chapters.forEach(chap => addChapterRow(chap));
        } else { addChapterRow(); }
    } else {
        document.getElementById('modal-film-title').textContent = "Nueva Producción";
        document.getElementById('form-film-id').value = "";
        addChapterRow(); 
    }

    modal.classList.remove('hidden', 'pointer-events-none');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function closeFilmModal() {
    const modal = document.getElementById('film-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

async function handleFilmSubmit(e) {
    e.preventDefault();
    const chapters = extractChapters();
    if (chapters.length === 0) { showToast("Debes añadir al menos 1 capítulo.", "error"); return; }

    const btn = document.getElementById('btn-submit-film');
    btn.disabled = true; btn.textContent = 'Guardando...';

    const payload = {
        title: document.getElementById('form-title').value.trim(),
        category: document.getElementById('form-category').value,
        year: parseInt(document.getElementById('form-year').value),
        age_rating: document.getElementById('form-age').value,
        subscription_tier: document.getElementById('form-tier').value,
        cover_url: document.getElementById('form-cover').value.trim(),
        synopsis: document.getElementById('form-synopsis').value.trim(),
        chapters: chapters
    };

    const filmId = document.getElementById('form-film-id').value;
    const isEdit = filmId !== "";
    const url = isEdit ? `${API_BASE_URL}/api/admin/on/film/${filmId}` : `${API_BASE_URL}/api/admin/on/film`;
    const token = localStorage.getItem('gymen_admin_token');

    try {
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(data.message);
            closeFilmModal();
            fetchAllFilms();
        } else { showToast(data.error, "error"); }
    } catch (err) { showToast("Fallo de red al enviar.", "error"); }
    
    btn.disabled = false; btn.textContent = 'Guardar Producción';
}

function renderFilmsGrid(films) {
    const container = document.getElementById('films-grid-container');
    container.innerHTML = '';

    if (films.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-[10px]">No hay producciones.</div>`;
        return;
    }

    films.forEach(film => {
        let tierColor = "bg-gray-500";
        if (film.subscription_tier === 'PLUS') tierColor = "bg-sky-500";
        if (film.subscription_tier === 'ULTRA') tierColor = "bg-[#FFC300]";

        const safeJson = JSON.stringify(film).replace(/'/g, "&#39;");

        const card = document.createElement('div');
        card.className = "glass-panel rounded-2xl overflow-hidden group border border-white/5 relative flex flex-col";
        card.innerHTML = `
            <div class="relative w-full aspect-[16/9] overflow-hidden bg-black/50">
                <img src="${film.cover_url}" class="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
                <div class="absolute top-2 left-2 flex gap-1">
                    <span class="px-2 py-0.5 bg-black/80 text-white text-[8px] font-black uppercase rounded">${film.category}</span>
                    <span class="px-2 py-0.5 bg-black/80 text-white text-[8px] font-black uppercase rounded">${film.age_rating}</span>
                </div>
                <div class="absolute top-2 right-2 px-2 py-0.5 ${tierColor} text-black text-[8px] font-black uppercase rounded shadow-md">
                    ${film.subscription_tier}
                </div>
            </div>
            <div class="p-5 flex-grow flex flex-col">
                <h4 class="text-base font-black uppercase tracking-tighter text-white mb-1 truncate">${film.title}</h4>
                <div class="flex items-center gap-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-3">
                    <span>${film.year}</span><span>•</span><span>${(film.chapters || []).length} Capítulos</span>
                </div>
                <p class="text-[10px] text-gray-500 line-clamp-2 leading-relaxed flex-grow">${film.synopsis}</p>
                <div class="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                    <button onclick='openFilmModal(${safeJson})' class="text-[9px] font-black text-white hover:text-red-500 uppercase tracking-widest transition">Editar</button>
                    <button onclick="deleteFilm('${film.id}', '${film.title.replace(/'/g, "\\'")}')" class="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest transition">Purgar</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function triggerFilmSearch() {
    const term = document.getElementById('admin-film-search').value.toLowerCase().trim();
    if (!term) return renderFilmsGrid(allFilms);
    const filtered = allFilms.filter(f => f.title.toLowerCase().includes(term) || f.category.toLowerCase().includes(term));
    renderFilmsGrid(filtered);
}

async function deleteFilm(id, title) {
    if (!confirm(`⚠️ ¿Eliminar permanentemente "${title}"?`)) return;
    const token = localStorage.getItem('gymen_admin_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/on/film/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) { showToast("Producción eliminada."); fetchAllFilms(); }
    } catch (e) {}
}

window.addEventListener('DOMContentLoaded', () => {
    fetchAllFilms();
});
