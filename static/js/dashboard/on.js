const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let catalogFilms = [];
let userTier = 'BASICO';
let userAnalytics = {}; 
let ytPlayer = null; 
let progressInterval = null; 
let hideUiTimeout = null; 
let currentPlayingFilm = null; 
let currentPlayingChapter = null; 

// ==========================================
// 1. CARGA INICIAL Y RANDOM HERO
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    // Solo comprobamos existencia para no cargar si no está logueado
    const token = localStorage.getItem('gymen_auth_token') || localStorage.getItem('user_token');
    if (!token) { window.location.href = '/apps/start/login.html'; return; }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    const overlay = document.getElementById('native-player-overlay');
    overlay.addEventListener('mousemove', resetPlayerUI);
    overlay.addEventListener('click', resetPlayerUI);
    overlay.addEventListener('touchstart', resetPlayerUI);

    try {
        // 🔥 CORRECCIÓN 401: Dejamos que el auth_middleware inyecte el Token solo.
        const [resFilms, resAnalytics] = await Promise.all([
            fetch(`${API_BASE_URL}/api/client/on/films`),
            fetch(`${API_BASE_URL}/api/client/on/analytics`)
        ]);
        
        const dataFilms = await resFilms.json();
        const dataAnalytics = await resAnalytics.json();

        if (dataFilms.success) {
            catalogFilms = dataFilms.films;
            userTier = dataFilms.user_tier;
            
            if (dataAnalytics.success && dataAnalytics.analytics) {
                userAnalytics = dataAnalytics.analytics.history || {};
            }

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

            let progressHtml = '';
            if (film.chapters && film.chapters.length > 0) {
                const historyKey = `${film.id}_${film.chapters[0].chapter_number}`;
                const historyData = userAnalytics[historyKey];
                
                if (historyData && historyData.last_position > 0 && historyData.duration > 0 && !historyData.completed) {
                    const percentage = (historyData.last_position / historyData.duration) * 100;
                    progressHtml = `
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-gray-700 z-40">
                            <div class="h-full bg-red-600" style="width: ${percentage}%;"></div>
                        </div>
                    `;
                }
            }

            const safeFilmObj = JSON.stringify(film).replace(/'/g, "&#39;");

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
                    ${progressHtml}
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
        let capToPlay = film.chapters[0];
        
        const historyKey = `${film.id}_${capToPlay.chapter_number}`;
        if (userAnalytics[historyKey] && userAnalytics[historyKey].last_position > 0 && !userAnalytics[historyKey].completed) {
            playBtn.innerHTML = `<svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Reanudar`;
        } else {
            playBtn.innerHTML = `<svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Reproducir`;
        }

        playBtn.onclick = () => {
            closeDetailsModal(true); 
            openCustomPlayer(film, capToPlay);
        };
    }

    const epsContainer = document.getElementById('details-episodes-list');
    epsContainer.innerHTML = '';
    document.getElementById('details-ep-count').textContent = `${(film.chapters || []).length} Episodios`;

    if (film.chapters && film.chapters.length > 0) {
        film.chapters.forEach((chap) => {
            
            const chapHistoryKey = `${film.id}_${chap.chapter_number}`;
            const chapData = userAnalytics[chapHistoryKey];
            let chapProgressHtml = '';
            
            if (chapData) {
                if (chapData.completed) {
                    chapProgressHtml = `<span class="text-[8px] text-emerald-400 font-bold uppercase tracking-widest mt-1 block">Visto ✅</span>`;
                } else if (chapData.last_position > 0) {
                    const pct = (chapData.last_position / chapData.duration) * 100;
                    chapProgressHtml = `
                        <div class="w-full max-w-[100px] h-1 bg-gray-700 mt-2 rounded overflow-hidden">
                            <div class="h-full bg-red-600" style="width: ${pct}%;"></div>
                        </div>`;
                }
            }

            const epDiv = document.createElement('div');
            epDiv.className = "flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 rounded-xl cursor-pointer transition-colors group";
            epDiv.onclick = () => {
                closeDetailsModal(true); 
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
                        ${chapProgressHtml}
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

function closeDetailsModal(keepScrollLocked = false) {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('details-modal-content');
    
    if(!keepScrollLocked) { document.body.style.overflow = 'auto'; }
    
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
// 5. MAGIA: CUSTOM YOUTUBE PLAYER API & ANALYTICS
// ==========================================
function extractYTId(url) {
    if(!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// 🧠 FUNCIÓN PARA ASENTAR EL PROGRESO (CORRECCIÓN 401 AL QUITAR HEADERS)
async function syncProgressToCloud() {
    if (!ytPlayer || !currentPlayingFilm || !currentPlayingChapter) return;
    try {
        const currentTime = ytPlayer.getCurrentTime();
        const duration = ytPlayer.getDuration();
        
        const historyKey = `${currentPlayingFilm.id}_${currentPlayingChapter.chapter_number}`;
        if(!userAnalytics[historyKey]) userAnalytics[historyKey] = {};
        userAnalytics[historyKey].last_position = currentTime;
        userAnalytics[historyKey].duration = duration;
        userAnalytics[historyKey].completed = (currentTime >= duration - 15);

        // 🔥 CORRECCIÓN 401: Dejamos que el auth_middleware inyecte el Token solo
        await fetch(`${API_BASE_URL}/api/client/on/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                film_id: currentPlayingFilm.id,
                chapter_number: currentPlayingChapter.chapter_number,
                last_position: currentTime,
                duration: duration
            })
        });
    } catch(e) { console.error("No se pudo guardar el progreso."); }
}

function openCustomPlayer(film, chapter) {
    const ytId = extractYTId(chapter.video_url);
    if (!ytId) return;

    currentPlayingFilm = film; 
    currentPlayingChapter = chapter;

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

    resetPlayerUI(); 
}

function closeCustomPlayer() {
    syncProgressToCloud(); 

    const playerOverlay = document.getElementById('native-player-overlay');
    
    if (ytPlayer) ytPlayer.pauseVideo();
    
    playerOverlay.classList.add('opacity-0');
    setTimeout(() => {
        playerOverlay.classList.remove('flex');
        playerOverlay.classList.add('hidden');
        if (ytPlayer) { ytPlayer.destroy(); ytPlayer = null; }
        clearInterval(progressInterval);
        clearTimeout(hideUiTimeout);

        renderRows(); 

        if (currentPlayingFilm) {
            openDetailsModal(currentPlayingFilm);
        } else {
            document.body.style.overflow = 'auto'; 
        }
    }, 500);
}

function resetPlayerUI() {
    const vc = document.getElementById('video-wrapper-container');
    if(!vc) return;
    
    vc.classList.remove('idle');
    clearTimeout(hideUiTimeout);
    
    hideUiTimeout = setTimeout(() => {
        if (ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            vc.classList.add('idle');
        }
    }, 5000); 
}

function onPlayerReady(event) {
    const historyKey = `${currentPlayingFilm.id}_${currentPlayingChapter.chapter_number}`;
    const savedData = userAnalytics[historyKey];
    
    if (savedData && savedData.last_position > 0 && !savedData.completed) {
        event.target.seekTo(savedData.last_position, true);
    }

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
        vc.classList.remove('idle');
        clearTimeout(hideUiTimeout);
        
        if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            syncProgressToCloud();
        }
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
