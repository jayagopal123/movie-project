/**
 * MovieFlix - Complete JavaScript Application
 * Combined all functionality into a single file
 */

// ========== MAIN APPLICATION CLASS ==========
class MovieFlixApp {
    constructor() {
        this.isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        this.tmdbApiKey = this.isLocal ? null : 'efa4bba6280252ded1c68c4884f56085';
        this.baseURL = this.isLocal ? 'http://localhost:5000/api/tmdb' : 'https://api.themoviedb.org/3';
        this.watchlist = JSON.parse(localStorage.getItem('movieflix-watchlist') || '[]');
        this.favorites = JSON.parse(localStorage.getItem('movieflix-favorites') || '[]');
        this.currentUser = JSON.parse(localStorage.getItem('movieflix-user') || 'null');
        
        // Cache for API responses to improve performance
        this.apiCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        this.init();
        // Render Continue Watching on initial load
        this.renderContinueWatchingSection();
    }

    // ========== WATCH HISTORY ==========
    getWatchHistory() {
        try {
            return JSON.parse(localStorage.getItem('movieflix-history') || '[]');
        } catch (_) {
            return [];
        }
    }

    setWatchHistory(history) {
        localStorage.setItem('movieflix-history', JSON.stringify(history.slice(0, 50)));
    }

    recordWatchHistory(item) {
        const history = this.getWatchHistory();
        const filtered = history.filter(h => h.id !== item.id);
        filtered.unshift({ id: item.id, title: item.title, poster: item.poster, ts: Date.now() });
        this.setWatchHistory(filtered);
    }

    showWatchHistory() {
        const history = this.getWatchHistory();
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.85);
            display: flex; justify-content: center; align-items: center; z-index: 10000;`;
        modal.innerHTML = `
            <div style="background:#111; color:#fff; width:90%; max-width:800px; border-radius:12px; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #333;">
                    <h3 style=\"margin:0; font-size:18px;\">Watch History</h3>
                    <button id=\"closeHistory\" style=\"background:none; border:none; color:#fff; font-size:22px; cursor:pointer;\">&times;</button>
                </div>
                <div style=\"max-height:60vh; overflow:auto; padding:16px; display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:12px;\">
                    ${history.length === 0 ? '<div style="grid-column:1/-1; color:#b3b3b3; text-align:center; padding:2rem;">No history yet.</div>' : ''}
                    ${history.map(h => `
                        <div class=\"movie-card\" data-movie-id=\"${h.id}\" style=\"cursor:pointer;\">
                            <img src=\"${h.poster || 'https://via.placeholder.com/250x375?text=No+Image'}\" alt=\"${h.title}\" style=\"width:100%; height:240px; object-fit:cover; border-radius:6px;\">
                            <div class=\"movie-info\"><h4 class=\"movie-title\" style=\"font-size:14px; margin-top:8px;\">${h.title}</h4></div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'closeHistory' || e.target === modal) modal.remove();
            const card = e.target.closest('.movie-card');
            if (card) {
                window.location.href = `movie_details.html?id=${card.dataset.movieId}`;
            }
        });
        document.body.appendChild(modal);
    }

    // ========== PROFILE: EDIT PROFILE ==========
    openEditProfileModal() {
        const user = JSON.parse(localStorage.getItem('movieflix-user') || 'null');
        if (!user) {
            this.showAuthModal();
            return;
        }

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.85);
            display: flex; justify-content: center; align-items: center; z-index: 10000;`;
        modal.innerHTML = `
            <div style=\"background:#111; color:#fff; width:92%; max-width:480px; border-radius:12px; overflow:hidden;\">
                <div style=\"display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #333;\">
                    <h3 style=\"margin:0; font-size:18px;\">Edit Profile</h3>
                    <button id=\"closeEditProfile\" style=\"background:none; border:none; color:#fff; font-size:22px; cursor:pointer;\">&times;</button>
                </div>
                <form id=\"editProfileForm\" style=\"padding:16px 20px; display:flex; flex-direction:column; gap:12px;\">
                    <label style=\"font-size:12px; color:#b3b3b3;\">Email</label>
                    <input type=\"email\" name=\"email\" value=\"${user.email}\" style=\"padding:12px; border:1px solid #333; border-radius:6px; background:#1a1a1a; color:#fff;\">
                    <label style=\"font-size:12px; color:#b3b3b3;\">New Password (optional)</label>
                    <input type=\"password\" name=\"password\" placeholder=\"••••••\" style=\"padding:12px; border:1px solid #333; border-radius:6px; background:#1a1a1a; color:#fff;\">
                    <button type=\"submit\" style=\"margin-top:8px; padding:12px; background:#e50914; color:#fff; border:none; border-radius:6px; cursor:pointer;\">Save Changes</button>
                </form>
            </div>`;
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'closeEditProfile' || e.target === modal) modal.remove();
        });
        modal.querySelector('#editProfileForm').addEventListener('submit', (e) => this.handleProfileUpdate(e, modal));
        document.body.appendChild(modal);
    }

    async handleProfileUpdate(e, modal) {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value.trim();
        const password = form.password.value.trim();
        const token = localStorage.getItem('movieflix-token'); 
        if (!token) {
            this.showAuthModal();
            return;
        } 

        try {
            const resp = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, password: password || undefined })
            });
            const data = await resp.json();
            if (!resp.ok) {
                this.showNotification(data.error || 'Failed to update profile', 'error');
                return;
            }
            localStorage.setItem('movieflix-token', data.token);
            localStorage.setItem('movieflix-user', JSON.stringify({ email: data.user.email, id: data.user.id, createdAt: data.user.created_at }));
            this.showNotification('Profile updated');
            if (modal) modal.remove();
            setTimeout(() => location.reload(), 500);
        } catch (err) {
            console.error('Update profile error:', err);
            this.showNotification('Profile update failed', 'error');
        }
    }
    init() {
        // Initialize all components
        this.setupNavigation();
        this.setupSearch();
        this.setupWatchlist();
        this.setupFavorites();
        this.setupCategoryFilters();
        this.setupScrollButtons();
        this.setupFooterLinks();
        this.setupAuth();
        
        // Load hero section immediately for faster perceived loading
        this.loadHeroSection();
        
        // Load rest of content
        this.loadHome();
        
        console.log('✅ MovieFlix initialized successfully');
    }

    // Load hero section immediately for faster perceived loading
    async loadHeroSection() {
        try {
            const popularMovies = await this.fetchFromTMDB('/movie/popular');
            if (popularMovies && popularMovies.length > 0) {
                this.updateHeroSection(popularMovies[0]);
            }
        } catch (error) {
            console.error('Error loading hero section:', error);
            // Set fallback content
            this.updateHeroSection(null);
        }
    }

    // ========== NAVIGATION SYSTEM ==========
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                const section = e.target.textContent.trim();
                const href = item.getAttribute('href') || '';

                // Allow default navigation for Sign In and logo links
                if (section === 'Sign In' || href.includes('signin.html') || section === 'MOVIEFLIX') {
                    return; // do not preventDefault so browser follows the link
                }

                e.preventDefault();
                
                this.showLoading();
                this.updateActiveNav(item);
                
                try {
                    switch(section) {
                        case 'Home':
                            await this.loadHome();
                            break;
                        case 'TV Shows':
                            await this.loadTVShows();
                            break;
                        case 'Movies':
                            await this.loadMovies();
                            break;
                        case 'New & Popular':
                            await this.loadTrending();
                            break;
                        case 'My List':
                            await this.loadWatchlist();
                            break;
                    }
                } catch (error) {
                    console.error('Navigation error:', error);
                    this.showError('Failed to load content');
                }
                
                this.hideLoading();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    // ========== FOOTER LINKS ==========
    setupFooterLinks() {
        const about = document.getElementById('footer-about');
        const careers = document.getElementById('footer-careers');
        const contact = document.getElementById('footer-contact');
        const faq = document.getElementById('footer-faq');
        const device = document.getElementById('footer-device');
        const legal = document.getElementById('footer-legal');
        const account = document.getElementById('footer-account');
        const signout = document.getElementById('footer-signout');
        const subscribe = document.getElementById('footer-subscribe');

        if (about) {
            about.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('About Us: MovieFlix is a demo app.');
            });
        }

        if (careers) {
            careers.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Careers: No openings right now.');
            });
        }

        // contact uses mailto directly; no handler required

        if (faq) {
            faq.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('FAQ: Coming soon.');
            });
        }

        if (device) {
            device.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Device Support: Coming soon.');
            });
        }

        if (legal) {
            legal.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Legal Notices: Coming soon.');
            });
        }

        if (account) {
            account.addEventListener('click', (e) => {
                e.preventDefault();
                const user = JSON.parse(localStorage.getItem('movieflix-user') || 'null');
                if (user) {
                    this.showNotification(`Signed in as ${user.email}`);
                } else {
                    this.showAuthModal();
                }
            });
        }

        if (signout) {
            signout.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('movieflix-token');
                localStorage.removeItem('movieflix-user');
                this.showNotification('Signed out');
                setTimeout(() => location.reload(), 800);
            });
        }

        if (subscribe) {
            subscribe.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'subscription.html';
            });
        }
    }

    updateActiveNav(activeItem) {
        document.querySelectorAll('.nav-item').forEach(item => 
            item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    // ========== CONTENT LOADING METHODS ==========
    async loadHome() {
        // Load trending movies and popular movies in parallel
        const [trendingMovies, popularMovies] = await Promise.all([
            this.fetchFromTMDB('/trending/movie/week'),
            this.fetchFromTMDB('/movie/popular')
        ]);
        
        // Update hero section if not already loaded
        if (popularMovies && popularMovies.length > 0) {
            this.updateHeroSection(popularMovies[0]);
        }
        
        this.renderMovieSection('Trending Now', trendingMovies);
        this.addSecondMovieSection('Popular on MovieFlix', popularMovies);
    }

    async loadTVShows() {
        const [popularTV, topRatedTV] = await Promise.all([
            this.fetchFromTMDB('/tv/popular'),
            this.fetchFromTMDB('/tv/top_rated')
        ]);
        
        this.updateHeroSection(popularTV[0]);
        this.renderMovieSection('Popular TV Shows', popularTV);
        this.addSecondMovieSection('Top Rated TV Shows', topRatedTV);
    }

    async loadMovies() {
        const [popularMovies, topRatedMovies] = await Promise.all([
            this.fetchFromTMDB('/movie/popular'),
            this.fetchFromTMDB('/movie/top_rated')
        ]);
        
        this.updateHeroSection(popularMovies[0]);
        this.renderMovieSection('Popular Movies', popularMovies);
        this.addSecondMovieSection('Top Rated Movies', topRatedMovies);
    }

    async loadTrending() {
        const [trendingAll, popularMovies, popularTV] = await Promise.all([
            this.fetchFromTMDB('/trending/all/week'),
            this.fetchFromTMDB('/movie/popular'),
            this.fetchFromTMDB('/tv/popular')
        ]);
        
        this.updateHeroSection(trendingAll[0]);
        this.renderMovieSection('Trending This Week', trendingAll);
        this.addSecondMovieSection('Popular Movies', popularMovies);
    }

    async loadWatchlist() {
        if (this.watchlist.length === 0) {
            this.updateHeroSection(null);
            this.showEmptyWatchlist();
            return;
        }

        // Load detailed info for watchlisted movies
        const watchlistMovies = [];
        for (let movieId of this.watchlist.slice(0, 10)) {
            try {
                const movie = await this.fetchFromTMDB(`/movie/${movieId}`);
                if (movie && !movie.success) { // success: false means error
                    watchlistMovies.push(movie);
                }
            } catch (error) {
                console.warn(`Failed to load movie ${movieId}`);
            }
        }
        
        if (watchlistMovies.length > 0) {
            this.updateHeroSection(watchlistMovies[0]);
            this.renderMovieSection('My Watchlist', watchlistMovies);
        } else {
            this.showEmptyWatchlist();
        }
    }

    // ========== TMDB API METHODS ==========
    async fetchFromTMDB(endpoint) {
        try {
            // Check cache first
            const cacheKey = endpoint;
            const cached = this.apiCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }

            const url = new URL(this.baseURL + endpoint);
            if (!this.isLocal) {
                url.searchParams.set('api_key', this.tmdbApiKey);
                if (!url.searchParams.has('language')) url.searchParams.set('language', 'en-US');
                if (!url.searchParams.has('page')) url.searchParams.set('page', '1');
            }

            // Use AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            let response = await fetch(url.toString(), { 
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'max-age=300' // 5 minutes cache
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                // Fallback: if local proxy failed, try calling TMDB directly
                if (this.isLocal) {
                    const direct = new URL('https://api.themoviedb.org/3' + endpoint);
                    direct.searchParams.set('api_key', 'efa4bba6280252ded1c68c4884f56085');
                    if (!direct.searchParams.has('language')) direct.searchParams.set('language', 'en-US');
                    if (!direct.searchParams.has('page')) direct.searchParams.set('page', '1');
                    
                    const directController = new AbortController();
                    const directTimeoutId = setTimeout(() => directController.abort(), 10000);
                    
                    response = await fetch(direct.toString(), { 
                        signal: directController.signal,
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'max-age=300'
                        }
                    });
                    
                    clearTimeout(directTimeoutId);
                    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
                } else {
                    throw new Error(`TMDB API error: ${response.status}`);
                }
            }
            
            const data = await response.json();
            const result = data.results || data;
            
            // Cache the result
            this.apiCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            console.error('TMDB fetch error:', error);
            return [];
        }
    }

    // ========== SEARCH FUNCTIONALITY ==========
    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) return;

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                this.hideSearchSuggestions();
                // Restore original homepage content when input is cleared or too short
                if (query.length === 0) {
                    this.loadHome();
                }
                return;
            }
            
            searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchSuggestions();
            }
        });
    }

    async performSearch(query) {
        try {
            // Prefer movies for both dropdown and row results
            const results = await this.fetchFromTMDB(`/search/movie?query=${encodeURIComponent(query)}`);

            // Update dropdown suggestions
            this.displaySearchSuggestions(results.slice(0, 8));

            // Update the main row with search matches
            this.renderSearchResults(query, results);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    displaySearchSuggestions(results) {
        let dropdown = document.querySelector('.search-suggestions');
        
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'search-suggestions';
            dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 8px;
                max-height: 300px;
                overflow-y: auto;
                z-index: 9999;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            `;
            
            const searchContainer = document.querySelector('.search-container');
            searchContainer.style.position = 'relative';
            searchContainer.appendChild(dropdown);
        }

        dropdown.innerHTML = '';
        
        results.forEach(item => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result-item';
            resultDiv.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px;
                cursor: pointer;
                border-bottom: 1px solid #333;
                transition: background 0.2s ease;
            `;
            
            const posterUrl = item.poster_path 
                ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                : 'https://via.placeholder.com/92x138?text=No+Image';
            
            resultDiv.innerHTML = `
                <img src="${posterUrl}" alt="${item.title || item.name}" 
                     style="width: 60px; height: 90px; object-fit: cover; border-radius: 4px; margin-right: 12px;">
                <div>
                    <h4 style="margin: 0 0 4px 0; color: white; font-size: 14px;">${item.title || item.name}</h4>
                    <p style="margin: 0; color: #b3b3b3; font-size: 12px;">
                        Movie ${item.release_date ? `(${item.release_date.split('-')[0]})` : ''}
                    </p>
                </div>
            `;
            
            resultDiv.addEventListener('mouseenter', () => {
                resultDiv.style.backgroundColor = 'rgba(229, 9, 20, 0.1)';
            });
            
            resultDiv.addEventListener('mouseleave', () => {
                resultDiv.style.backgroundColor = 'transparent';
            });
            
            resultDiv.addEventListener('click', () => {
                this.selectSearchResult(item);
            });
            
            dropdown.appendChild(resultDiv);
        });
        
        dropdown.style.display = 'block';
    }

    selectSearchResult(item) {
        // Handle search result selection
        console.log('Selected:', item);
        this.hideSearchSuggestions();
        
        // Clear search input
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.value = '';
        
        // You could navigate to a movie detail page or show more info
        this.showMovieDetails(item);
    }

    renderSearchResults(query, results) {
        const section = document.querySelector('.movie-section:not(.continue-watching)');
        if (!section) return;

        const sectionTitle = section.querySelector('.section-title');
        const movieRow = section.querySelector('.movie-row');

        if (sectionTitle) sectionTitle.textContent = `Search Results for "${query}"`;
        if (!movieRow) return;

        movieRow.innerHTML = '';

        if (!results || results.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:#b3b3b3;padding:2rem;width:100%';
            empty.textContent = 'No matches found.';
            movieRow.appendChild(empty);
            return;
        }

        results.slice(0, 15).forEach(movie => {
            const card = this.createMovieCard(movie);
            movieRow.appendChild(card);
        });
    }

    hideSearchSuggestions() {
        const dropdown = document.querySelector('.search-suggestions');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // ========== RENDERING METHODS ==========
    updateHeroSection(movie) {
        const heroSection = document.querySelector('.hero');
        if (!heroSection) return;

        const heroTitle = heroSection.querySelector('.hero-title');
        const heroDescription = heroSection.querySelector('.hero-description');
        
        if (movie) {
            if (heroTitle) {
                heroTitle.textContent = movie.title || movie.name || 'Featured Content';
            }
            
            if (heroDescription) {
                heroDescription.textContent = movie.overview || 'Discover amazing movies and TV shows.';
            }

            // Update background if backdrop available
            if (movie.backdrop_path) {
                heroSection.style.backgroundImage = `
                    linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),
                    url(https://image.tmdb.org/t/p/original${movie.backdrop_path})
                `;
                heroSection.style.backgroundSize = 'cover';
                heroSection.style.backgroundPosition = 'center';
                heroSection.style.backgroundRepeat = 'no-repeat';
            }
        } else {
            // Fallback content when no movie data is available
            if (heroTitle) {
                heroTitle.textContent = 'Welcome to MovieFlix';
            }
            
            if (heroDescription) {
                heroDescription.textContent = 'Discover amazing movies and TV shows.';
            }
            
            // Reset to default gradient background
            heroSection.style.backgroundImage = 'linear-gradient(135deg, var(--background), var(--background-light))';
        }
    }

    renderMovieSection(title, movies) {
        const section = document.querySelector('.movie-section:not(.continue-watching)');
        if (!section) return;

        const sectionTitle = section.querySelector('.section-title');
        const movieRow = section.querySelector('.movie-row');
        
        if (sectionTitle) sectionTitle.textContent = title;
        if (movieRow) movieRow.innerHTML = '';

        movies.slice(0, 15).forEach(movie => {
            const movieCard = this.createMovieCard(movie);
            if (movieRow) movieRow.appendChild(movieCard);
        });
    }

    // ========== CONTINUE WATCHING ==========
    getContinueWatching() {
        try {
            return JSON.parse(localStorage.getItem('movieflix-continue-watching') || '[]');
        } catch (_) {
            return [];
        }
    }

    renderContinueWatchingSection() {
        const data = this.getContinueWatching();
        const cwSection = document.querySelector('.movie-section.continue-watching');
        if (!cwSection) return;

        if (!data || data.length === 0) {
            cwSection.style.display = 'none';
            return;
        }

        const row = cwSection.querySelector('.movie-row');
        row.innerHTML = '';

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.dataset.movieId = item.id;
            const posterUrl = item.poster || 'https://via.placeholder.com/250x375?text=No+Image';
            card.innerHTML = `
                <img src="${posterUrl}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/250x375?text=No+Image';">
                <div class="movie-info">
                    <h3 class="movie-title">${item.title}</h3>
                </div>
                <div class="movie-actions">
                    <button class="watchlist-btn" data-movie-id="${item.id}" title="Add to Watchlist">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
            card.addEventListener('click', () => {
                window.location.href = `movie_details.html?id=${item.id}`;
            });
            row.appendChild(card);
        });

        cwSection.style.display = '';
    }

    addSecondMovieSection(title, movies) {
        // Check if second section (excluding Continue Watching) exists
        let secondSection = document.querySelectorAll('.movie-section:not(.continue-watching)')[1];
        
        if (!secondSection) {
            // Create second section by cloning the first non-continue section
            const firstSection = document.querySelector('.movie-section:not(.continue-watching)');
            if (!firstSection) return;
            secondSection = firstSection.cloneNode(true);
            firstSection.parentNode.insertBefore(secondSection, firstSection.nextSibling);
        }

        const sectionTitle = secondSection.querySelector('.section-title');
        const movieRow = secondSection.querySelector('.movie-row');
        
        if (sectionTitle) sectionTitle.textContent = title;
        if (movieRow) movieRow.innerHTML = '';

        movies.slice(0, 15).forEach(movie => {
            const movieCard = this.createMovieCard(movie);
            if (movieRow) movieRow.appendChild(movieCard);
        });
    }

    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.movieId = movie.id;
        
        const posterUrl = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'https://via.placeholder.com/250x375?text=No+Image';
        
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const isInWatchlist = this.watchlist.includes(movie.id);
        const isInFavorites = this.favorites.includes(movie.id);
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title || movie.name}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/250x375?text=No+Image';">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title || movie.name}</h3>
                <div class="movie-rating">
                    <i class="fas fa-star"></i>
                    <span>${rating}</span>
                </div>
            </div>
            <div class="movie-actions">
                <button class="favorite-btn" data-movie-id="${movie.id}" title="${isInFavorites ? 'Remove from Favorites' : 'Add to Favorites'}">
                    <i class="fas fa-heart ${isInFavorites ? 'favorited' : ''}"></i>
                </button>
                <button class="watchlist-btn" data-movie-id="${movie.id}" title="${isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                    <i class="fas ${isInWatchlist ? 'fa-xmark' : 'fa-plus'}"></i>
                </button>
            </div>
        `;
        
        // Add click events for buttons
        const favoriteBtn = card.querySelector('.favorite-btn');
        const watchlistBtn = card.querySelector('.watchlist-btn');
        
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorites(movie.id, movie);
        });
        
        watchlistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleWatchlist(movie.id, movie);
        });
        
        // Add click event for the entire card to navigate to movie details
        card.addEventListener('click', () => {
            this.recordWatchHistory({ id: movie.id, title: movie.title || movie.name, poster: posterUrl });
            window.location.href = `movie_details.html?id=${movie.id}`;
        });
        
        return card;
    }

    // ========== WATCHLIST FUNCTIONALITY ==========
    setupWatchlist() {
        // Event delegation for dynamically created watchlist buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.watchlist-btn')) {
                const btn = e.target.closest('.watchlist-btn');
                const movieId = parseInt(btn.dataset.movieId);
                this.toggleWatchlist(movieId);
            }
        });
    }

    toggleWatchlist(movieId, movieData = null) {
        const index = this.watchlist.indexOf(movieId);
        
        if (index > -1) {
            // Remove from watchlist
            this.watchlist.splice(index, 1);
            this.showNotification('Removed from My List');
        } else {
            // Add to watchlist
            this.watchlist.push(movieId);
            this.showNotification('Added to My List');
        }
        
        // Update localStorage
        localStorage.setItem('movieflix-watchlist', JSON.stringify(this.watchlist));
        
        // Update button appearance
        this.updateWatchlistButtons(movieId);
    }

    updateWatchlistButtons(movieId) {
        const buttons = document.querySelectorAll(`[data-movie-id="${movieId}"]`);
        const isInWatchlist = this.watchlist.includes(movieId);
        
        buttons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = `fas ${isInWatchlist ? 'fa-xmark' : 'fa-plus'}`;
            }
            btn.title = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
        });
    }

    showEmptyWatchlist() {
        const section = document.querySelector('.movie-section:not(.continue-watching)');
        const sectionTitle = section.querySelector('.section-title');
        const movieRow = section.querySelector('.movie-row');
        
        if (sectionTitle) sectionTitle.textContent = 'My List';
        if (movieRow) {
            movieRow.innerHTML = `
                <div class="empty-watchlist" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    text-align: center;
                    width: 100%;
                    color: #b3b3b3;
                ">
                    <i class="fas fa-heart" style="font-size: 4rem; margin-bottom: 1rem; color: #e50914;"></i>
                    <h3 style="color: white; margin-bottom: 1rem;">Your watchlist is empty</h3>
                    <p>Browse movies and TV shows to add them to your list!</p>
                </div>
            `;
        }
    }

    // ========== FAVORITES FUNCTIONALITY ==========
    setupFavorites() {
        // Event delegation for dynamically created favorite buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.favorite-btn')) {
                const btn = e.target.closest('.favorite-btn');
                const movieId = parseInt(btn.dataset.movieId);
                this.toggleFavorites(movieId);
            }
        });
    }

    toggleFavorites(movieId, movieData = null) {
        const index = this.favorites.indexOf(movieId);
        
        if (index > -1) {
            // Remove from favorites
            this.favorites.splice(index, 1);
            this.showNotification('Removed from Favorites');
        } else {
            // Add to favorites
            this.favorites.push(movieId);
            this.showNotification('Added to Favorites');
        }
        
        // Update localStorage
        localStorage.setItem('movieflix-favorites', JSON.stringify(this.favorites));
        
        // Update button appearance
        this.updateFavoriteButtons(movieId);
    }

    updateFavoriteButtons(movieId) {
        const buttons = document.querySelectorAll(`.favorite-btn[data-movie-id="${movieId}"]`);
        const isInFavorites = this.favorites.includes(movieId);
        
        buttons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = `fas fa-heart ${isInFavorites ? 'favorited' : ''}`;
            }
            btn.title = isInFavorites ? 'Remove from Favorites' : 'Add to Favorites';
        });
    }

    async loadFavorites() {
        this.showLoading();
        
        try {
            if (this.favorites.length === 0) {
                this.showEmptyFavorites();
                return;
            }
            
            // Fetch movie details for each favorite
            const favoriteMovies = [];
            for (const movieId of this.favorites) {
                try {
                    const movie = await this.fetchFromTMDB(`/movie/${movieId}`);
                    favoriteMovies.push(movie);
                } catch (error) {
                    console.error(`Failed to fetch movie ${movieId}:`, error);
                }
            }
            
            this.renderMovieSection('My Favorites', favoriteMovies);
        } catch (error) {
            console.error('Error loading favorites:', error);
            this.showError('Failed to load favorites');
        }
        
        this.hideLoading();
    }

    showEmptyFavorites() {
        const section = document.querySelector('.movie-section:not(.continue-watching)');
        const sectionTitle = section.querySelector('.section-title');
        const movieRow = section.querySelector('.movie-row');
        
        if (sectionTitle) sectionTitle.textContent = 'My Favorites';
        if (movieRow) {
            movieRow.innerHTML = `
                <div class="empty-favorites" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    text-align: center;
                    width: 100%;
                    color: #b3b3b3;
                ">
                    <i class="fas fa-heart" style="font-size: 4rem; margin-bottom: 1rem; color: #e50914;"></i>
                    <h3 style="color: white; margin-bottom: 1rem;">Your favorites list is empty</h3>
                    <p>Click the heart icon on any movie to add it to your favorites!</p>
                </div>
            `;
        }
    }

    // ========== CATEGORY FILTERS ==========
    setupCategoryFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Update active filter
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.textContent.trim().toLowerCase();
                await this.filterMoviesByCategory(category);
            });
        });
    }

    async filterMoviesByCategory(category) {
        this.showLoading();
        
        try {
            let movies = [];
            
            switch(category) {
                case 'all':
                    movies = await this.fetchFromTMDB('/movie/popular');
                    break;
                case 'action':
                    movies = await this.fetchFromTMDB('/discover/movie?with_genres=28');
                    break;
                case 'drama':
                    movies = await this.fetchFromTMDB('/discover/movie?with_genres=18');
                    break;
                case 'sci-fi':
                    movies = await this.fetchFromTMDB('/discover/movie?with_genres=878');
                    break;
                case 'comedy':
                    movies = await this.fetchFromTMDB('/discover/movie?with_genres=35');
                    break;
                case 'horror':
                    movies = await this.fetchFromTMDB('/discover/movie?with_genres=27');
                    break;
                default:
                    movies = await this.fetchFromTMDB('/movie/popular');
            }
            
            this.renderMovieSection(`${category.charAt(0).toUpperCase() + category.slice(1)} Movies`, movies);
        } catch (error) {
            console.error('Filter error:', error);
        }
        
        this.hideLoading();
    }

    // ========== SCROLL BUTTONS ==========
    setupScrollButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('scroll-btn')) {
                const movieRow = e.target.closest('.movie-section').querySelector('.movie-row');
                const scrollAmount = 300;
                
                if (e.target.classList.contains('left')) {
                    movieRow.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                } else if (e.target.classList.contains('right')) {
                    movieRow.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            }
        });
    }

    // ========== AUTHENTICATION ==========
    setupAuth() {
        // Replace sign-in link text with profile if logged in
        const signInLink = document.querySelector('.nav-links a.nav-item[href="signin.html"]');
        const user = JSON.parse(localStorage.getItem('movieflix-user') || 'null');
        if (signInLink && user) {
            // Move profile to far right like Chrome account chip
            const navLinks = document.querySelector('.nav-links');
            const profileAnchor = document.createElement('a');
            profileAnchor.href = '#';
            profileAnchor.className = 'nav-item nav-profile';
            profileAnchor.title = user.email;
            profileAnchor.innerHTML = '<i class="fas fa-user"></i>';
            navLinks.appendChild(profileAnchor);

            // Remove original sign-in link
            signInLink.remove();

            // Dropdown panel
            const dropdown = document.createElement('div');
            dropdown.className = 'profile-menu';
            
            // Calculate account age
            const accountCreated = user.createdAt ? new Date(user.createdAt) : new Date();
            const daysSince = Math.floor((new Date() - accountCreated) / (1000 * 60 * 60 * 24));
            const watchlistCount = this.watchlist.length;
            const favoritesCount = this.favorites.length;
            
            // Get subscription status (simplified for now)
            const subscriptionStatus = 'Free Plan';
            
            dropdown.innerHTML = `
                <div class="profile-header">
                    <div class="profile-avatar">${user.email.charAt(0).toUpperCase()}</div>
                    <div class="profile-details">
                        <div class="profile-info">Signed in</div>
                        <div class="profile-email">${user.email}</div>
                        <div class="profile-stats">
                            <span class="stat-item">
                                <i class="fas fa-calendar-alt"></i>
                                ${daysSince} days
                            </span>
                            <span class="stat-item">
                                <i class="fas fa-heart"></i>
                                ${favoritesCount} favorites
                            </span>
                            <span class="stat-item">
                                <i class="fas fa-crown"></i>
                                ${subscriptionStatus}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="profile-sections">
                    <div class="profile-section">
                        <h4>Quick Actions</h4>
                        <div class="profile-actions">
                            <button id="goto-list" class="action-btn">
                                <i class="fas fa-list"></i>
                                My Watchlist (${watchlistCount})
                            </button>
                            <button id="goto-favorites" class="action-btn">
                                <i class="fas fa-heart"></i>
                                Favorites (${favoritesCount})
                            </button>
                            <button id="goto-history" class="action-btn">
                                <i class="fas fa-history"></i>
                                Watch History
                            </button>
                        </div>
                    </div>
                    <div class="profile-section">
                        <h4>Account</h4>
                        <div class="profile-actions">
                            <button id="edit-profile" class="action-btn">
                                <i class="fas fa-user-edit"></i>
                                Edit Profile
                            </button>
                            <button id="account-settings" class="action-btn">
                                <i class="fas fa-cog"></i>
                                Settings
                            </button>
                            <button id="help-support" class="action-btn">
                                <i class="fas fa-question-circle"></i>
                                Help & Support
                            </button>
                        </div>
                    </div>
                    <div class="profile-section">
                        <div class="profile-actions">
                            <button id="signout" class="action-btn signout-btn">
                                <i class="fas fa-sign-out-alt"></i>
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(dropdown);

            // Improved click handling for profile dropdown
            let isDropdownOpen = false;
            
            profileAnchor.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const rect = profileAnchor.getBoundingClientRect();
                const dropdownWidth = 280; // Width of the dropdown
                const windowWidth = window.innerWidth;
                
                // Position dropdown to the right of the profile icon
                dropdown.style.position = 'fixed';
                dropdown.style.top = `${rect.bottom + 8}px`;
                dropdown.style.transform = 'none';
                
                // Check if dropdown would go off-screen to the right
                if (rect.left + dropdownWidth > windowWidth) {
                    // Position to the left of the profile icon
                    dropdown.style.left = `${rect.right - dropdownWidth}px`;
                } else {
                    // Position to the right of the profile icon
                    dropdown.style.left = `${rect.left}px`;
                }
                
                dropdown.style.right = 'auto';
                
                // Toggle dropdown
                isDropdownOpen = !isDropdownOpen;
                if (isDropdownOpen) {
                    dropdown.classList.add('show');
                } else {
                    dropdown.classList.remove('show');
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (isDropdownOpen && !dropdown.contains(e.target) && e.target !== profileAnchor) {
                    dropdown.classList.remove('show');
                    isDropdownOpen = false;
                }
            });
            
            // Close dropdown on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && isDropdownOpen) {
                    dropdown.classList.remove('show');
                    isDropdownOpen = false;
                }
            });
            // Event listeners for profile actions
            dropdown.querySelector('#signout').addEventListener('click', () => {
                localStorage.removeItem('movieflix-token');
                localStorage.removeItem('movieflix-user');
                location.reload();
            });
            
            dropdown.querySelector('#goto-list').addEventListener('click', () => {
                dropdown.classList.remove('show');
                this.loadWatchlist();
            });
            
            dropdown.querySelector('#goto-favorites').addEventListener('click', () => {
                dropdown.classList.remove('show');
                this.loadFavorites();
            });
            
            dropdown.querySelector('#goto-history').addEventListener('click', () => {
                dropdown.classList.remove('show');
                this.showWatchHistory();
            });
            
            dropdown.querySelector('#edit-profile').addEventListener('click', () => {
                dropdown.classList.remove('show');
                this.openEditProfileModal();
            });
            
            dropdown.querySelector('#account-settings').addEventListener('click', () => {
                dropdown.classList.remove('show');
                window.location.href = 'settings.html';
            });
            
            dropdown.querySelector('#help-support').addEventListener('click', () => {
                dropdown.classList.remove('show');
                this.showNotification('Help & Support: Feature coming soon.');
            });
        }
    }

    showAuthModal() {
        let modal = document.querySelector('.auth-modal');
        if (!modal) {
            modal = this.createAuthModal();
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    createAuthModal() {
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-container">
                <button class="close-auth" style="position: absolute; top: 10px; right: 15px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                <h2 style="text-align: center; margin-bottom: 2rem;">Sign In to MovieFlix</h2>
                <form class="auth-form" id="authForm">
                    <input type="email" placeholder="Email" required style="width: 100%; padding: 1rem; margin: 0.5rem 0; background: #333; border: 1px solid #555; border-radius: 4px; color: white;">
                    <input type="password" placeholder="Password" required style="width: 100%; padding: 1rem; margin: 0.5rem 0; background: #333; border: 1px solid #555; border-radius: 4px; color: white;">
                    <button type="submit" style="width: 100%; padding: 1rem; background: #e50914; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; margin-top: 1rem;">Sign In</button>
                </form>
                <div class="otp-container" id="otpContainer" style="display: none;">
                    <h3 style="text-align: center; margin-bottom: 1rem;">Enter OTP</h3>
                    <p style="text-align: center; color: #b3b3b3; margin-bottom: 1rem;">We've sent a 6-digit code to your email</p>
                    <div class="otp-inputs" style="display: flex; gap: 0.5rem; justify-content: center; margin: 1rem 0;">
                        <input type="text" class="otp-input" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 1.2rem; border: 1px solid #333; border-radius: 6px; background: #2a2a2a; color: white;">
                        <input type="text" class="otp-input" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 1.2rem; border: 1px solid #333; border-radius: 6px; background: #2a2a2a; color: white;">
                        <input type="text" class="otp-input" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 1.2rem; border: 1px solid #333; border-radius: 6px; background: #2a2a2a; color: white;">
                        <input type="text" class="otp-input" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 1.2rem; border: 1px solid #333; border-radius: 6px; background: #2a2a2a; color: white;">
                        <input type="text" class="otp-input" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 1.2rem; border: 1px solid #333; border-radius: 6px; background: #2a2a2a; color: white;">
                        <input type="text" class="otp-input" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 1.2rem; border: 1px solid #333; border-radius: 6px; background: #2a2a2a; color: white;">
                    </div>
                    <button type="button" onclick="movieFlixApp.verifyOTP()" style="width: 100%; padding: 1rem; background: #e50914; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; margin-top: 1rem;">Verify OTP</button>
                    <button type="button" onclick="movieFlixApp.resendOTP()" style="background: none; border: none; color: #e50914; cursor: pointer; font-size: 0.9rem; text-decoration: underline; margin-top: 1rem;">Resend OTP</button>
                </div>
                <p style="text-align: center; margin-top: 1rem; color: #b3b3b3;">New to MovieFlix? <a href="#" style="color: #e50914;">Sign up now</a></p>
            </div>
        `;
        
        // Add event listeners
        modal.querySelector('.close-auth').addEventListener('click', () => this.hideAuthModal());
        modal.querySelector('.auth-form').addEventListener('submit', (e) => this.handleAuthWithOTP(e));
        
        // Setup OTP input handling
        this.setupOTPInputs(modal);
        
        return modal;
    }

    hideAuthModal() {
        const modal = document.querySelector('.auth-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }

    async handleAuthWithOTP(e) {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        try {
            // Send OTP first
            const otpResponse = await fetch('http://localhost:5000/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, type: 'email' })
            });

            const otpData = await otpResponse.json();
            
            if (!otpResponse.ok) {
                throw new Error(otpData.error || 'Failed to send OTP');
            }

            // Store email and password for later use
            this.pendingAuth = { email, password };
            
            // Show OTP input
            const modal = document.querySelector('.auth-modal');
            modal.querySelector('.auth-form').style.display = 'none';
            modal.querySelector('.otp-container').style.display = 'block';
            
            // Auto-focus first OTP input
            modal.querySelector('.otp-input').focus();
            
            this.showNotification('OTP sent to your email', 'success');
            
        } catch (error) {
            console.error('Send OTP error:', error);
            this.showNotification(error.message || 'Failed to send OTP', 'error');
        }
    }

    setupOTPInputs(modal) {
        const otpInputs = modal.querySelectorAll('.otp-input');
        
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', function(e) {
                const value = e.target.value;
                
                if (value.length === 1) {
                    if (index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                }
            });
            
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }

    async verifyOTP() {
        const modal = document.querySelector('.auth-modal');
        const otpInputs = modal.querySelectorAll('.otp-input');
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        
        if (otp.length !== 6) {
            this.showNotification('Please enter a valid 6-digit OTP', 'error');
            return;
        }
        
        try {
            // Verify OTP
            const verifyResponse = await fetch('http://localhost:5000/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: this.pendingAuth.email, 
                    otp, 
                    type: 'email' 
                })
            });

            const verifyData = await verifyResponse.json();
            
            if (!verifyResponse.ok) {
                throw new Error(verifyData.error || 'Invalid OTP');
            }

            // Try to sign in or sign up
            const authResponse = await fetch('http://localhost:5000/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: this.pendingAuth.email, 
                    password: this.pendingAuth.password 
                })
            });

            if (authResponse.ok) {
                const authData = await authResponse.json();
                this.currentUser = { 
                    email: authData.user.email, 
                    id: authData.user.id,
                    createdAt: authData.user.created_at || new Date().toISOString()
                };
                localStorage.setItem('movieflix-token', authData.token);
                localStorage.setItem('movieflix-user', JSON.stringify(this.currentUser));
                
                this.showNotification('Authentication successful!', 'success');
                this.hideAuthModal();
                location.reload();
            } else {
                // Try signup
                const signupResponse = await fetch('http://localhost:5000/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: this.pendingAuth.email, 
                        password: this.pendingAuth.password
                    })
                });

                if (signupResponse.ok) {
                    const signupData = await signupResponse.json();
                    this.currentUser = { 
                        email: signupData.user.email, 
                        id: signupData.user.id,
                        createdAt: signupData.user.created_at || new Date().toISOString()
                    };
                    localStorage.setItem('movieflix-token', signupData.token);
                    localStorage.setItem('movieflix-user', JSON.stringify(this.currentUser));
                    
                    this.showNotification('Account created and authenticated!', 'success');
                    this.hideAuthModal();
                    location.reload();
                } else {
                    const signupError = await signupResponse.json();
                    throw new Error(signupError.error || 'Authentication failed');
                }
            }
            
        } catch (error) {
            console.error('OTP verification error:', error);
            this.showNotification(error.message || 'OTP verification failed', 'error');
        }
    }

    async resendOTP() {
        try {
            const response = await fetch('http://localhost:5000/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: this.pendingAuth.email, 
                    type: 'email' 
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend OTP');
            }

            // Clear OTP inputs
            const modal = document.querySelector('.auth-modal');
            modal.querySelectorAll('.otp-input').forEach(input => input.value = '');
            modal.querySelector('.otp-input').focus();
            
            this.showNotification('OTP resent successfully', 'success');
            
        } catch (error) {
            console.error('Resend OTP error:', error);
            this.showNotification(error.message || 'Failed to resend OTP', 'error');
        }
    }

    async handleAuth(e) {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        try {
            // Try to sign in first
            const response = await fetch('http://localhost:5000/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = { 
                    email: data.user.email, 
                    id: data.user.id,
                    createdAt: data.user.created_at || new Date().toISOString()
                };
                localStorage.setItem('movieflix-token', data.token);
                localStorage.setItem('movieflix-user', JSON.stringify(this.currentUser));
                this.showNotification('Welcome back to MovieFlix!');
                this.hideAuthModal();
                location.reload(); // Refresh to update UI
            } else {
                // If sign in fails, try to sign up
                const signupResponse = await fetch('http://localhost:5000/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                if (signupResponse.ok) {
                    const data = await signupResponse.json();
                    this.currentUser = { 
                        email: data.user.email, 
                        id: data.user.id,
                        createdAt: data.user.created_at || new Date().toISOString()
                    };
                    localStorage.setItem('movieflix-token', data.token);
                    localStorage.setItem('movieflix-user', JSON.stringify(this.currentUser));
                    this.showNotification('Welcome to MovieFlix! Account created successfully.');
                    this.hideAuthModal();
                    location.reload(); // Refresh to update UI
                } else {
                    const errorData = await signupResponse.json();
                    this.showNotification(errorData.error || 'Authentication failed', 'error');
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showNotification('Authentication failed. Please try again.', 'error');
        }
    }

    // ========== UTILITY METHODS ==========
    showLoading() {
        const loading = document.querySelector('.loading-container') || this.createLoadingElement();
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.querySelector('.loading-container');
        if (loading) loading.style.display = 'none';
    }

    createLoadingElement() {
        const loading = document.createElement('div');
        loading.className = 'loading-container';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        loading.innerHTML = `
            <div class="loading-spinner" style="cd
                width: 50px;
                height: 50px;
                border: 4px solid rgba(229, 9, 20, 0.3);
                border-top: 4px solid #e50914;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
        `;
        document.body.appendChild(loading);
        return loading;
    }

    showError(message) {
        console.error('MovieFlix Error:', message);
        this.showNotification(`Error: ${message}`, 'error');
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'error' ? '#dc3545' : '#e50914'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            font-size: 14px;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showMovieDetails(movie) {
        // Simple movie details display
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a1a; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; position: relative;">
                <button style="position: absolute; top: 10px; right: 15px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                <h2 style="color: white; margin-bottom: 1rem;">${movie.title || movie.name}</h2>
                <p style="color: #b3b3b3; margin-bottom: 1rem;">Rating: ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10</p>
                <p style="color: #b3b3b3; line-height: 1.6;">${movie.overview || 'No description available.'}</p>
                <button onclick="movieFlixApp.toggleWatchlist(${movie.id})" style="background: #e50914; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                    ${this.watchlist.includes(movie.id) ? 'Remove from List' : 'Add to My List'}
                </button>
            </div>
        `;
        
        modal.querySelector('button').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
    }
}

// ========== INITIALIZE APPLICATION ==========
let movieFlixApp;

document.addEventListener('DOMContentLoaded', () => {
    movieFlixApp = new MovieFlixApp();
    
    // Make it globally available for onclick handlers
    window.movieFlixApp = movieFlixApp;
    
    // Backward compatibility functions
    window.addToWatchlist = (movieId) => movieFlixApp.toggleWatchlist(movieId);
    window.toggleAuth = () => movieFlixApp.showAuthModal();
});

// ========== NAVBAR SCROLL EFFECT ==========
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

console.log('🎬 MovieFlix JavaScript loaded successfully!');
