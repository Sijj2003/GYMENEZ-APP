const isLocalHostEnvironment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_BASE_URL = isLocalHostEnvironment ? 'http://127.0.0.1:5000' : 'https://sijj2003.pythonanywhere.com';

let catalogFilms = [];
let userTier = 'BASICO';
let ytPlayer = null; 
let progressInterval = null; 

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

    try {
        const res = await fetch(`${API_BASE_URL}/api/client/on/films`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            catalogFilms = data.films;
            userTier = data.user_tier;

            if (catalogFilms.length > 0) {
                // Selecciona película aleatoria para Portada (Hero)
                const randomIndex = Math.floor(Math.random() * catalogFilms.length);
                const heroFilm = catalogFilms[randomIndex];
                renderHero(heroFilm);
                renderRows(); // Pinta los carruseles
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
    
    // Si tiene acceso, lo dejamos ver
    if (film.has_access && film.chapters.length > 0) {
        const firstChapter = film.chapters[0];
        playBtn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Reproducir`;
        playBtn.className = "flex items-center gap-3 bg-white text-black px-8 py-3.5 rounded-lg font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 transition transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]";
        playBtn.onclick = () => openCustomPlayer(film, firstChapter);
    } else {
        // 🔒 Si NO tiene acceso, lanza la ventana modal persuasiva
        playBtn.innerHTML = `🔒 MEJORAR PLAN ${film.subscription_tier}`;
        playBtn.className = "flex items-center justify-center gap-3 bg-[#FFC300] text-black px-8 py-3.5 rounded-lg font-black uppercase tracking-widest text-[11px] shadow-[0_0_20px_rgba(255,195,0,0.4)] transition transform hover:scale-105";
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
            
            // Si el backend dictó que no tiene acceso, se le dibuja un candado grande oscuro encima
            const lockOverlay = !film.has_access ? `
                <div class="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none group-hover:bg-black/40 transition-colors">
                    <span class="text-4xl mb-2 drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300">🔒</span>
                    <span class="text-[8px] font-black uppercase text-[#FFC300] tracking-widest bg-black/80 px-2.5 py-1 rounded shadow-lg border border-[#FFC300]/30">${film.subscription_tier}</span>
                </div>
            ` : '';

            const safeFilmObj = JSON.stringify(film).replace(/'/g, "&#39;");

            cardsHtml += `
                <div class="carousel-card relative min-w-[240px] md:min-w-[280px] aspect-video rounded-md bg-gray-900 cursor-pointer snap-center group overflow-hidden border border-white/5" onclick='handleCardClick(${safeFilmObj})'>
                    ${lockOverlay}
                    <img src="${film.cover_url}" class="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-30">
                        <h4 class="text-white font-black text-sm uppercase leading-tight mb-1 truncate">${film.title}</h4>
                        <div class="flex items-center gap-2 text-[9px] font-bold text-gray-300">
                            <span class="text-red-500">${film.year}</span>
                            <span class="border border-gray-400 px-1 rounded">${film.age_rating}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        section.innerHTML = `
            <h2 class="px-6 md:px-12 text-lg md:text-xl font-black text-white mb-4 tracking-tighter">${cat}s</h2>
            <div class="px-6 md:px-12 flex gap-4 overflow-x-auto hide-scrollbar pb-8 snap-x snap-mandatory">
                ${cardsHtml}
            </div>
        `;
        mainContainer.appendChild(section);
    });
}

function handleCardClick(film) {
    // 🔒 SEGURIDAD: Si no tiene acceso, abre el Modal de Ventas
    if (!film.has_access) {
        showPaywallModal(film.subscription_tier); 
        return;
    }
    
    // Si tiene acceso, abre el reproductor
    if (film.chapters && film.chapters.length > 0) {
        openCustomPlayer(film, film.chapters[0]);
    }
}

// ==========================================
// 3. CONTROLADORES DEL MODAL PAYWALL
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
// 4. MAGIA: CUSTOM YOUTUBE PLAYER API
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
    }, 500);
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
}

function onPlayerStateChange(event) {
    const btnIcon = document.getElementById('play-pause-icon');
    if (event.data === YT.PlayerState.PLAYING) {
        btnIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    } else {
        btnIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    }
}

function seekRelative(seconds) {
    if (!ytPlayer) return;
    ytPlayer.seekTo(ytPlayer.getCurrentTime() + seconds, true);
}

function changeVolume(value) {
    if (!ytPlayer) return;
    ytPlayer.setVolume(value);
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
});

function toggleFullScreen() {
    const elem = document.getElementById('native-player-overlay');
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(e => console.log(e));
    } else {
        document.exitFullscreen();
    }
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

document.getElementById('click-to-pause-layer').addEventListener('click', togglePlay);
