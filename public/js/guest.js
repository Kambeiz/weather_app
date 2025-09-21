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
    const weatherProviderSelect = document.getElementById('weatherProviderSelect');
    const saveLocationBtn = document.getElementById('saveLocationBtn');

    let guestCurrentUnit = 'metric';
    let guestCurrentWeatherData = null;
    let guestCurrentLocation = null;
    let guestCurrentProvider = 'openweather';
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

        // Handle provider selection change for guest
        if (weatherProviderSelect) {
            weatherProviderSelect.addEventListener('change', function() {
                guestCurrentProvider = this.value;
                
                // If we have a location selected, update the weather
                if (guestCurrentLocation && guestCurrentWeatherData) {
                    showGuestLoadingState();
                    getGuestWeatherData(
                        guestCurrentLocation.lat, 
                        guestCurrentLocation.lon, 
                        guestCurrentUnit,
                        guestCurrentProvider
                    ).then(weatherData => {
                        guestCurrentWeatherData = weatherData;
                        renderGuestWeather(guestCurrentLocation, weatherData);
                    }).catch(error => {
                        showGuestError('Failed to update weather provider');
                    });
                }
            });
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
            const weatherData = await getGuestWeatherData(selectedLat, selectedLon, guestCurrentUnit, guestCurrentProvider);
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

    async function getGuestWeatherData(lat, lon, units = 'metric', provider = 'openweather') {
        try {
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}&units=${units}&provider=${provider}`);
            
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
                        ${weatherData.provider ? ` • Data from ${weatherData.provider}` : ''}
                    </small>
                </div>
                <div class="mt-3">
                    <div class="btn-group-vertical d-grid gap-2" role="group">
                        ${getGuestProviderSpecificButtons(location.lat, location.lon, weatherData.provider)}
                    </div>
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
                    guestCurrentUnit,
                    guestCurrentProvider
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

    // Get provider-specific buttons for guest mode
    function getGuestProviderSpecificButtons(lat, lon, provider) {
        let buttons = '';
        
        if (provider === 'Open-Meteo') {
            // Open-Meteo features
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleGuestWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>7-Day Forecast
                </button>
                <button class="btn btn-outline-warning btn-sm" onclick="toggleGuestWeatherSection('marine', ${lat}, ${lon})">
                    <i class="fas fa-anchor me-1"></i>Marine Weather
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="toggleGuestWeatherSection('historical', ${lat}, ${lon})">
                    <i class="fas fa-history me-1"></i>Historical Weather
                </button>
            `;
        } else if (provider === 'OpenWeatherMap') {
            // OpenWeather API features
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleGuestWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>5-Day Forecast
                </button>
                <button class="btn btn-outline-success btn-sm" onclick="toggleGuestWeatherSection('airPollution', ${lat}, ${lon})">
                    <i class="fas fa-leaf me-1"></i>Air Quality
                </button>
                <button class="btn btn-outline-info btn-sm" onclick="toggleGuestWeatherSection('weatherMap', ${lat}, ${lon})">
                    <i class="fas fa-map me-1"></i>Weather Map
                </button>
            `;
        } else if (provider === 'WeatherAPI') {
            // WeatherAPI features
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleGuestWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>3-Day Forecast
                </button>
                <button class="btn btn-outline-info btn-sm" onclick="toggleGuestWeatherSection('astronomy', ${lat}, ${lon})">
                    <i class="fas fa-moon me-1"></i>Astronomy
                </button>
                <button class="btn btn-outline-warning btn-sm" onclick="toggleGuestWeatherSection('marine', ${lat}, ${lon})">
                    <i class="fas fa-anchor me-1"></i>Marine Weather
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="toggleGuestWeatherSection('historical', ${lat}, ${lon})">
                    <i class="fas fa-history me-1"></i>Historical (7 days)
                </button>
            `;
        } else if (provider === 'Open-Meteo') {
            // Open-Meteo features
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleGuestWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>7-Day Forecast
                </button>
                <button class="btn btn-outline-warning btn-sm" onclick="toggleGuestWeatherSection('marine', ${lat}, ${lon})">
                    <i class="fas fa-anchor me-1"></i>Marine Weather
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="toggleGuestWeatherSection('historical', ${lat}, ${lon})">
                    <i class="fas fa-history me-1"></i>Historical Weather
                </button>
            `;
        } else {
            // Fallback - show all options
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleGuestWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>Forecast
                </button>
                <button class="btn btn-outline-success btn-sm" onclick="toggleGuestWeatherSection('airPollution', ${lat}, ${lon})">
                    <i class="fas fa-leaf me-1"></i>Air Quality
                </button>
                <button class="btn btn-outline-info btn-sm" onclick="toggleGuestWeatherSection('astronomy', ${lat}, ${lon})">
                    <i class="fas fa-moon me-1"></i>Astronomy
                </button>
                <button class="btn btn-outline-dark btn-sm" onclick="toggleGuestWeatherSection('weatherMap', ${lat}, ${lon})">
                    <i class="fas fa-map me-1"></i>Weather Map
                </button>
            `;
        }
        
        return buttons;
    }

    // Make function available globally for onclick handlers
    window.toggleGuestWeatherSection = async function(sectionType, lat, lon) {
        // Hide all sections first
        hideAllGuestWeatherSections();
        
        try {
            switch(sectionType) {
                case 'forecast':
                    await showGuestForecast(lat, lon);
                    break;
                case 'airPollution':
                    await showGuestAirPollution(lat, lon);
                    break;
                case 'marine':
                    await showGuestMarine(lat, lon);
                    break;
                case 'historical':
                    await showGuestHistorical(lat, lon);
                    break;
                case 'astronomy':
                    await showGuestAstronomy(lat, lon);
                    break;
                case 'weatherMap':
                    await showGuestWeatherMap(lat, lon);
                    break;
                default:
                    alert(`${sectionType} feature is not yet implemented.`);
            }
        } catch (error) {
            console.error(`Error loading ${sectionType}:`, error);
            alert(`Failed to load ${sectionType} data. Please try again.`);
        }
    };
    
    function hideAllGuestWeatherSections() {
        const sections = ['guestForecastSection', 'guestAirPollutionSection', 'guestMarineSection', 'guestHistoricalSection', 'guestAstronomySection', 'guestWeatherMapSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
    }
    
    async function showGuestForecast(lat, lon) {
        let forecastSection = document.getElementById('guestForecastSection');
        if (!forecastSection) {
            forecastSection = createGuestWeatherSection('guestForecastSection', 'Weather Forecast', 'fas fa-calendar-week');
        }
        
        const forecastContent = forecastSection.querySelector('.section-content');
        forecastContent.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading forecast...</p></div>';
        forecastSection.style.display = 'block';
        
        try {
            const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}&units=${guestCurrentUnit}&provider=${guestCurrentProvider}`);
            if (!response.ok) throw new Error('Failed to fetch forecast data');
            
            const forecastData = await response.json();
            renderGuestForecast(forecastData, forecastContent);
        } catch (error) {
            forecastContent.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Failed to load forecast data.</div>';
        }
    }
    
    async function showGuestAirPollution(lat, lon) {
        let airSection = document.getElementById('guestAirPollutionSection');
        if (!airSection) {
            airSection = createGuestWeatherSection('guestAirPollutionSection', 'Air Quality Index', 'fas fa-leaf');
        }
        
        const airContent = airSection.querySelector('.section-content');
        airContent.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading air quality...</p></div>';
        airSection.style.display = 'block';
        
        try {
            const response = await fetch(`/api/air-pollution?lat=${lat}&lon=${lon}`);
            if (!response.ok) throw new Error('Failed to fetch air pollution data');
            
            const airData = await response.json();
            renderGuestAirPollution(airData, airContent);
        } catch (error) {
            airContent.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Air quality data not available for this location.</div>';
        }
    }
    
    async function showGuestMarine(lat, lon) {
        let marineSection = document.getElementById('guestMarineSection');
        if (!marineSection) {
            marineSection = createGuestWeatherSection('guestMarineSection', 'Marine Weather', 'fas fa-anchor');
        }
        
        const marineContent = marineSection.querySelector('.section-content');
        marineContent.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading marine weather...</p></div>';
        marineSection.style.display = 'block';
        
        try {
            const response = await fetch(`/api/marine?lat=${lat}&lon=${lon}&provider=${guestCurrentProvider}`);
            if (!response.ok) throw new Error('Failed to fetch marine data');
            
            const marineData = await response.json();
            renderGuestMarine(marineData, marineContent);
        } catch (error) {
            marineContent.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Marine weather data not available for this location.</div>';
        }
    }
    
    async function showGuestHistorical(lat, lon) {
        let historicalSection = document.getElementById('guestHistoricalSection');
        if (!historicalSection) {
            historicalSection = createGuestWeatherSection('guestHistoricalSection', 'Historical Weather', 'fas fa-history');
        }
        
        const historicalContent = historicalSection.querySelector('.section-content');
        historicalContent.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading historical weather...</p></div>';
        historicalSection.style.display = 'block';
        
        try {
            // Get yesterday's date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            
            const response = await fetch(`/api/historical?lat=${lat}&lon=${lon}&date=${dateStr}&provider=${guestCurrentProvider}`);
            if (!response.ok) throw new Error('Failed to fetch historical data');
            
            const historicalData = await response.json();
            renderGuestHistorical(historicalData, historicalContent);
        } catch (error) {
            historicalContent.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Historical weather data not available.</div>';
        }
    }
    
    async function showGuestAstronomy(lat, lon) {
        let astronomySection = document.getElementById('guestAstronomySection');
        if (!astronomySection) {
            astronomySection = createGuestWeatherSection('guestAstronomySection', 'Astronomy', 'fas fa-moon');
        }
        
        const astronomyContent = astronomySection.querySelector('.section-content');
        astronomyContent.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading astronomy data...</p></div>';
        astronomySection.style.display = 'block';
        
        try {
            const response = await fetch(`/api/astronomy?lat=${lat}&lon=${lon}`);
            if (!response.ok) throw new Error('Failed to fetch astronomy data');
            
            const astronomyData = await response.json();
            renderGuestAstronomy(astronomyData, astronomyContent);
        } catch (error) {
            astronomyContent.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Astronomy data not available.</div>';
        }
    }
    
    function createGuestWeatherSection(sectionId, title, iconClass) {
        const section = document.createElement('div');
        section.id = sectionId;
        section.className = 'mt-4 d-flex justify-content-center';
        section.style.display = 'none';
        
        section.innerHTML = `
            <div class="card shadow" style="width: 100%; max-width: 100%;">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0"><i class="${iconClass} me-2"></i>${title}</h5>
                    <button class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('${sectionId}').style.display='none'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="card-body text-center">
                    <div class="section-content"></div>
                </div>
            </div>
        `;
        
        guestWeatherSection.appendChild(section);
        return section;
    }
    
    function renderGuestForecast(forecastData, container) {
        const tempUnit = guestCurrentUnit === 'metric' ? '°C' : '°F';
        let forecastHTML = '<div class="row">';
        
        // Group forecast data by day (take every 8th item for daily forecast)
        const dailyForecasts = [];
        const maxDays = guestCurrentProvider === 'openmeteo' ? 7 : 5; // Open-Meteo supports 7 days
        for (let i = 0; i < forecastData.list.length; i += 8) {
            if (dailyForecasts.length >= maxDays) break;
            dailyForecasts.push(forecastData.list[i]);
        }
        
        dailyForecasts.forEach((forecast, index) => {
            const date = new Date(forecast.dt * 1000);
            const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' });
            const weatherIcon = getGuestWeatherIcon(forecast.weather[0].icon);
            
            forecastHTML += `
                <div class="col-md-2 col-sm-4 col-6 mb-3">
                    <div class="forecast-card text-center p-3 border rounded">
                        <div class="fw-bold mb-2">${dayName}</div>
                        <div class="weather-icon mb-2" style="font-size: 2rem; color: ${getGuestWeatherColor(forecast.weather[0].main.toLowerCase())}">
                            ${weatherIcon}
                        </div>
                        <div class="temperature mb-1">
                            <span class="fw-bold">${Math.round(forecast.main.temp)}${tempUnit}</span>
                        </div>
                        <div class="text-muted small">${forecast.weather[0].description}</div>
                        <div class="text-muted small mt-1">
                            <i class="fas fa-tint"></i> ${forecast.main.humidity}%
                        </div>
                    </div>
                </div>
            `;
        });
        
        forecastHTML += '</div>';
        container.innerHTML = forecastHTML;
    }
    
    function renderGuestAirPollution(airData, container) {
        const aqiInfo = airData.aqiLabel;
        const components = airData.components;
        
        const airHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="air-quality-card p-4 text-center border rounded" style="background-color: ${aqiInfo.color}20; border-color: ${aqiInfo.color}!important;">
                        <h3 class="mb-2" style="color: ${aqiInfo.color}">${airData.aqi}</h3>
                        <h5 class="mb-0">${aqiInfo.label}</h5>
                        <small class="text-muted">Air Quality Index</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="pollutants">
                        <h6>Pollutant Levels (μg/m³)</h6>
                        <div class="row small">
                            <div class="col-6">PM2.5: ${components.pm2_5}</div>
                            <div class="col-6">PM10: ${components.pm10}</div>
                            <div class="col-6">NO₂: ${components.no2}</div>
                            <div class="col-6">O₃: ${components.o3}</div>
                            <div class="col-6">SO₂: ${components.so2}</div>
                            <div class="col-6">CO: ${components.co}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = airHTML;
    }
    
    function renderGuestMarine(marineData, container) {
        const marineHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Current Marine Conditions</h6>
                    <div class="marine-info">
                        <div class="mb-2"><i class="fas fa-water"></i> Average Wave Height: ${marineData.marine_day.avg_wave_height?.toFixed(1) || 'N/A'} m</div>
                        <div class="mb-2"><i class="fas fa-arrow-up"></i> Max Wave Height: ${marineData.marine_day.max_wave_height?.toFixed(1) || 'N/A'} m</div>
                        <div class="mb-2"><i class="fas fa-clock"></i> Average Wave Period: ${marineData.marine_day.avg_wave_period?.toFixed(1) || 'N/A'} s</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>Location</h6>
                    <div class="text-muted">
                        <div>Latitude: ${marineData.location.lat}</div>
                        <div>Longitude: ${marineData.location.lon}</div>
                        <div>Date: ${marineData.date}</div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = marineHTML;
    }
    
    function renderGuestHistorical(historicalData, container) {
        const tempUnit = guestCurrentUnit === 'metric' ? '°C' : '°F';
        const precipUnit = guestCurrentUnit === 'metric' ? 'mm' : 'in';
        
        const historicalHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Weather Summary for ${historicalData.date}</h6>
                    <div class="historical-summary p-3 border rounded">
                        <div class="d-flex justify-content-between mb-2">
                            <span>High Temperature:</span>
                            <span class="fw-bold">${Math.round(historicalData.day.maxtemp_c)}${tempUnit}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Low Temperature:</span>
                            <span class="fw-bold">${Math.round(historicalData.day.mintemp_c)}${tempUnit}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Average Temperature:</span>
                            <span class="fw-bold">${Math.round(historicalData.day.avgtemp_c)}${tempUnit}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Precipitation:</span>
                            <span class="fw-bold">${historicalData.day.totalprecip_mm} ${precipUnit}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Condition:</span>
                            <span class="fw-bold">${historicalData.day.condition.text}</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>Location Information</h6>
                    <div class="text-muted">
                        <div>Location: ${historicalData.location.name}</div>
                        <div>Coordinates: ${historicalData.location.lat}, ${historicalData.location.lon}</div>
                        <div>Date: ${historicalData.date}</div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = historicalHTML;
    }
    
    function renderGuestAstronomy(astronomyData, container) {
        const astronomyHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Sun Information</h6>
                    <div class="astronomy-info p-3 border rounded mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="fas fa-sun text-warning"></i> Sunrise:</span>
                            <span class="fw-bold">${astronomyData.sunrise}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="fas fa-sun text-orange"></i> Sunset:</span>
                            <span class="fw-bold">${astronomyData.sunset}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-circle text-success"></i> Sun Status:</span>
                            <span class="fw-bold">${astronomyData.is_sun_up ? 'Up' : 'Down'}</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>Moon Information</h6>
                    <div class="astronomy-info p-3 border rounded mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="fas fa-moon text-info"></i> Moonrise:</span>
                            <span class="fw-bold">${astronomyData.moonrise}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="fas fa-moon text-secondary"></i> Moonset:</span>
                            <span class="fw-bold">${astronomyData.moonset}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="fas fa-circle-half-stroke"></i> Phase:</span>
                            <span class="fw-bold">${astronomyData.moon_phase}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="fas fa-percentage"></i> Illumination:</span>
                            <span class="fw-bold">${astronomyData.moon_illumination}%</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-circle text-primary"></i> Moon Status:</span>
                            <span class="fw-bold">${astronomyData.is_moon_up ? 'Up' : 'Down'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = astronomyHTML;
    }
    
    async function showGuestWeatherMap(lat, lon) {
        let mapSection = document.getElementById('guestWeatherMapSection');
        if (!mapSection) {
            mapSection = createGuestWeatherSection('guestWeatherMapSection', 'Weather Map', 'fas fa-map');
        }
        
        const mapContent = mapSection.querySelector('.section-content');
        mapContent.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading weather map...</p></div>';
        mapSection.style.display = 'block';
        
        try {
            renderGuestWeatherMap(lat, lon, mapContent);
        } catch (error) {
            mapContent.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Weather map not available.</div>';
        }
    }
    
    function renderGuestWeatherMap(lat, lon, container) {
        const mapHTML = `
            <div class="weather-map-container">
                <div class="mb-3">
                    <h6>Interactive Weather Map</h6>
                    <p class="text-muted small">Select different weather layers to view temperature, precipitation, wind, and pressure data.</p>
                </div>
                <div class="map-controls mb-3">
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm active" onclick="switchMapLayer('TA2', this)">
                            <i class="fas fa-thermometer-half"></i> Temperature
                        </button>
                        <button type="button" class="btn btn-outline-info btn-sm" onclick="switchMapLayer('PA0', this)">
                            <i class="fas fa-cloud-rain"></i> Precipitation
                        </button>
                        <button type="button" class="btn btn-outline-success btn-sm" onclick="switchMapLayer('WND', this)">
                            <i class="fas fa-wind"></i> Wind
                        </button>
                        <button type="button" class="btn btn-outline-warning btn-sm" onclick="switchMapLayer('APM', this)">
                            <i class="fas fa-tachometer-alt"></i> Pressure
                        </button>
                    </div>
                </div>
                <div id="weatherMap" style="height: 400px; border: 1px solid #ddd; border-radius: 8px;"></div>
                <div class="mt-2">
                    <small class="text-muted">
                        <i class="fas fa-info-circle"></i> 
                        Map data provided by OpenWeatherMap. Click and drag to navigate, scroll to zoom.
                    </small>
                </div>
            </div>
        `;
        
        container.innerHTML = mapHTML;
        
        // Initialize the map after a short delay to ensure DOM is ready
        setTimeout(() => {
            initializeWeatherMap(lat, lon);
        }, 100);
    }
    
    function initializeWeatherMap(lat, lon) {
        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            // Load Leaflet dynamically
            loadLeafletAndInitMap(lat, lon);
            return;
        }
        
        createWeatherMap(lat, lon);
    }
    
    function loadLeafletAndInitMap(lat, lon) {
        // Load Leaflet CSS
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);
        
        // Load Leaflet JS
        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.onload = () => {
            createWeatherMap(lat, lon);
        };
        document.head.appendChild(leafletJS);
    }
    
    function createWeatherMap(lat, lon) {
        const mapContainer = document.getElementById('weatherMap');
        if (!mapContainer) return;
        
        // Clear any existing map
        mapContainer.innerHTML = '';
        
        // Create the map
        const map = L.map('weatherMap').setView([lat, lon], 8);
        
        // Add base map layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Add marker for the selected location
        L.marker([lat, lon]).addTo(map)
            .bindPopup(`Weather data for ${guestCurrentLocation?.name || 'Selected Location'}`)
            .openPopup();
        
        // Add initial weather layer (temperature)
        getOpenWeatherApiKey().then(apiKey => {
            window.currentWeatherLayer = L.tileLayer(
                `https://maps.openweathermap.org/maps/2.0/weather/TA2/{z}/{x}/{y}?appid=${apiKey}&opacity=0.6`,
                {
                    attribution: '© OpenWeatherMap',
                    opacity: 0.6
                }
            ).addTo(map);
        });
        
        // Store map reference globally for layer switching
        window.guestWeatherMap = map;
    }
    
    // Make functions available globally
    window.switchMapLayer = function(layerType, button) {
        if (!window.guestWeatherMap || !window.currentWeatherLayer) return;
        
        // Update button states
        document.querySelectorAll('.map-controls .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Remove current weather layer
        window.guestWeatherMap.removeLayer(window.currentWeatherLayer);
        
        // Add new weather layer
        getOpenWeatherApiKey().then(apiKey => {
            window.currentWeatherLayer = L.tileLayer(
                `https://maps.openweathermap.org/maps/2.0/weather/${layerType}/{z}/{x}/{y}?appid=${apiKey}&opacity=0.6`,
                {
                    attribution: '© OpenWeatherMap',
                    opacity: 0.6
                }
            ).addTo(window.guestWeatherMap);
        });
    };
    
    async function getOpenWeatherApiKey() {
        try {
            const response = await fetch('/api/weather-map-key');
            if (response.ok) {
                const data = await response.json();
                return data.apiKey;
            }
        } catch (error) {
            console.error('Failed to get weather map API key:', error);
        }
        return 'demo_key'; // Fallback
    }
});
