// Movie Details Page JavaScript
class MovieDetailsApp {
    constructor() {
        this.movieId = this.getMovieIdFromURL();
        this.isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        this.tmdbApiKey = 'efa4bba6280252ded1c68c4884f56085'; // Always use the API key
        this.baseURL = this.isLocal ? 'http://localhost:5000/api/tmdb' : 'https://api.themoviedb.org/3';
        this.watchlist = JSON.parse(localStorage.getItem('movieflix-watchlist') || '[]');
        this.favorites = JSON.parse(localStorage.getItem('movieflix-favorites') || '[]');
        this.currentUser = JSON.parse(localStorage.getItem('movieflix-user') || 'null');
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupTabs();
        this.setupEventListeners();
        this.loadMovieDetails();
        this.setupAuth();
    }

    getMovieIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async fetchFromTMDB(endpoint) {
        try {
            let url;
            if (this.isLocal) {
                url = `${this.baseURL}${endpoint}`;
            } else {
                url = `${this.baseURL}${endpoint}?api_key=${this.tmdbApiKey}`;
            }
            
            console.log('Fetching from:', url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('API Response:', data);
            return data;
        } catch (error) {
            console.error('API Error:', error);
            // Fallback to direct TMDB API
            try {
                const fallbackUrl = `https://api.themoviedb.org/3${endpoint}?api_key=${this.tmdbApiKey}`;
                console.log('Trying fallback URL:', fallbackUrl);
                const fallbackResponse = await fetch(fallbackUrl);
                if (!fallbackResponse.ok) {
                    throw new Error(`Fallback HTTP error! status: ${fallbackResponse.status}`);
                }
                const fallbackData = await fallbackResponse.json();
                console.log('Fallback API Response:', fallbackData);
                return fallbackData;
            } catch (fallbackError) {
                console.error('Fallback API Error:', fallbackError);
                throw fallbackError;
            }
        }
    }

    async loadMovieDetails() {
        if (!this.movieId) {
            this.showError('No movie ID provided');
            return;
        }

        this.showLoading();

        try {
            const [movieData, credits, videos, images, reviews, recommendations] = await Promise.all([
                this.fetchFromTMDB(`/movie/${this.movieId}`),
                this.fetchFromTMDB(`/movie/${this.movieId}/credits`),
                this.fetchFromTMDB(`/movie/${this.movieId}/videos`),
                this.fetchFromTMDB(`/movie/${this.movieId}/images`),
                this.fetchFromTMDB(`/movie/${this.movieId}/reviews`),
                this.fetchFromTMDB(`/movie/${this.movieId}/recommendations`)
            ]);

            this.currentMovieData = movieData;
            this.populateMovieData(movieData);
            this.populateCredits(credits);
            this.populateVideos(videos);
            this.populateImages(images);
            this.populateReviews(reviews);
            this.populateRecommendations(recommendations);
            this.setupBackdrop(movieData);
            this.updateActionButtons(movieData.id);

        } catch (error) {
            console.error('Error loading movie details:', error);
            this.showError('Failed to load movie details');
        }

        this.hideLoading();
    }

    populateMovieData(movie) {
        // Hero section
        document.getElementById('movieTitle').textContent = movie.title;
        document.getElementById('moviePoster').src = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'https://via.placeholder.com/300x450?text=No+Image';
        
        // Meta information
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '';
        const rating = movie.adult ? 'R' : 'PG';
        const genres = movie.genres ? movie.genres.map(g => g.name).join(', ') : '';

        document.getElementById('movieYear').textContent = year;
        document.getElementById('movieRuntime').textContent = runtime;
        document.getElementById('movieRating').textContent = rating;
        document.getElementById('movieGenres').textContent = genres;

        // Overview
        document.getElementById('movieOverview').textContent = movie.overview || 'No overview available.';

        // Stats
        document.getElementById('voteAverage').textContent = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        document.getElementById('voteCount').textContent = movie.vote_count ? movie.vote_count.toLocaleString() : '0';
        document.getElementById('releaseDate').textContent = movie.release_date ? new Date(movie.release_date).toLocaleDateString() : 'N/A';

        // Overview tab content
        document.getElementById('synopsis').textContent = movie.overview || 'No synopsis available.';
        document.getElementById('originalTitle').textContent = movie.original_title || movie.title;
        document.getElementById('status').textContent = movie.status || 'N/A';
        document.getElementById('originalLanguage').textContent = movie.original_language ? movie.original_language.toUpperCase() : 'N/A';
        document.getElementById('budget').textContent = movie.budget ? `$${(movie.budget / 1000000).toFixed(1)}M` : 'N/A';
        document.getElementById('revenue').textContent = movie.revenue ? `$${(movie.revenue / 1000000).toFixed(1)}M` : 'N/A';
        document.getElementById('productionCompanies').textContent = movie.production_companies ? 
            movie.production_companies.map(c => c.name).join(', ') : 'N/A';

        // Keywords
        this.populateKeywords(movie);
    }

    async populateKeywords(movie) {
        try {
            const keywords = await this.fetchFromTMDB(`/movie/${movie.id}/keywords`);
            const keywordsContainer = document.getElementById('keywords');
            
            if (keywords.keywords && keywords.keywords.length > 0) {
                keywordsContainer.innerHTML = keywords.keywords
                    .slice(0, 10)
                    .map(keyword => `<span class="keyword">${keyword.name}</span>`)
                    .join('');
            } else {
                keywordsContainer.innerHTML = '<span class="keyword">No keywords available</span>';
            }
        } catch (error) {
            console.error('Error loading keywords:', error);
        }
    }

    populateCredits(credits) {
        // Cast preview in sidebar
        const castPreview = document.getElementById('castPreview');
        const topCast = credits.cast ? credits.cast.slice(0, 5) : [];
        
        castPreview.innerHTML = topCast.map(person => `
            <div class="cast-item">
                <img src="${person.profile_path ? `https://image.tmdb.org/t/p/w92${person.profile_path}` : 'https://via.placeholder.com/50x50?text=?'}" 
                     alt="${person.name}" class="cast-avatar">
                <div class="cast-info">
                    <h4>${person.name}</h4>
                    <p>${person.character}</p>
                </div>
            </div>
        `).join('');

        // Full cast grid
        const castGrid = document.getElementById('castGrid');
        const fullCast = credits.cast ? credits.cast.slice(0, 20) : [];
        
        castGrid.innerHTML = fullCast.map(person => `
            <div class="cast-card">
                <img src="${person.profile_path ? `https://image.tmdb.org/t/p/w300${person.profile_path}` : 'https://via.placeholder.com/300x450?text=?'}" 
                     alt="${person.name}" class="cast-image">
                <div class="cast-details">
                    <h4>${person.name}</h4>
                    <p>${person.character}</p>
                </div>
            </div>
        `).join('');

        // Crew grid
        const crewGrid = document.getElementById('crewGrid');
        const crew = credits.crew ? credits.crew.filter(person => 
            ['Director', 'Producer', 'Writer', 'Screenplay'].includes(person.job)
        ).slice(0, 12) : [];
        
        crewGrid.innerHTML = crew.map(person => `
            <div class="crew-card">
                <img src="${person.profile_path ? `https://image.tmdb.org/t/p/w300${person.profile_path}` : 'https://via.placeholder.com/300x450?text=?'}" 
                     alt="${person.name}" class="crew-image">
                <div class="crew-details">
                    <h4>${person.name}</h4>
                    <p>${person.job}</p>
                </div>
            </div>
        `).join('');
    }

    populateVideos(videos) {
        const videoGrid = document.getElementById('videoGrid');
        const allVideos = videos.results ? videos.results.filter(video => 
            video.site === 'YouTube'
        ).slice(0, 12) : [];
        
        if (allVideos.length > 0) {
            videoGrid.innerHTML = allVideos.map(video => {
                const isTrailer = video.type === 'Trailer';
                const isOfficial = video.name.toLowerCase().includes('official');
                
                return `
                    <div class="video-item" onclick="movieDetailsApp.playVideo('${video.key}', '${video.name}')">
                        <img src="https://img.youtube.com/vi/${video.key}/maxresdefault.jpg" 
                             alt="${video.name}" class="video-thumbnail"
                             onerror="this.src='https://img.youtube.com/vi/${video.key}/hqdefault.jpg'">
                        <div class="video-overlay">
                            <i class="fas fa-play play-icon"></i>
                        </div>
                        <div class="video-info">
                            <div class="video-title">${video.name}</div>
                            <div class="video-type">
                                ${isOfficial ? '<span class="badge official">Official</span>' : ''}
                                ${isTrailer ? '<span class="badge trailer">Trailer</span>' : ''}
                                ${!isTrailer ? '<span class="badge other">${video.type}</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            videoGrid.innerHTML = '<p>No videos available for this movie</p>';
        }
    }

    populateImages(images) {
        const photoGrid = document.getElementById('photoGrid');
        const photos = images.backdrops ? images.backdrops.slice(0, 12) : [];
        
        if (photos.length > 0) {
            photoGrid.innerHTML = photos.map(photo => `
                <div class="photo-item" onclick="movieDetailsApp.showImage('https://image.tmdb.org/t/p/original${photo.file_path}')">
                    <img src="https://image.tmdb.org/t/p/w500${photo.file_path}" 
                         alt="Movie still" class="photo-image">
                </div>
            `).join('');
        } else {
            photoGrid.innerHTML = '<p>No photos available</p>';
        }
    }

    populateReviews(reviews) {
        const reviewsList = document.getElementById('reviewsList');
        const reviewCount = document.getElementById('reviewCount');
        const movieReviews = reviews.results ? reviews.results.slice(0, 10) : [];
        
        reviewCount.textContent = `${reviews.total_results || 0} reviews`;
        
        if (movieReviews.length > 0) {
            reviewsList.innerHTML = movieReviews.map(review => `
                <div class="review-item">
                    <div class="review-header">
                        <div>
                            <div class="review-author">${review.author}</div>
                            <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
                        </div>
                        <div class="review-rating">
                            <i class="fas fa-star"></i>
                            <span>${review.author_details.rating || 'N/A'}/10</span>
                        </div>
                    </div>
                    <div class="review-content">${review.content}</div>
                </div>
            `).join('');
        } else {
            reviewsList.innerHTML = '<p>No reviews available</p>';
        }
    }

    populateRecommendations(recommendations) {
        const recommendationsGrid = document.getElementById('recommendationsGrid');
        const recs = recommendations.results ? recommendations.results.slice(0, 12) : [];
        
        if (recs.length > 0) {
            recommendationsGrid.innerHTML = recs.map(movie => `
                <div class="recommendation-card" onclick="movieDetailsApp.navigateToMovie(${movie.id})">
                    <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}" 
                         alt="${movie.title}" class="recommendation-image">
                    <div class="recommendation-overlay">
                        <div class="recommendation-title">${movie.title}</div>
                        <div class="recommendation-rating">
                            <i class="fas fa-star"></i>
                            ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            recommendationsGrid.innerHTML = '<p>No recommendations available</p>';
        }
    }

    setupBackdrop(movie) {
        const backdrop = document.querySelector('.hero-backdrop');
        if (movie.backdrop_path) {
            backdrop.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`;
        }
    }

    updateActionButtons(movieId) {
        const favoriteBtn = document.getElementById('favoriteBtn');
        const watchlistBtn = document.getElementById('watchlistBtn');
        
        const isInFavorites = this.favorites.includes(movieId);
        const isInWatchlist = this.watchlist.includes(movieId);
        
        // Update favorite button
        const favoriteIcon = favoriteBtn.querySelector('i');
        favoriteIcon.className = `fas fa-heart ${isInFavorites ? 'favorited' : ''}`;
        favoriteBtn.title = isInFavorites ? 'Remove from Favorites' : 'Add to Favorites';
        if (isInFavorites) favoriteBtn.classList.add('active');
        else favoriteBtn.classList.remove('active');
        
        // Update watchlist button
        const watchlistIcon = watchlistBtn.querySelector('i');
        watchlistIcon.className = `fas ${isInWatchlist ? 'fa-xmark' : 'fa-plus'}`;
        watchlistBtn.title = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
        if (isInWatchlist) watchlistBtn.classList.add('active');
        else watchlistBtn.classList.remove('active');
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab panel
                tabPanels.forEach(panel => panel.classList.remove('active'));
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Action buttons
        document.getElementById('playBtn').addEventListener('click', () => {
            // Try to play a full movie URL if configured, otherwise play trailer
            this.playFullMovie();
        });

        document.getElementById('trailerBtn').addEventListener('click', () => {
            this.loadTrailer();
        });

        document.getElementById('favoriteBtn').addEventListener('click', () => {
            this.toggleFavorite();
        });

        document.getElementById('watchlistBtn').addEventListener('click', () => {
            this.toggleWatchlist();
        });

        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareMovie();
        });

        // Poster play button
        document.querySelector('.play-btn').addEventListener('click', () => {
            this.playFullMovie();
        });

        // Add test button for debugging (temporary)
        this.addTestButton();

        // Navigation scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    addTestButton() {
        // Add a temporary test button to debug API issues
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test API';
        testBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #e50914;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 10000;
        `;
        testBtn.addEventListener('click', () => {
            this.testAPI();
        });
        document.body.appendChild(testBtn);
    }

    async testAPI() {
        try {
            this.showNotification('Testing API...', 'info');
            console.log('Testing API with movie ID:', this.movieId);
            
            // Test basic movie data
            const movieData = await this.fetchFromTMDB(`/movie/${this.movieId}`);
            console.log('Movie data test:', movieData);
            
            // Test videos endpoint
            const videosData = await this.fetchFromTMDB(`/movie/${this.movieId}/videos`);
            console.log('Videos data test:', videosData);
            
            this.showNotification(`API Test Complete. Found ${videosData.results ? videosData.results.length : 0} videos.`, 'success');
        } catch (error) {
            console.error('API Test failed:', error);
            this.showNotification('API Test failed. Check console for details.', 'error');
        }
    }

    setupNavigation() {
        // Handle navigation links
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const href = item.getAttribute('href');
                if (href && href !== '#' && !href.includes('signin.html')) {
                    e.preventDefault();
                    window.location.href = href;
                }
            });
        });
    }

    setupAuth() {
        // Update sign in link if user is logged in
        const signInLink = document.querySelector('.nav-item[href="signin.html"]');
        if (this.currentUser && signInLink) {
            signInLink.textContent = this.currentUser.email.split('@')[0];
            signInLink.href = '#';
        }
    }

    async loadTrailer() {
        try {
            this.showLoading();
            console.log('Loading trailer for movie ID:', this.movieId);
            
            const videos = await this.fetchFromTMDB(`/movie/${this.movieId}/videos`);
            console.log('Videos data:', videos);
            
            // Find the best trailer (official trailer first, then any trailer)
            let trailer = null;
            if (videos.results && videos.results.length > 0) {
                console.log('Found', videos.results.length, 'videos');
                
                // First try to find official trailer
                trailer = videos.results.find(video => 
                    video.type === 'Trailer' && 
                    video.site === 'YouTube' && 
                    video.name.toLowerCase().includes('official')
                );
                
                if (trailer) {
                    console.log('Found official trailer:', trailer);
                } else {
                    // If no official trailer, get the first trailer
                    trailer = videos.results.find(video => 
                        video.type === 'Trailer' && video.site === 'YouTube'
                    );
                    
                    if (trailer) {
                        console.log('Found regular trailer:', trailer);
                    } else {
                        // If still no trailer, get any video
                        trailer = videos.results.find(video => video.site === 'YouTube');
                        
                        if (trailer) {
                            console.log('Found any YouTube video:', trailer);
                        }
                    }
                }
            } else {
                console.log('No videos found in results');
            }
            
            this.hideLoading();
            
            if (trailer) {
                console.log('Playing trailer:', trailer);
                this.playVideo(trailer.key, trailer.name);
            } else {
                console.log('No suitable trailer found');
                this.showNotification('No trailer available for this movie. Try checking the "Photos & Videos" tab for available content.');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Error loading trailer:', error);
            this.showNotification('Failed to load trailer. Please try again.');
        }
    }

    playVideo(videoKey, videoName) {
        const modal = document.getElementById('trailerModal');
        const modalTitle = document.getElementById('modalTitle');
        const videoContainer = document.getElementById('videoContainer');
        
        modalTitle.textContent = videoName || 'Movie Trailer';
        videoContainer.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="border: none;">
            </iframe>
        `;
        
        modal.classList.add('active');
        
        // Add loading indicator
        this.showNotification('Loading trailer...', 'info');

        // Record continue watching entry
        try {
            const title = (this.currentMovieData && (this.currentMovieData.title || this.currentMovieData.name)) || document.getElementById('movieTitle')?.textContent || 'Untitled';
            const poster = this.currentMovieData && this.currentMovieData.poster_path
                ? `https://image.tmdb.org/t/p/w500${this.currentMovieData.poster_path}`
                : (document.getElementById('moviePoster')?.src || '');
            this.saveToContinueWatching({
                id: parseInt(this.movieId),
                title,
                poster,
                watchedAt: Date.now(),
                videoKey: videoKey || null,
                videoName: videoName || null
            });
        } catch (e) {
            console.warn('Failed to save continue watching:', e);
        }
    }

    getCustomMovieUrl(movieId) {
        try {
            const map = JSON.parse(localStorage.getItem('movieflix-movie-urls') || '{}');
            return map[String(movieId)] || null;
        } catch (_) {
            return null;
        }
    }

    playFullMovie() {
        const url = this.getCustomMovieUrl(this.movieId);
        if (url) {
            const modal = document.getElementById('trailerModal');
            const modalTitle = document.getElementById('modalTitle');
            const videoContainer = document.getElementById('videoContainer');
            modalTitle.textContent = this.currentMovieData?.title || 'Movie';
            videoContainer.innerHTML = `
                <video controls autoplay style="width: 100%; height: auto; border-radius: 8px; background:black;">
                    <source src="${url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
            modal.classList.add('active');
            this.showNotification('Playing movie...', 'info');
            // Save continue watching entry similar to trailer
            try {
                const title = (this.currentMovieData && (this.currentMovieData.title || this.currentMovieData.name)) || document.getElementById('movieTitle')?.textContent || 'Untitled';
                const poster = this.currentMovieData && this.currentMovieData.poster_path
                    ? `https://image.tmdb.org/t/p/w500${this.currentMovieData.poster_path}`
                    : (document.getElementById('moviePoster')?.src || '');
                this.saveToContinueWatching({
                    id: parseInt(this.movieId),
                    title,
                    poster,
                    watchedAt: Date.now(),
                    videoKey: null,
                    videoName: 'Full Movie'
                });
            } catch (e) {}
            return;
        }
        // Fallback to trailer when no custom URL configured
        this.loadTrailer();
    }

    getContinueWatching() {
        try {
            return JSON.parse(localStorage.getItem('movieflix-continue-watching') || '[]');
        } catch (_) {
            return [];
        }
    }

    saveToContinueWatching(entry) {
        const list = this.getContinueWatching();
        // Remove existing entry with same id
        const filtered = list.filter(item => item.id !== entry.id);
        // Add to front
        filtered.unshift(entry);
        // Cap to 10
        const capped = filtered.slice(0, 10);
        localStorage.setItem('movieflix-continue-watching', JSON.stringify(capped));
    }

    showImage(imageUrl) {
        const modal = document.getElementById('trailerModal');
        const modalTitle = document.getElementById('modalTitle');
        const videoContainer = document.getElementById('videoContainer');
        
        modalTitle.textContent = 'Movie Still';
        videoContainer.innerHTML = `<img src="${imageUrl}" style="width: 100%; height: auto; border-radius: 8px;">`;
        
        modal.classList.add('active');
    }

    toggleFavorite() {
        const movieId = parseInt(this.movieId);
        const index = this.favorites.indexOf(movieId);
        
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.showNotification('Removed from Favorites');
        } else {
            this.favorites.push(movieId);
            this.showNotification('Added to Favorites');
        }
        
        localStorage.setItem('movieflix-favorites', JSON.stringify(this.favorites));
        this.updateActionButtons(movieId);
    }

    toggleWatchlist() {
        const movieId = parseInt(this.movieId);
        const index = this.watchlist.indexOf(movieId);
        
        if (index > -1) {
            this.watchlist.splice(index, 1);
            this.showNotification('Removed from Watchlist');
        } else {
            this.watchlist.push(movieId);
            this.showNotification('Added to Watchlist');
        }
        
        localStorage.setItem('movieflix-watchlist', JSON.stringify(this.watchlist));
        this.updateActionButtons(movieId);
    }

    shareMovie() {
        if (navigator.share) {
            navigator.share({
                title: document.getElementById('movieTitle').textContent,
                text: document.getElementById('movieOverview').textContent,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showNotification('Link copied to clipboard!');
            });
        }
    }

    navigateToMovie(movieId) {
        window.location.href = `movie_details.html?id=${movieId}`;
    }

    showTab(tabName) {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        
        // Define colors for different notification types
        const colors = {
            success: '#e50914',
            error: '#dc3545',
            info: '#17a2b8',
            warning: '#ffc107'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${colors[type] || colors.success};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            font-size: 14px;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds (or 1.5 seconds for info messages)
        const duration = type === 'info' ? 1500 : 3000;
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Global functions for onclick handlers
function showTab(tabName) {
    movieDetailsApp.showTab(tabName);
}

function closeModal() {
    document.getElementById('trailerModal').classList.remove('active');
}

// Initialize the application
let movieDetailsApp;

document.addEventListener('DOMContentLoaded', () => {
    movieDetailsApp = new MovieDetailsApp();
    
    // Make it globally available
    window.movieDetailsApp = movieDetailsApp;
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('trailerModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
