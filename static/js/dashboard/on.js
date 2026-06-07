const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let catalogFilms = [];
let userTier = 'BASICO';
let ytPlayer = null; 
let progressInterval = null; 
let hideUiTimeout = null; // Controla los 3 segundos de inactividad del reproductor

// ==========================================
// 1. CARGA INICIAL Y RANDOM HERO
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) { window.location.href = '/apps/start/login.html'; return; }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Eventos para auto-ocultar los controles (3 segundos)
    const overlay = document.getElementById('native-player-overlay');
    overlay.addEventListener('mousemove', resetPlayerUI);
    overlay.addEventListener('click', resetPlayerUI);
    overlay.addEventListener('touchstart', resetPlayerUI);

    try {
        const res = await fetch(`${API_BASE_URL}/api/client/on/films`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            catalogFilms = data.films;
            userTier = data.user_tier;

            if (catalogFilms.length > 0) {
                const randomIndex = Math.floor(Math.random() * catalogFilms.length);
                const heroFilm = catalogFilms[randomIndex];
                renderHero(heroFilm);
                renderRows();
            }
        }
    } catch (e) {
        console.error("Error sincronizando ON STREAMING", e);
    }
});

function renderHero(film) {
    document.getElementById('hero-cover').src = film.cover_url;
    document.getElementById('hero-title').innerHTML = film.title;
    document.getElementById('hero-desc').textContent = film.synopsis;
    document.getElementById('hero-year').textContent = film.year;
    document.getElementById('hero-age').textContent = film.age_rating;

    const playBtn = document.getElementById('hero-play-btn');
    
    if (film.has_access) {
        playBtn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Ver Capítulos`;
        playBtn.className = "flex items-center gap-2 md:gap-3 bg-white text-black px-6 md:px-8 py-3 md:py-3.5 rounded-lg font-black uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-gray-200 transition transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]";
        playBtn.onclick = () => openDetailsModal(film);
    } else {
        playBtn.innerHTML = `🔒 MEJORAR PLAN ${film.subscription_tier}`;
        playBtn.className = "flex items-center justify-center gap-2 md:gap-3 bg-[#FFC300] text-black px-6 md:px-8 py-3 md:py-3.5 rounded-lg font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-[0_0_20px_rgba(255,195,0,0.4)] transition transform hover:scale-105";
        playBtn.onclick = () => showPaywallModal(film.subscription_tier);
    }
}

// ==========================================
// 2. RENDERIZADOR DE CARRUSELES
// ==========================================
function renderRows() {
    const mainContainer = document.getElementById('rows-container');
    if(!mainContainer) return;
    
    mainContainer.innerHTML = '';

    const categories = ["Serie", "Película", "Documental", "Corto"];

    categories.forEach(cat => {
        const filmsInCat = catalogFilms.filter(f => f.category === cat);
        if (filmsInCat.length === 0) return;

        const section = document.createElement('section');
        section.className = "max-w-[1400px] mx-auto";
        
        let cardsHtml = '';
        filmsInCat.forEach(film => {
            const lockOverlay = !film.has_access ? `
                <div class="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none group-hover:bg-black/40 transition-colors">
                    <span class="text-3xl md:text-4xl mb-2 drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300">🔒</span>
                    <span class="text-[8px] font-black uppercase text-[#FFC300] tracking-widest bg-black/80 px-2.5 py-1 rounded shadow-lg border border-[#FFC300]/30">${film.subscription_tier}</span>
                </div>
            ` : '';

            const safeFilmObj = JSON.stringify(film).replace(/'/g, "&#39;");

            // Modificado: El título tiene un fondo oscuro en la parte inferior para verse SIEMPRE
            cardsHtml += `
                <div class="carousel-card relative min-w-[200px] md:min-w-[280px] aspect-video rounded-md bg-gray-900 cursor-pointer snap-center group overflow-hidden border border-white/5 flex flex-col justify-end" onclick='handleCardClick(${safeFilmObj})'>
                    ${lockOverlay}
                    <img src="${film.cover_url}" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-3 md:p-4 flex flex-col justify-end z-30">
                        <h4 class="text-white font-black text-xs md:text-sm uppercase leading-tight mb-1 truncate drop-shadow-md">${film.title}</h4>
                        <div class="flex items-center gap-2 text-[8px] md:text-[9px] font-bold text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span class="text-red-500">${film.year}</span>
                            <span class="border border-gray-400 px-1 rounded">${film.age_rating}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        section.innerHTML = `
            <h2 class="px-4 md:px-12 text-base md:text-xl font-black text-white mb-3 md:mb-4 tracking-tighter">${cat}s</h2>
            <div class="px-4 md:px-12 flex gap-3 md:gap-4 overflow-x-auto hide-scrollbar pb-8 snap-x snap-mandatory">
                ${cardsHtml}
            </div>
        `;
        mainContainer.appendChild(section);
    });
}

function handleCardClick(film) {
    if (!film.has_access) {
        showPaywallModal(film.subscription_tier); 
        return;
    }
    openDetailsModal(film);
}

// ==========================================
// 3. MODAL DE DETALLES (LISTA DE CAPÍTULOS)
// ==========================================
function openDetailsModal(film) {
    document.getElementById('details-cover').src = film.cover_url;
    document.getElementById('details-title').textContent = film.title;
    document.getElementById('details-year').textContent = film.year;
    document.getElementById('details-age').textContent = film.age_rating;
    document.getElementById('details-category').textContent = film.category;
    document.getElementById('details-synopsis').textContent = film.synopsis;
    
    let tierColor = "text-gray-400";
    if(film.subscription_tier === 'PLUS') tierColor = "text-sky-400";
    if(film.subscription_tier === 'ULTRA') tierColor = "text-[#FFC300]";
    
    const tierEl = document.getElementById('details-tier');
    tierEl.textContent = film.subscription_tier;
    tierEl.className = `font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2 py-0.5 rounded ${tierColor}`;

    const playBtn = document.getElementById('details-play-btn');
    if (film.chapters && film.chapters.length > 0) {
        playBtn.onclick = () => {
            closeDetailsModal();
            openCustomPlayer(film, film.chapters[0]);
        };
    }

    const epsContainer = document.getElementById('details-episodes-list');
    epsContainer.innerHTML = '';
    document.getElementById('details-ep-count').textContent = `${(film.chapters || []).length} Episodios`;

    if (film.chapters && film.chapters.length > 0) {
        film.chapters.forEach((chap) => {
            const epDiv = document.createElement('div');
            epDiv.className = "flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 rounded-xl cursor-pointer transition-colors group";
            epDiv.onclick = () => {
                closeDetailsModal();
                openCustomPlayer(film, chap);
            };

            epDiv.innerHTML = `
                <div class="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                    <div class="text-lg md:text-xl font-black text-gray-600 group-hover:text-red-500 transition-colors w-6 text-center shrink-0">
                        ${chap.chapter_number}
                    </div>
                    <div class="flex-grow pr-2">
                        <h4 class="text-xs md:text-sm font-bold text-white">${chap.title}</h4>
                        <p class="text-[9px] md:text-[10px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">${chap.description || 'Sin descripción disponible.'}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between w-full sm:w-auto mt-3 sm:mt-0">
                    <span class="text-[9px] md:text-[10px] font-mono font-bold text-gray-400 mr-4 sm:ml-4 shrink-0">${chap.duration || '--'}</span>
                    <button class="w-7 h-7 md:w-8 md:h-8 rounded-full border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors shrink-0">
                        <svg class="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                </div>
            `;
            epsContainer.appendChild(epDiv);
        });
    }

    const modal = document.getElementById('details-modal');
    const content = document.getElementById('details-modal-content');
    document.body.style.overflow = 'hidden';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 50);
}

function closeDetailsModal() {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('details-modal-content');
    document.body.style.overflow = 'auto';
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

// ==========================================
// 4. CONTROLADORES DEL MODAL PAYWALL
// ==========================================
function showPaywallModal(requiredTier) {
    const modal = document.getElementById('paywall-modal');
    const content = document.getElementById('paywall-content');
    document.getElementById('paywall-tier-req').textContent = requiredTier;
    document.body.style.overflow = 'hidden';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 50);
}

function closePaywallModal() {
    const modal = document.getElementById('paywall-modal');
    const content = document.getElementById('paywall-content');
    document.body.style.overflow = 'auto';
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

// ==========================================
// 5. MAGIA: CUSTOM YOUTUBE PLAYER API & AUTO-HIDE
// ==========================================
function extractYTId(url) {
    if(!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function openCustomPlayer(film, chapter) {
    const ytId = extractYTId(chapter.video_url);
    if (!ytId) return;

    document.getElementById('player-film-title').textContent = film.title;
    document.getElementById('player-chapter-title').textContent = `${chapter.chapter_number}. ${chapter.title}`;

    const playerOverlay = document.getElementById('native-player-overlay');
    document.body.style.overflow = 'hidden';
    
    playerOverlay.classList.remove('hidden');
    playerOverlay.classList.add('flex');
    setTimeout(() => playerOverlay.classList.remove('opacity-0'), 50);

    if (ytPlayer) { ytPlayer.destroy(); }

    ytPlayer = new YT.Player('yt-player-container', {
        videoId: ytId,
        playerVars: {
            controls: 0, modestbranding: 1, rel: 0, showinfo: 0,
            fs: 0, disablekb: 1, autoplay: 1, playsinline: 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });

    resetPlayerUI(); // Iniciar reloj de inactividad
}

function closeCustomPlayer() {
    const playerOverlay = document.getElementById('native-player-overlay');
    document.body.style.overflow = 'auto';
    
    if (ytPlayer) ytPlayer.pauseVideo();
    
    playerOverlay.classList.add('opacity-0');
    setTimeout(() => {
        playerOverlay.classList.remove('flex');
        playerOverlay.classList.add('hidden');
        if (ytPlayer) { ytPlayer.destroy(); ytPlayer = null; }
        clearInterval(progressInterval);
        clearTimeout(hideUiTimeout);
    }, 500);
}

// LÓGICA DE AUTO-OCULTADO DE BARRAS NEGRAS Y MOUSE (3 SEGUNDOS)
function resetPlayerUI() {
    const vc = document.getElementById('video-wrapper-container');
    if(!vc) return;
    
    vc.classList.remove('idle');
    clearTimeout(hideUiTimeout);
    
    hideUiTimeout = setTimeout(() => {
        // Solo oculta si el video está reproduciéndose
        if (ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            vc.classList.add('idle');
        }
    }, 3000); // 3 segundos exactos
}

function onPlayerReady(event) {
    event.target.playVideo();
    const volInput = document.getElementById('custom-vol-input');
    event.target.setVolume(volInput.value);
    progressInterval = setInterval(updateProgressBar, 500);
}

function togglePlay() {
    if (!ytPlayer) return;
    const state = ytPlayer.getPlayerState();
    const btnIcon = document.getElementById('play-pause-icon');

    if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
        btnIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    } else {
        ytPlayer.playVideo();
        btnIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    }
    resetPlayerUI();
}

function onPlayerStateChange(event) {
    const btnIcon = document.getElementById('play-pause-icon');
    const vc = document.getElementById('video-wrapper-container');

    if (event.data === YT.PlayerState.PLAYING) {
        btnIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
        resetPlayerUI();
    } else {
        btnIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
        // Si está en pausa, nunca ocultes las barras
        vc.classList.remove('idle');
        clearTimeout(hideUiTimeout);
    }
}

function seekRelative(seconds) {
    if (!ytPlayer) return;
    ytPlayer.seekTo(ytPlayer.getCurrentTime() + seconds, true);
    resetPlayerUI();
}

function changeVolume(value) {
    if (!ytPlayer) return;
    ytPlayer.setVolume(value);
    resetPlayerUI();
}

function updateProgressBar() {
    if (!ytPlayer || !ytPlayer.getDuration) return;
    const duration = ytPlayer.getDuration();
    const currentTime = ytPlayer.getCurrentTime();
    
    if (duration > 0) {
        const percentage = (currentTime / duration) * 100;
        document.getElementById('custom-progress-red').style.width = `${percentage}%`;
        document.getElementById('custom-progress-thumb').style.left = `${percentage}%`;
        document.getElementById('custom-time-display').textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }
}

document.getElementById('progress-bar-clickable').addEventListener('click', function(e) {
    if (!ytPlayer) return;
    const rect = this.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    ytPlayer.seekTo(ytPlayer.getDuration() * percentage, true);
    resetPlayerUI();
});

function toggleFullScreen() {
    const elem = document.getElementById('native-player-overlay');
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(e => console.log(e));
    } else {
        document.exitFullscreen();
    }
    resetPlayerUI();
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

document.getElementById('click-to-pause-layer').addEventListener('click', togglePlay);
