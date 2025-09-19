// Guest weather functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the homepage (guest mode)
    if (!document.getElementById('guestWeatherForm')) return;

    // DOM Elements for guest functionality
    const guestWeatherForm = document.getElementById('guestWeatherForm');
    const guestLocationInput = document.getElementById('guestLocationInput');
    const guestLocationSuggestions = document.getElementById('guestLocationSuggestions');
    const guestWeatherSection = document.getElementById('guestWeatherSection');
    const guestWeatherContent = document.getElementById('guestWeatherContent');
    const guestUnitToggle = document.getElementById('guestUnitToggle');
    const saveLocationBtn = document.getElementById('saveLocationBtn');

    let guestCurrentUnit = 'metric';
    let guestCurrentWeatherData = null;
    let guestCurrentLocation = null;
    let searchTimeout;

    // Initialize guest functionality
    initializeGuestMode();

    function initializeGuestMode() {
        setupGuestEventListeners();
        initializeGuestLocationSearch();
    }

    function setupGuestEventListeners() {
        // Guest weather form submission
        if (guestWeatherForm) {
            guestWeatherForm.addEventListener('submit', handleGuestWeatherSearch);
        }

        // Guest unit toggle
        if (guestUnitToggle) {
            guestUnitToggle.addEventListener('change', toggleGuestTemperatureUnit);
        }

        // Save location button (prompts for account creation)
        if (saveLocationBtn) {
            saveLocationBtn.addEventListener('click', promptAccountCreation);
        }
    }

    function initializeGuestLocationSearch() {
        if (!guestLocationInput) return;

        guestLocationInput.addEventListener('input', function() {
            const value = this.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            if (value.length < 2) {
                guestLocationSuggestions.style.display = 'none';
                return;
            }

            // Debounce the search
            searchTimeout = setTimeout(async () => {
                try {
                    await searchGuestLocations(value);
                } catch (error) {
                    console.error('Error searching locations:', error);
                }
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.location-selector')) {
                guestLocationSuggestions.style.display = 'none';
            }
        });
    }

    async function searchGuestLocations(query) {
        try {
            const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error('Failed to search locations');
            }
            
            const locations = await response.json();
            
            if (locations && locations.length > 0) {
                renderGuestLocationSuggestions(locations);
            } else {
                guestLocationSuggestions.style.display = 'none';
            }
        } catch (error) {
            console.error('Error searching locations:', error);
            guestLocationSuggestions.style.display = 'none';
        }
    }

    function renderGuestLocationSuggestions(locations) {
        guestLocationSuggestions.innerHTML = '';
        
        locations.slice(0, 8).forEach(location => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            
            // Format the location display
            let displayName = location.name;
            let details = [];
            
            if (location.state) {
                details.push(location.state);
            }
            if (location.country) {
                details.push(location.country);
            }
            
            div.innerHTML = `
                <div class="location-name">${displayName}</div>
                <div class="location-details">
                    ${details.join(', ')}
                    <span class="location-country">${location.country || ''}</span>
                </div>
            `;
            
            div.addEventListener('click', () => {
                guestLocationInput.value = `${displayName}${details.length > 0 ? ', ' + details.join(', ') : ''}`;
                document.getElementById('guestSelectedLat').value = location.lat;
                document.getElementById('guestSelectedLon').value = location.lon;
                document.getElementById('guestSelectedName').value = location.name;
                document.getElementById('guestSelectedCountry').value = location.country || '';
                guestLocationSuggestions.style.display = 'none';
            });
            
            guestLocationSuggestions.appendChild(div);
        });
        
        guestLocationSuggestions.style.display = 'block';
    }

    async function handleGuestWeatherSearch(e) {
        e.preventDefault();
        
        const selectedLat = document.getElementById('guestSelectedLat').value;
        const selectedLon = document.getElementById('guestSelectedLon').value;
        const selectedName = document.getElementById('guestSelectedName').value;
        const selectedCountry = document.getElementById('guestSelectedCountry').value;
        
        if (!selectedLat || !selectedLon || !selectedName) {
            alert('Please select a location from the suggestions');
            return;
        }

        try {
            // Show loading state
            showGuestLoadingState();
            
            // Store current location for potential saving
            guestCurrentLocation = {
                name: selectedName,
                country: selectedCountry,
                lat: parseFloat(selectedLat),
                lon: parseFloat(selectedLon)
            };

            // Get weather data
            const weatherData = await getGuestWeatherData(selectedLat, selectedLon, guestCurrentUnit);
            guestCurrentWeatherData = weatherData;
            
            // Display weather
            renderGuestWeather(guestCurrentLocation, weatherData);
            
            // Show the weather section and save button
            guestWeatherSection.style.display = 'block';
            saveLocationBtn.style.display = 'inline-block';
            
            // Scroll to weather section
            guestWeatherSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error getting weather:', error);
            showGuestError(error.message);
        }
    }

    async function getGuestWeatherData(lat, lon, units = 'metric') {
        try {
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}&units=${units}&provider=openweather`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch weather data');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching weather data:', error);
            throw new Error('Failed to fetch weather data. Please try again later.');
        }
    }

    function renderGuestWeather(location, weatherData) {
        const weatherMain = weatherData.weather[0].main.toLowerCase();
        const weatherIcon = getGuestWeatherIcon(weatherData.weather[0].icon);
        const tempValue = Math.round(weatherData.main.temp);
        const tempUnit = guestCurrentUnit === 'metric' ? '°C' : '°F';
        const windSpeedUnit = guestCurrentUnit === 'metric' ? 'm/s' : 'mph';
        
        // Generate weather background effect
        const weatherEffect = getGuestWeatherEffect(weatherMain);
        
        const weatherHTML = `
            <div class="weather-card">
                ${weatherEffect}
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h3 class="city-name mb-0">${location.name}${location.country ? ', ' + location.country : ''}</h3>
                    <div class="weather-icon" style="font-size: 3rem; color: ${getGuestWeatherColor(weatherMain)}">
                        ${weatherIcon}
                    </div>
                </div>
                <div class="temperature">
                    <span class="temp-value">${tempValue}</span>
                    <span class="temp-unit">${tempUnit}</span>
                </div>
                <div class="weather-description">${weatherData.weather[0].description}</div>
                <div class="weather-details mt-3">
                    <div class="row">
                        <div class="col-6">
                            <div><i class="fas fa-tint"></i> Humidity: <span class="humidity">${weatherData.main.humidity}</span>%</div>
                            <div><i class="fas fa-wind"></i> Wind: <span class="wind-speed">${weatherData.wind.speed.toFixed(1)}</span> ${windSpeedUnit}</div>
                            <div><i class="fas fa-eye"></i> Visibility: ${(weatherData.visibility / 1000).toFixed(1)} km</div>
                        </div>
                        <div class="col-6">
                            <div><i class="fas fa-arrow-up"></i> H: <span class="temp-max">${Math.round(weatherData.main.temp_max)}</span>°</div>
                            <div><i class="fas fa-arrow-down"></i> L: <span class="temp-min">${Math.round(weatherData.main.temp_min)}</span>°</div>
                            <div><i class="fas fa-thermometer-half"></i> Feels like: ${Math.round(weatherData.main.feels_like)}°</div>
                        </div>
                    </div>
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        <i class="fas fa-clock"></i> Last updated: ${new Date().toLocaleTimeString()}
                    </small>
                </div>
            </div>
        `;
        
        guestWeatherContent.innerHTML = weatherHTML;
        
        // Add weather animations after rendering
        if (weatherMain.includes('rain')) {
            addGuestRainEffect();
        } else if (weatherMain.includes('snow')) {
            addGuestSnowEffect();
        }
    }

    function showGuestLoadingState() {
        guestWeatherContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading weather data...</p>
            </div>
        `;
        guestWeatherSection.style.display = 'block';
    }

    function showGuestError(message) {
        guestWeatherContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `;
        guestWeatherSection.style.display = 'block';
    }

    async function toggleGuestTemperatureUnit() {
        guestCurrentUnit = guestUnitToggle.checked ? 'imperial' : 'metric';
        
        if (guestCurrentLocation && guestCurrentWeatherData) {
            showGuestLoadingState();
            try {
                const weatherData = await getGuestWeatherData(
                    guestCurrentLocation.lat, 
                    guestCurrentLocation.lon, 
                    guestCurrentUnit
                );
                guestCurrentWeatherData = weatherData;
                renderGuestWeather(guestCurrentLocation, weatherData);
            } catch (error) {
                showGuestError('Failed to update temperature units');
            }
        }
    }

    function promptAccountCreation() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Save This Location</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>To save <strong>${guestCurrentLocation.name}</strong> to your favorites, you need to create an account.</p>
                        <p class="text-muted">With an account, you can:</p>
                        <ul class="text-muted">
                            <li>Save multiple favorite locations</li>
                            <li>Quick access to weather for all your cities</li>
                            <li>Switch between different weather providers</li>
                        </ul>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Maybe Later</button>
                        <a href="/register" class="btn btn-primary">Create Account</a>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Remove modal from DOM when hidden
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    // Helper functions (similar to main.js but for guest mode)
    function getGuestWeatherEffect(weatherMain) {
        let bgClass = 'clear';
        if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) {
            bgClass = 'rain';
        } else if (weatherMain.includes('cloud')) {
            bgClass = 'clouds';
        } else if (weatherMain.includes('snow')) {
            bgClass = 'snow';
        }
        
        return `<div class="weather-background ${bgClass}"></div>`;
    }

    function getGuestWeatherColor(weatherMain) {
        if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) return '#4a90e2';
        if (weatherMain.includes('cloud')) return '#9e9e9e';
        if (weatherMain.includes('snow')) return '#b3d4f1';
        if (weatherMain.includes('thunder')) return '#6b46c1';
        if (weatherMain.includes('clear')) return '#f39c12';
        return '#0d6efd';
    }

    function getGuestWeatherIcon(iconCode) {
        const iconMap = {
            '01d': 'fas fa-sun',
            '02d': 'fas fa-cloud-sun',
            '03d': 'fas fa-cloud',
            '04d': 'fas fa-cloud-meatball',
            '09d': 'fas fa-cloud-rain',
            '10d': 'fas fa-cloud-sun-rain',
            '11d': 'fas fa-bolt',
            '13d': 'far fa-snowflake',
            '50d': 'fas fa-smog',
            '01n': 'fas fa-moon',
            '02n': 'fas fa-cloud-moon',
            '03n': 'fas fa-cloud',
            '04n': 'fas fa-cloud-meatball',
            '09n': 'fas fa-cloud-rain',
            '10n': 'fas fa-cloud-moon-rain',
            '11n': 'fas fa-bolt',
            '13n': 'far fa-snowflake',
            '50n': 'fas fa-smog'
        };
        
        const iconClass = iconMap[iconCode] || 'fas fa-question';
        return `<i class="${iconClass}"></i>`;
    }

    function addGuestRainEffect() {
        const rainContainer = document.createElement('div');
        rainContainer.className = 'rain-container';
        
        for (let i = 0; i < 20; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = Math.random() * 100 + '%';
            drop.style.animationDuration = Math.random() * 1 + 0.5 + 's';
            drop.style.animationDelay = Math.random() * 2 + 's';
            rainContainer.appendChild(drop);
        }
        
        document.querySelector('#guestWeatherContent .weather-card').appendChild(rainContainer);
    }

    function addGuestSnowEffect() {
        const snowContainer = document.createElement('div');
        snowContainer.className = 'snow-container';
        
        for (let i = 0; i < 15; i++) {
            const flake = document.createElement('div');
            flake.className = 'snow-flake';
            flake.innerHTML = '❄';
            flake.style.left = Math.random() * 100 + '%';
            flake.style.animationDuration = Math.random() * 3 + 2 + 's';
            flake.style.animationDelay = Math.random() * 2 + 's';
            flake.style.fontSize = Math.random() * 10 + 10 + 'px';
            snowContainer.appendChild(flake);
        }
        
        document.querySelector('#guestWeatherContent .weather-card').appendChild(snowContainer);
    }
});
