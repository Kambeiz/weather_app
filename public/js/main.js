document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const addCityForm = document.getElementById('addCityForm');
    const savedCitiesList = document.getElementById('savedCitiesList');
    const noCitiesMessage = document.getElementById('noCitiesMessage');
    const weatherContent = document.getElementById('weatherContent');
    const unitToggle = document.getElementById('unitToggle');
    const locationInput = document.getElementById('locationInput');
    const locationSuggestions = document.getElementById('locationSuggestions');
    const providerButtons = document.querySelectorAll('.provider-btn');
    const weatherProviderSelect = document.getElementById('weatherProviderSelect');
    
    let currentUnit = 'metric'; // Default to Celsius
    let savedCities = [];
    let currentCityId = null;
    let currentPreferredProvider = 'openweather'; // Default provider
    let selectedCountry = null;

    // Initialize the application
    async function init() {
        loadSavedCities();
        setupEventListeners();
        initializeCountrySelector();
    }

    // Set up event listeners
    function setupEventListeners() {
        // Add city form submission
        if (addCityForm) {
            addCityForm.addEventListener('submit', handleAddCity);
        }

        // Unit toggle (Celsius/Fahrenheit)
        if (unitToggle) {
            unitToggle.addEventListener('change', toggleTemperatureUnit);
        }

        // Weather provider selection
        providerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                providerButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPreferredProvider = btn.dataset.provider;
                
                // Refresh current city weather with new provider
                if (currentCityId) {
                    showWeatherForCity(currentCityId);
                }
            });
        });

        // Handle provider selection change
        if (weatherProviderSelect) {
            weatherProviderSelect.addEventListener('change', function() {
                currentPreferredProvider = this.value;
                
                // If we have a location selected, update the weather
                if (weatherContent.style.display !== 'none') {
                    const lat = document.getElementById('selectedLat').value;
                    const lon = document.getElementById('selectedLon').value;
                    
                    if (lat && lon) {
                        getWeatherForLocation(lat, lon, currentUnit, currentPreferredProvider);
                    }
                }
                
                // If we have a city selected in the dashboard, update that too
                if (currentCityId) {
                    showWeatherForCity(currentCityId);
                }
            });
        }
    }

    // Initialize location selector with autocomplete
    function initializeCountrySelector() {
        if (!locationInput) return;
        
        // Initialize country dropdown if available
        const countrySelect = document.getElementById('countrySelect');
        if (countrySelect && typeof countries !== 'undefined') {
            // Clear existing options
            countrySelect.innerHTML = '<option value="">All Countries</option>';
            
            // Add countries from the countries.js file
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.code;
                option.textContent = country.name;
                countrySelect.appendChild(option);
            });
            
            // Add event listener for country selection
            countrySelect.addEventListener('change', function() {
                selectedCountry = this.value;
                // Clear location input when country changes
                locationInput.value = '';
            });
        }

        let searchTimeout;
        
        locationInput.addEventListener('input', function() {
            const value = this.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            if (value.length < 2) {
                locationSuggestions.style.display = 'none';
                return;
            }

            // Debounce the search to avoid too many API calls
            searchTimeout = setTimeout(async () => {
                try {
                    await searchLocations(value);
                } catch (error) {
                    console.error('Error searching locations:', error);
                }
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.location-selector')) {
                locationSuggestions.style.display = 'none';
            }
        });
    }

    // Search for locations using geocoding API
    async function searchLocations(query) {
        try {
            // Add country filter if selected
            let apiUrl = `/api/geocode?q=${encodeURIComponent(query)}`;
            if (selectedCountry) {
                apiUrl += `&country=${selectedCountry}`;
            }
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Failed to search locations');
            }
            
            const locations = await response.json();
            
            if (locations && locations.length > 0) {
                renderLocationSuggestions(locations);
            } else {
                locationSuggestions.style.display = 'none';
            }
        } catch (error) {
            console.error('Error searching locations:', error);
            locationSuggestions.style.display = 'none';
        }
    }

    // Render location suggestions
    function renderLocationSuggestions(locations) {
        locationSuggestions.innerHTML = '';
        
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
                locationInput.value = `${displayName}${details.length > 0 ? ', ' + details.join(', ') : ''}`;
                document.getElementById('selectedLat').value = location.lat;
                document.getElementById('selectedLon').value = location.lon;
                document.getElementById('selectedName').value = location.name;
                document.getElementById('selectedCountry').value = location.country || '';
                locationSuggestions.style.display = 'none';
            });
            
            locationSuggestions.appendChild(div);
        });
        
        locationSuggestions.style.display = 'block';
    }

    // Handle adding a new city
    async function handleAddCity(e) {
        e.preventDefault();
        
        const selectedLat = document.getElementById('selectedLat').value;
        const selectedLon = document.getElementById('selectedLon').value;
        const selectedName = document.getElementById('selectedName').value;
        const selectedCountry = document.getElementById('selectedCountry').value;
        
        if (!selectedLat || !selectedLon || !selectedName) {
            alert('Please select a location from the suggestions');
            return;
        }
        
        try {
            // Show loading state
            showLoadingState();
            
            // Add city to the database using selected coordinates
            const response = await fetch('/api/cities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cityName: selectedName,
                    countryCode: selectedCountry,
                    lat: parseFloat(selectedLat),
                    lon: parseFloat(selectedLon)
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add location');
            }
            
            const city = await response.json();
            
            // Reset form
            addCityForm.reset();
            document.getElementById('selectedLat').value = '';
            document.getElementById('selectedLon').value = '';
            document.getElementById('selectedName').value = '';
            document.getElementById('selectedCountry').value = '';
            
            // Reload the cities list
            await loadSavedCities();
            
            // Show weather for the newly added city
            await showWeatherForCity(city.id);
            
        } catch (error) {
            console.error('Error adding location:', error);
            showError(error.message);
        }
    }

    // Show loading state
    function showLoadingState() {
        weatherContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading weather data...</p>
            </div>
        `;
    }

    // Load saved cities from the server
    async function loadSavedCities() {
        try {
            const response = await fetch('/api/cities');
            
            if (!response.ok) {
                throw new Error('Failed to load saved cities');
            }
            
            savedCities = await response.json();
            renderSavedCities();
            
            // If there are saved cities but none is selected, select the first one
            if (savedCities.length > 0 && !currentCityId) {
                showWeatherForCity(savedCities[0].id);
            } else if (savedCities.length === 0) {
                // Show empty state if no cities
                showNoCitiesMessage();
            }
            
        } catch (error) {
            console.error('Error loading saved cities:', error);
            showError('Failed to load saved cities');
        }
    }

    // Render the list of saved cities
    function renderSavedCities() {
        if (!savedCitiesList) return;
        
        savedCitiesList.innerHTML = '';
        
        if (savedCities.length === 0) {
            showNoCitiesMessage();
            return;
        }
        
        savedCities.forEach(city => {
            const cityElement = document.createElement('div');
            cityElement.className = `list-group-item list-group-item-action ${city.id === currentCityId ? 'active' : ''}`;
            cityElement.innerHTML = `
                <div class="city-item">
                    <span class="city-name">${city.city_name}, ${city.country_code || ''}</span>
                    <button class="btn btn-link p-0 remove-city" data-city-id="${city.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Add click event to show weather for the city
            cityElement.addEventListener('click', (e) => {
                // Don't trigger if the remove button was clicked
                if (e.target.closest('.remove-city')) return;
                
                showWeatherForCity(city.id);
                // Update active state
                document.querySelectorAll('#savedCitiesList .list-group-item').forEach(item => {
                    item.classList.remove('active');
                });
                cityElement.classList.add('active');
            });
            
            // Add click event to remove the city
            const removeBtn = cityElement.querySelector('.remove-city');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeCity(city.id);
                });
            }
            
            savedCitiesList.appendChild(cityElement);
        });
    }

    // Show weather for a specific city
    async function showWeatherForCity(cityId) {
        try {
            // Show loading state
            showLoadingState();
            
            // Find the city in the saved cities
            const city = savedCities.find(c => c.id === cityId);
            
            if (!city) {
                throw new Error('City not found');
            }
            
            // Get weather data
            const weatherData = await getWeatherData(city.lat, city.lon, currentUnit, currentPreferredProvider);
            
            // Update current city ID
            currentCityId = cityId;
            
            // Render weather data
            renderWeather(city, weatherData);
            
        } catch (error) {
            console.error('Error showing weather for city:', error);
            showError('Failed to load weather data');
        }
    }

    // Get weather data from the selected provider
    async function getWeatherData(lat, lon, units = 'metric', preferredProvider = 'openweather') {
        try {
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}&units=${units}&provider=${preferredProvider}`);
            
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

    // Get city coordinates from OpenWeatherMap Geocoding API
    async function getCityCoordinates(cityName, countryCode = '') {
        try {
            const query = `${cityName}${countryCode ? ',' + countryCode : ''}`;
            const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to find city');
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error('City not found. Please check the city name and country code.');
            }
            
            // Return the first result
            return {
                name: data[0].name,
                country: data[0].country,
                lat: data[0].lat,
                lon: data[0].lon
            };
            
        } catch (error) {
            console.error('Error getting city coordinates:', error);
            throw error;
        }
    }

    // Render weather data to the UI with animations
    function renderWeather(location, weatherData) {
        const weatherMain = weatherData.weather[0].main.toLowerCase();
        const weatherIcon = getWeatherIcon(weatherData.weather[0].icon);
        const tempValue = Math.round(weatherData.main.temp);
        const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
        const windSpeedUnit = currentUnit === 'metric' ? 'm/s' : 'mph';
        
        // Generate weather background effect
        const weatherEffect = getWeatherEffect(weatherMain);
        
        const currentDate = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const weatherHTML = `
            <div class="weather-card">
                ${weatherEffect}
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <h3 class="city-name mb-0">${location.city_name || location.name}${location.country_code ? ', ' + location.country_code : (location.country ? ', ' + location.country : '')}</h3>
                        <small class="text-muted">${currentDate}</small>
                    </div>
                    <div class="weather-icon" style="font-size: 3rem; color: ${getWeatherColor(weatherMain)}">
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
                        ${getProviderSpecificButtons(location.lat, location.lon, weatherData.provider)}
                    </div>
                </div>
            </div>
            <div id="forecastSection" style="display: none;" class="mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5><i class="fas fa-calendar-week me-2"></i>Weather Forecast</h5>
                    <button class="btn btn-sm btn-outline-secondary" onclick="hideAllWeatherSections()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="forecastContent"></div>
            </div>
            <div id="airPollutionSection" style="display: none;" class="mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5><i class="fas fa-leaf me-2"></i>Air Quality Index</h5>
                    <button class="btn btn-sm btn-outline-secondary" onclick="hideAllWeatherSections()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="airPollutionContent"></div>
            </div>
            <div id="astronomySection" style="display: none;" class="mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5><i class="fas fa-moon me-2"></i>Astronomy Data</h5>
                    <button class="btn btn-sm btn-outline-secondary" onclick="hideAllWeatherSections()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="astronomyContent"></div>
            </div>
            <div id="marineSection" style="display: none;" class="mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5><i class="fas fa-anchor me-2"></i>Marine Weather</h5>
                    <button class="btn btn-sm btn-outline-secondary" onclick="hideAllWeatherSections()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="marineContent"></div>
            </div>
            <div id="historicalSection" style="display: none;" class="mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5><i class="fas fa-history me-2"></i>Historical Weather</h5>
                    <button class="btn btn-sm btn-outline-secondary" onclick="hideAllWeatherSections()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="historicalContent"></div>
            </div>
        `;
        
        weatherContent.innerHTML = weatherHTML;
        
        // Add weather animations after rendering
        if (weatherMain.includes('rain')) {
            addRainEffect();
        } else if (weatherMain.includes('snow')) {
            addSnowEffect();
        }
    }
    
    // Get weather background effect based on condition
    function getWeatherEffect(weatherMain) {
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
    
    // Get weather color based on condition
    function getWeatherColor(weatherMain) {
        if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) return '#4a90e2';
        if (weatherMain.includes('cloud')) return '#9e9e9e';
        if (weatherMain.includes('snow')) return '#b3d4f1';
        if (weatherMain.includes('thunder')) return '#6b46c1';
        if (weatherMain.includes('clear')) return '#f39c12';
        return '#0d6efd';
    }
    
    // Add rain animation effect
    function addRainEffect() {
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
        
        document.querySelector('.weather-card').appendChild(rainContainer);
    }
    
    // Add snow animation effect
    function addSnowEffect() {
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
        
        document.querySelector('.weather-card').appendChild(snowContainer);
    }

    // Toggle between Celsius and Fahrenheit
    async function toggleTemperatureUnit() {
        currentUnit = unitToggle.checked ? 'imperial' : 'metric';
        
        if (currentCityId) {
            await showWeatherForCity(currentCityId);
        }
    }

    // Remove a city from favorites
    async function removeCity(cityId) {
        try {
            const response = await fetch(`/api/cities/${cityId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove city');
            }
            
            // Update the UI
            savedCities = savedCities.filter(city => city.id !== cityId);
            renderSavedCities();
            
            // If the removed city was the current one, clear the weather display
            if (cityId === currentCityId) {
                currentCityId = null;
                weatherContent.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-cloud-sun fa-4x text-muted mb-3"></i>
                        <p class="text-muted">Select a city to view weather information</p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error removing city:', error);
            showError('Failed to remove city');
        }
    }

    // Show error message
    function showError(message) {
        weatherContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `;
    }

    // Show no cities message
    function showNoCitiesMessage() {
        savedCitiesList.innerHTML = `
            <div class="list-group-item text-center text-muted">
                No cities saved yet. Add a city to get started!
            </div>
        `;
    }

    // Get weather icon based on icon code (supports both OpenWeather and WeatherAPI)
    function getWeatherIcon(iconCode) {
        // Handle WeatherAPI icon URLs (extract filename)
        if (typeof iconCode === 'string' && iconCode.includes('/')) {
            iconCode = iconCode.split('/').pop().replace('.png', '');
        }
        
        const iconMap = {
            // OpenWeatherMap codes
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
            '50n': 'fas fa-smog',
            
            // WeatherAPI codes (common ones)
            '116': 'fas fa-cloud',           // Partly cloudy
            '119': 'fas fa-cloud',           // Cloudy
            '122': 'fas fa-cloud-meatball',  // Overcast
            '143': 'fas fa-smog',            // Mist
            '176': 'fas fa-cloud-rain',      // Patchy rain possible
            '179': 'fas fa-snowflake',       // Patchy snow possible
            '182': 'fas fa-cloud-rain',      // Patchy sleet possible
            '185': 'fas fa-cloud-rain',      // Patchy freezing drizzle possible
            '200': 'fas fa-bolt',            // Thundery outbreaks possible
            '227': 'fas fa-snowflake',       // Blowing snow
            '230': 'fas fa-snowflake',       // Blizzard
            '248': 'fas fa-smog',            // Fog
            '260': 'fas fa-smog',            // Freezing fog
            '263': 'fas fa-cloud-rain',      // Patchy light drizzle
            '266': 'fas fa-cloud-rain',      // Light drizzle
            '281': 'fas fa-cloud-rain',      // Freezing drizzle
            '284': 'fas fa-cloud-rain',      // Heavy freezing drizzle
            '293': 'fas fa-cloud-rain',      // Patchy light rain
            '296': 'fas fa-cloud-rain',      // Light rain
            '299': 'fas fa-cloud-rain',      // Moderate rain at times
            '302': 'fas fa-cloud-rain',      // Moderate rain
            '305': 'fas fa-cloud-rain',      // Heavy rain at times
            '308': 'fas fa-cloud-rain',      // Heavy rain
            '311': 'fas fa-cloud-rain',      // Light freezing rain
            '314': 'fas fa-cloud-rain',      // Moderate or heavy freezing rain
            '317': 'fas fa-cloud-rain',      // Light sleet
            '320': 'fas fa-cloud-rain',      // Moderate or heavy sleet
            '323': 'fas fa-snowflake',       // Patchy light snow
            '326': 'fas fa-snowflake',       // Light snow
            '329': 'fas fa-snowflake',       // Patchy moderate snow
            '332': 'fas fa-snowflake',       // Moderate snow
            '335': 'fas fa-snowflake',       // Patchy heavy snow
            '338': 'fas fa-snowflake',       // Heavy snow
            '350': 'fas fa-cloud-rain',      // Ice pellets
            '353': 'fas fa-cloud-rain',      // Light rain shower
            '356': 'fas fa-cloud-rain',      // Moderate or heavy rain shower
            '359': 'fas fa-cloud-rain',      // Torrential rain shower
            '362': 'fas fa-cloud-rain',      // Light sleet showers
            '365': 'fas fa-cloud-rain',      // Moderate or heavy sleet showers
            '368': 'fas fa-snowflake',       // Light snow showers
            '371': 'fas fa-snowflake',       // Moderate or heavy snow showers
            '374': 'fas fa-cloud-rain',      // Light showers of ice pellets
            '377': 'fas fa-cloud-rain',      // Moderate or heavy showers of ice pellets
            '386': 'fas fa-bolt',            // Patchy light rain with thunder
            '389': 'fas fa-bolt',            // Moderate or heavy rain with thunder
            '392': 'fas fa-bolt',            // Patchy light snow with thunder
            '395': 'fas fa-bolt'             // Moderate or heavy snow with thunder
        };
        
        const iconClass = iconMap[iconCode] || iconMap[iconCode?.toString()] || 'fas fa-cloud';
        return `<i class="${iconClass}"></i>`;
    }

    // Load forecast data
    window.loadForecast = async function(lat, lon) {
        try {
            const forecastSection = document.getElementById('forecastSection');
            const forecastContent = document.getElementById('forecastContent');
            
            // Show loading state
            forecastContent.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Loading forecast...</span>
                </div>
            `;
            forecastSection.style.display = 'block';
            
            // Get forecast data
            const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&provider=${currentPreferredProvider}`);
            if (!response.ok) {
                throw new Error('Failed to fetch forecast data');
            }
            
            const forecastData = await response.json();
            renderForecast(forecastData);
            
        } catch (error) {
            console.error('Error loading forecast:', error);
            const forecastContent = document.getElementById('forecastContent');
            forecastContent.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load forecast data. Please try again.
                </div>
            `;
        }
    };

    // Render forecast data
    function renderForecast(forecastData) {
        const forecastContent = document.getElementById('forecastContent');
        
        // Group forecast by days (take one forecast per day, preferably around noon)
        const dailyForecasts = [];
        const processedDays = new Set();
        
        // Set max days based on provider
        const maxDays = currentPreferredProvider === 'openmeteo' ? 7 : 5;
        
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            
            if (!processedDays.has(dayKey) && dailyForecasts.length < maxDays) {
                // Prefer forecasts around noon (12:00)
                const hour = date.getHours();
                if (hour >= 11 && hour <= 13) {
                    dailyForecasts.push(item);
                    processedDays.add(dayKey);
                } else if (!processedDays.has(dayKey) && dailyForecasts.length === processedDays.size) {
                    // If no noon forecast available, take the first one for this day
                    dailyForecasts.push(item);
                    processedDays.add(dayKey);
                }
            }
        });
        
        const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
        
        let forecastHTML = '<div class="row">';
        
        dailyForecasts.forEach((forecast, index) => {
            const date = new Date(forecast.dt * 1000);
            const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
            const weatherIcon = getWeatherIcon(forecast.weather[0].icon);
            const temp = Math.round(forecast.main.temp);
            const tempMax = Math.round(forecast.main.temp_max);
            const tempMin = Math.round(forecast.main.temp_min);
            
            forecastHTML += `
                <div class="col-md-2 col-sm-4 col-6 mb-3">
                    <div class="card forecast-card h-100 text-center">
                        <div class="card-body p-2">
                            <h6 class="card-title mb-2">${dayName}</h6>
                            <div class="weather-icon mb-2" style="font-size: 2rem; color: ${getWeatherColor(forecast.weather[0].main.toLowerCase())}">
                                ${weatherIcon}
                            </div>
                            <div class="temperature mb-1">
                                <strong>${temp}${tempUnit}</strong>
                            </div>
                            <div class="temp-range">
                                <small class="text-muted">
                                    ${tempMax}° / ${tempMin}°
                                </small>
                            </div>
                            <div class="weather-desc mt-1">
                                <small>${forecast.weather[0].description}</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        forecastHTML += '</div>';
        forecastContent.innerHTML = forecastHTML;
    }

    // Get provider-specific buttons based on current weather provider
    function getProviderSpecificButtons(lat, lon, provider) {
        let buttons = '';
        
        if (provider === 'OpenWeatherMap') {
            // OpenWeather API features
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>5-Day Forecast
                </button>
                <button class="btn btn-outline-success btn-sm" onclick="toggleWeatherSection('airPollution', ${lat}, ${lon})">
                    <i class="fas fa-leaf me-1"></i>Air Quality
                </button>
                <button class="btn btn-outline-info btn-sm" onclick="toggleWeatherSection('weatherMap', ${lat}, ${lon})">
                    <i class="fas fa-map me-1"></i>Weather Map
                </button>
            `;
        } else if (provider === 'WeatherAPI') {
            // WeatherAPI features
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>3-Day Forecast
                </button>
                <button class="btn btn-outline-info btn-sm" onclick="toggleWeatherSection('astronomy', ${lat}, ${lon})">
                    <i class="fas fa-moon me-1"></i>Astronomy
                </button>
                <button class="btn btn-outline-warning btn-sm" onclick="toggleWeatherSection('marine', ${lat}, ${lon})">
                    <i class="fas fa-anchor me-1"></i>Marine Weather
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="toggleWeatherSection('historical', ${lat}, ${lon})">
                    <i class="fas fa-history me-1"></i>Historical (7 days)
                </button>
            `;
        } else if (provider === 'Open-Meteo') {
            // Open-Meteo features
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>7-Day Forecast
                </button>
                <button class="btn btn-outline-warning btn-sm" onclick="toggleWeatherSection('marine', ${lat}, ${lon})">
                    <i class="fas fa-anchor me-1"></i>Marine Weather
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="toggleWeatherSection('historical', ${lat}, ${lon})">
                    <i class="fas fa-history me-1"></i>Historical Weather
                </button>
            `;
        } else {
            // Fallback - show all options
            buttons = `
                <button class="btn btn-outline-primary btn-sm" onclick="toggleWeatherSection('forecast', ${lat}, ${lon})">
                    <i class="fas fa-calendar-alt me-1"></i>Forecast
                </button>
                <button class="btn btn-outline-success btn-sm" onclick="toggleWeatherSection('airPollution', ${lat}, ${lon})">
                    <i class="fas fa-leaf me-1"></i>Air Quality
                </button>
                <button class="btn btn-outline-info btn-sm" onclick="toggleWeatherSection('astronomy', ${lat}, ${lon})">
                    <i class="fas fa-moon me-1"></i>Astronomy
                </button>
            `;
        }
        
        return buttons;
    }

    // Toggle weather sections (hide others, show selected)
    window.toggleWeatherSection = function(sectionType, lat, lon) {
        // Hide all sections first
        const sections = ['forecastSection', 'airPollutionSection', 'astronomySection', 'marineSection', 'historicalSection', 'weatherMapSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.style.display = 'none';
        });
        
        // Load and show the requested section
        switch(sectionType) {
            case 'forecast':
                loadForecast(lat, lon);
                break;
            case 'airPollution':
                loadAirPollution(lat, lon);
                break;
            case 'astronomy':
                loadAstronomy(lat, lon);
                break;
            case 'marine':
                loadMarineWeather(lat, lon);
                break;
            case 'historical':
                showHistoricalOptions(lat, lon);
                break;
            case 'weatherMap':
                loadWeatherMap(lat, lon);
                break;
        }
    };

    // Hide all weather sections
    window.hideAllWeatherSections = function() {
        const sections = ['forecastSection', 'airPollutionSection', 'astronomySection', 'marineSection', 'historicalSection', 'weatherMapSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.style.display = 'none';
        });
    };

    // Load weather map
    window.loadWeatherMap = async function(lat, lon) {
        try {
            const mapSection = document.getElementById('weatherMapSection');
            const mapContent = document.getElementById('weatherMapContent');
            
            mapContent.innerHTML = `<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-info"></div><span class="ms-2">Loading weather map...</span></div>`;
            mapSection.style.display = 'block';
            
            // Get API key for weather map
            const response = await fetch(`/api/weather-map-key`);
            if (!response.ok) throw new Error('Failed to get weather map API key');
            
            const { apiKey } = await response.json();
            
            // Initialize weather map
            initializeWeatherMap(lat, lon, apiKey);
        } catch (error) {
            console.error('Error loading weather map:', error);
            document.getElementById('weatherMapContent').innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Weather map unavailable (OpenWeather API required)</div>`;
        }
    };

    // Initialize weather map
    function initializeWeatherMap(lat, lon, apiKey) {
        const mapContent = document.getElementById('weatherMapContent');
        
        // Create map container
        mapContent.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">Weather Map Layer:</label>
                        <select class="form-select" id="mapLayerSelect" onchange="updateWeatherMapLayer()">
                            <option value="temp_new">Temperature</option>
                            <option value="precipitation_new">Precipitation</option>
                            <option value="wind_new">Wind Speed</option>
                            <option value="pressure_new">Pressure</option>
                        </select>
                    </div>
                    <div id="weatherMap" style="height: 400px; border-radius: 8px;"></div>
                    <div class="mt-2 text-muted small">
                        <i class="fas fa-info-circle me-1"></i>
                        Interactive weather map powered by OpenWeatherMap. Click and drag to pan, scroll to zoom.
                    </div>
                </div>
            </div>
        `;
        
        // Load Leaflet library
        if (typeof L === 'undefined') {
            const leafletScript = document.createElement('script');
            leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            leafletScript.onload = () => {
                const leafletCSS = document.createElement('link');
                leafletCSS.rel = 'stylesheet';
                leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(leafletCSS);
                
                setTimeout(() => createWeatherMap(lat, lon, apiKey), 100);
            };
            document.head.appendChild(leafletScript);
        } else {
            createWeatherMap(lat, lon, apiKey);
        }
    }

    // Create weather map
    function createWeatherMap(lat, lon, apiKey) {
        // Initialize map
        const map = L.map('weatherMap').setView([lat, lon], 8);
        
        // Add OpenWeatherMap weather layer
        const weatherLayer = L.tileLayer(`https://maps.openweathermap.org/maps/2.0/weather/{op}/{z}/{x}/{y}?appid=${apiKey}`, {
            maxZoom: 18,
            attribution: 'Weather data © OpenWeatherMap',
            op: 'temp_new' // Default layer
        }).addTo(map);
        
        // Store map reference for layer updates
        window.currentWeatherMap = map;
        window.currentWeatherLayer = weatherLayer;
    }

    // Update weather map layer
    window.updateWeatherMapLayer = function() {
        if (window.currentWeatherLayer) {
            const layerSelect = document.getElementById('mapLayerSelect');
            const selectedLayer = layerSelect.value;
            
            // Update layer URL with new operation
            const currentUrl = window.currentWeatherLayer._url;
            const newUrl = currentUrl.replace(/op=\w+/, `op=${selectedLayer}`);
            
            window.currentWeatherLayer.setUrl(newUrl);
        }
    };

    // Load air pollution data
    window.loadAirPollution = async function(lat, lon) {
        try {
            const airSection = document.getElementById('airPollutionSection');
            const airContent = document.getElementById('airPollutionContent');
            
            airContent.innerHTML = `<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-success"></div><span class="ms-2">Loading air quality...</span></div>`;
            airSection.style.display = 'block';
            
            const response = await fetch(`/api/air-pollution?lat=${lat}&lon=${lon}`);
            if (!response.ok) throw new Error('Failed to fetch air pollution data');
            
            const airData = await response.json();
            renderAirPollution(airData);
        } catch (error) {
            console.error('Error loading air pollution:', error);
            document.getElementById('airPollutionContent').innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Air quality data unavailable (OpenWeather API required)</div>`;
        }
    };

    // Load astronomy data
    window.loadAstronomy = async function(lat, lon) {
        try {
            const astroSection = document.getElementById('astronomySection');
            const astroContent = document.getElementById('astronomyContent');
            
            astroContent.innerHTML = `<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-info"></div><span class="ms-2">Loading astronomy data...</span></div>`;
            astroSection.style.display = 'block';
            
            const response = await fetch(`/api/astronomy?lat=${lat}&lon=${lon}`);
            if (!response.ok) throw new Error('Failed to fetch astronomy data');
            
            const astroData = await response.json();
            renderAstronomy(astroData);
        } catch (error) {
            console.error('Error loading astronomy:', error);
            document.getElementById('astronomyContent').innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Astronomy data unavailable (WeatherAPI required)</div>`;
        }
    };

    // Load marine weather data
    window.loadMarineWeather = async function(lat, lon) {
        try {
            const marineSection = document.getElementById('marineSection');
            const marineContent = document.getElementById('marineContent');
            
            marineContent.innerHTML = `<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-warning"></div><span class="ms-2">Loading marine weather...</span></div>`;
            marineSection.style.display = 'block';
            
            const response = await fetch(`/api/marine?lat=${lat}&lon=${lon}`);
            if (!response.ok) throw new Error('Failed to fetch marine weather data');
            
            const marineData = await response.json();
            renderMarineWeather(marineData);
        } catch (error) {
            console.error('Error loading marine weather:', error);
            document.getElementById('marineContent').innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Marine weather unavailable (WeatherAPI required)</div>`;
        }
    };

    // Show historical weather options
    window.showHistoricalOptions = function(lat, lon) {
        const historicalSection = document.getElementById('historicalSection');
        const historicalContent = document.getElementById('historicalContent');
        
        // Create date picker for last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        let dateOptions = '';
        for (let i = 1; i <= 7; i++) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const displayDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            dateOptions += `<option value="${dateStr}">${displayDate}</option>`;
        }
        
        historicalContent.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h6>Select a date from the past 7 days:</h6>
                    <div class="input-group">
                        <select class="form-select" id="historicalDateSelect">
                            <option value="">Choose a date...</option>
                            ${dateOptions}
                        </select>
                        <button class="btn btn-outline-secondary" onclick="loadHistoricalWeather(${lat}, ${lon})">
                            <i class="fas fa-search me-1"></i>Load
                        </button>
                    </div>
                </div>
            </div>
        `;
        historicalSection.style.display = 'block';
    };

    // Load historical weather data
    window.loadHistoricalWeather = async function(lat, lon) {
        try {
            const dateSelect = document.getElementById('historicalDateSelect');
            const selectedDate = dateSelect.value;
            
            if (!selectedDate) {
                alert('Please select a date first');
                return;
            }
            
            const historicalContent = document.getElementById('historicalContent');
            historicalContent.innerHTML = `<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-secondary"></div><span class="ms-2">Loading historical data...</span></div>`;
            
            const response = await fetch(`/api/historical?lat=${lat}&lon=${lon}&date=${selectedDate}`);
            if (!response.ok) throw new Error('Failed to fetch historical weather data');
            
            const historicalData = await response.json();
            renderHistoricalWeather(historicalData);
        } catch (error) {
            console.error('Error loading historical weather:', error);
            document.getElementById('historicalContent').innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Historical weather unavailable (WeatherAPI required)</div>`;
        }
    };

    // Render air pollution data
    function renderAirPollution(airData) {
        const airContent = document.getElementById('airPollutionContent');
        const { aqi, aqiLabel, components } = airData;
        
        const airHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="text-center mb-3">
                                <div class="aqi-circle" style="background-color: ${aqiLabel.color}; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;">
                                    ${aqi}
                                </div>
                                <h6 class="mt-2">${aqiLabel.label}</h6>
                                <small class="text-muted">Air Quality Index</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6>Pollutant Levels (μg/m³):</h6>
                            <div class="row">
                                <div class="col-6">
                                    <small><strong>CO:</strong> ${components.co}</small><br>
                                    <small><strong>NO₂:</strong> ${components.no2}</small><br>
                                    <small><strong>O₃:</strong> ${components.o3}</small><br>
                                    <small><strong>SO₂:</strong> ${components.so2}</small>
                                </div>
                                <div class="col-6">
                                    <small><strong>PM2.5:</strong> ${components.pm2_5}</small><br>
                                    <small><strong>PM10:</strong> ${components.pm10}</small><br>
                                    <small><strong>NH₃:</strong> ${components.nh3}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        airContent.innerHTML = airHTML;
    }

    // Render astronomy data
    function renderAstronomy(astroData) {
        const astroContent = document.getElementById('astronomyContent');
        
        const astroHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6><i class="fas fa-sun text-warning"></i> Sun</h6>
                            <p><strong>Sunrise:</strong> ${astroData.sunrise}</p>
                            <p><strong>Sunset:</strong> ${astroData.sunset}</p>
                            <p><strong>Sun Status:</strong> ${astroData.is_sun_up ? 'Up ☀️' : 'Down 🌙'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6><i class="fas fa-moon text-info"></i> Moon</h6>
                            <p><strong>Moonrise:</strong> ${astroData.moonrise}</p>
                            <p><strong>Moonset:</strong> ${astroData.moonset}</p>
                            <p><strong>Phase:</strong> ${astroData.moon_phase}</p>
                            <p><strong>Illumination:</strong> ${astroData.moon_illumination}%</p>
                            <p><strong>Moon Status:</strong> ${astroData.is_moon_up ? 'Up 🌙' : 'Down'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        astroContent.innerHTML = astroHTML;
    }

    // Render marine weather data
    function renderMarineWeather(marineData) {
        const marineContent = document.getElementById('marineContent');
        const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
        const windUnit = currentUnit === 'metric' ? 'kph' : 'mph';
        
        const marineHTML = `
            <div class="card">
                <div class="card-body">
                    <h6>Marine Conditions for ${marineData.date}</h6>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p><strong>Max Temp:</strong> ${currentUnit === 'metric' ? marineData.marine_day.maxtemp_c : marineData.marine_day.maxtemp_f}${tempUnit}</p>
                            <p><strong>Min Temp:</strong> ${currentUnit === 'metric' ? marineData.marine_day.mintemp_c : marineData.marine_day.mintemp_f}${tempUnit}</p>
                            <p><strong>Avg Temp:</strong> ${currentUnit === 'metric' ? marineData.marine_day.avgtemp_c : marineData.marine_day.avgtemp_f}${tempUnit}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Max Wind:</strong> ${currentUnit === 'metric' ? marineData.marine_day.maxwind_kph : marineData.marine_day.maxwind_mph} ${windUnit}</p>
                            <p><strong>Condition:</strong> ${marineData.marine_day.condition.text}</p>
                        </div>
                    </div>
                    <small class="text-muted">Note: Marine weather provides detailed hourly conditions for coastal and offshore areas</small>
                </div>
            </div>
        `;
        
        marineContent.innerHTML = marineHTML;
    }

    // Render historical weather data
    function renderHistoricalWeather(historicalData) {
        const historicalContent = document.getElementById('historicalContent');
        const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
        const windUnit = currentUnit === 'metric' ? 'kph' : 'mph';
        
        const historicalHTML = `
            <div class="card">
                <div class="card-body">
                    <h6>Weather on ${new Date(historicalData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Max Temp:</strong> ${currentUnit === 'metric' ? historicalData.day.maxtemp_c : historicalData.day.maxtemp_f}${tempUnit}</p>
                            <p><strong>Min Temp:</strong> ${currentUnit === 'metric' ? historicalData.day.mintemp_c : historicalData.day.mintemp_f}${tempUnit}</p>
                            <p><strong>Avg Temp:</strong> ${currentUnit === 'metric' ? historicalData.day.avgtemp_c : historicalData.day.avgtemp_f}${tempUnit}</p>
                            <p><strong>Condition:</strong> ${historicalData.day.condition.text}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Max Wind:</strong> ${currentUnit === 'metric' ? historicalData.day.maxwind_kph : historicalData.day.maxwind_mph} ${windUnit}</p>
                            <p><strong>Total Precip:</strong> ${currentUnit === 'metric' ? historicalData.day.totalprecip_mm + ' mm' : historicalData.day.totalprecip_in + ' in'}</p>
                            <p><strong>Avg Humidity:</strong> ${historicalData.day.avghumidity}%</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        historicalContent.innerHTML = historicalHTML;
    }

    // Initialize the app
    init();
});
