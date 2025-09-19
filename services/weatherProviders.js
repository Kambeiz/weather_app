const axios = require('axios');
require('dotenv').config();

// Weather provider configurations
const providers = {
    openweather: {
        name: 'OpenWeatherMap',
        apiKey: process.env.OPENWEATHER_API_KEY,
        baseUrl: 'https://api.openweathermap.org',
        getWeather: async function(lat, lon, units = 'metric') {
            try {
                const response = await axios.get(`${this.baseUrl}/data/2.5/weather`, {
                    params: {
                        lat,
                        lon,
                        units,
                        appid: this.apiKey,
                    },
                });
                
                return standardizeWeatherData(response.data, 'openweather');
            } catch (error) {
                console.error('OpenWeatherMap API error:', error);
                throw new Error('OpenWeatherMap service unavailable');
            }
        },
        getForecast: async function(lat, lon, units = 'metric') {
            try {
                const response = await axios.get(`${this.baseUrl}/data/2.5/forecast`, {
                    params: {
                        lat,
                        lon,
                        appid: this.apiKey,
                        units
                    }
                });
                
                return standardizeForecastData(response.data, 'openweather');
            } catch (error) {
                console.error('OpenWeatherMap Forecast API error:', error);
                throw new Error('OpenWeatherMap forecast service unavailable');
            }
        },
        getAirPollution: async function(lat, lon) {
            try {
                const response = await axios.get(`${this.baseUrl}/data/2.5/air_pollution`, {
                    params: {
                        lat,
                        lon,
                        appid: this.apiKey
                    }
                });
                
                return standardizeAirPollutionData(response.data);
            } catch (error) {
                console.error('OpenWeatherMap Air Pollution API error:', error);
                throw new Error('Air pollution data unavailable');
            }
        }
    },
    
    weatherapi: {
        name: 'WeatherAPI',
        apiKey: process.env.WEATHERAPI_KEY,
        baseUrl: 'https://api.weatherapi.com/v1',
        getWeather: async function(lat, lon, units = 'metric') {
            try {
                const response = await axios.get(`${this.baseUrl}/current.json`, {
                    params: {
                        key: this.apiKey,
                        q: `${lat},${lon}`,
                    },
                });
                
                return standardizeWeatherData(response.data, 'weatherapi', units);
            } catch (error) {
                console.error('WeatherAPI error:', error);
                throw new Error('Failed to fetch weather from WeatherAPI');
            }
        },
        getForecast: async function(lat, lon, units = 'metric') {
            try {
                const response = await axios.get(`${this.baseUrl}/forecast.json`, {
                    params: {
                        key: this.apiKey,
                        q: `${lat},${lon}`,
                        days: 3
                    },
                });
                
                return standardizeForecastData(response.data, 'weatherapi');
            } catch (error) {
                console.error('WeatherAPI Forecast error:', error);
                throw new Error('WeatherAPI forecast service unavailable');
            }
        },
        getMarineWeather: async function(lat, lon) {
            try {
                const response = await axios.get(`${this.baseUrl}/marine.json`, {
                    params: {
                        key: this.apiKey,
                        q: `${lat},${lon}`,
                        days: 1
                    },
                });
                
                return standardizeMarineData(response.data);
            } catch (error) {
                console.error('WeatherAPI Marine error:', error);
                throw new Error('Marine weather data unavailable');
            }
        },
        getHistoricalWeather: async function(lat, lon, date) {
            try {
                const response = await axios.get(`${this.baseUrl}/history.json`, {
                    params: {
                        key: this.apiKey,
                        q: `${lat},${lon}`,
                        dt: date // Format: YYYY-MM-DD
                    },
                });
                
                return standardizeHistoricalData(response.data);
            } catch (error) {
                console.error('WeatherAPI Historical error:', error);
                throw new Error('Historical weather data unavailable');
            }
        },
        getAstronomy: async function(lat, lon, date) {
            try {
                const response = await axios.get(`${this.baseUrl}/astronomy.json`, {
                    params: {
                        key: this.apiKey,
                        q: `${lat},${lon}`,
                        dt: date || new Date().toISOString().split('T')[0]
                    },
                });
                
                return standardizeAstronomyData(response.data);
            } catch (error) {
                console.error('WeatherAPI Astronomy error:', error);
                throw new Error('Astronomy data unavailable');
            }
        }
    }
};

/**
 * Standardize weather data from different providers to a common format
 */
function standardizeWeatherData(data, provider, units = 'metric') {
    let standardized = {};
    
    if (provider === 'openweather') {
        standardized = data;
    } else if (provider === 'weatherapi') {
        const current = data.current;
        const location = data.location;
        
        const tempC = current.temp_c;
        const tempF = current.temp_f;
        const feelsLikeC = current.feelslike_c;
        const feelsLikeF = current.feelslike_f;
        
        standardized = {
            coord: {
                lon: location.lon,
                lat: location.lat
            },
            weather: [{
                id: current.condition.code,
                main: current.condition.text,
                description: current.condition.text,
                icon: current.condition.icon.split('/').pop().replace('.png', '')
            }],
            main: {
                temp: units === 'metric' ? tempC : tempF,
                feels_like: units === 'metric' ? feelsLikeC : feelsLikeF,
                temp_min: units === 'metric' ? tempC : tempF,
                temp_max: units === 'metric' ? tempC : tempF,
                pressure: current.pressure_mb,
                humidity: current.humidity
            },
            visibility: current.vis_km * 1000,
            wind: {
                speed: units === 'metric' ? current.wind_kph / 3.6 : current.wind_mph,
                deg: current.wind_degree
            },
            name: location.name,
            sys: {
                country: location.country
            }
        };
    }
    
    return standardized;
}

/**
 * Standardize forecast data from different providers
 */
function standardizeForecastData(data, provider) {
    let standardized = { list: [] };
    
    if (provider === 'openweather') {
        standardized = data;
    } else if (provider === 'weatherapi') {
        const forecastDays = data.forecast.forecastday;
        
        forecastDays.forEach(day => {
            day.hour.forEach(hour => {
                standardized.list.push({
                    dt: new Date(hour.time).getTime() / 1000,
                    main: {
                        temp: hour.temp_c,
                        feels_like: hour.feelslike_c,
                        temp_min: hour.temp_c,
                        temp_max: hour.temp_c,
                        pressure: hour.pressure_mb,
                        humidity: hour.humidity
                    },
                    weather: [{
                        id: hour.condition.code,
                        main: hour.condition.text,
                        description: hour.condition.text,
                        icon: hour.condition.icon.split('/').pop().replace('.png', '')
                    }],
                    wind: {
                        speed: hour.wind_kph / 3.6,
                        deg: hour.wind_degree
                    },
                    visibility: hour.vis_km * 1000,
                    dt_txt: hour.time
                });
            });
        });
    }
    
    return standardized;
}

/**
 * Standardize air pollution data from OpenWeather
 */
function standardizeAirPollutionData(data) {
    const aqi = data.list[0];
    const components = aqi.components;
    
    // Air Quality Index: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    const aqiLabels = {
        1: { label: 'Good', color: '#00e400' },
        2: { label: 'Fair', color: '#ffff00' },
        3: { label: 'Moderate', color: '#ff7e00' },
        4: { label: 'Poor', color: '#ff0000' },
        5: { label: 'Very Poor', color: '#8f3f97' }
    };
    
    return {
        aqi: aqi.main.aqi,
        aqiLabel: aqiLabels[aqi.main.aqi],
        components: {
            co: components.co,      // Carbon monoxide (μg/m³)
            no: components.no,      // Nitric oxide (μg/m³)
            no2: components.no2,    // Nitrogen dioxide (μg/m³)
            o3: components.o3,      // Ozone (μg/m³)
            so2: components.so2,    // Sulphur dioxide (μg/m³)
            pm2_5: components.pm2_5, // Fine particles matter (μg/m³)
            pm10: components.pm10,   // Coarse particulate matter (μg/m³)
            nh3: components.nh3     // Ammonia (μg/m³)
        },
        timestamp: aqi.dt
    };
}

/**
 * Standardize marine weather data from WeatherAPI
 */
function standardizeMarineData(data) {
    const marine = data.forecast.forecastday[0];
    const hourlyMarine = marine.hour.map(hour => ({
        time: hour.time,
        temp_c: hour.temp_c,
        temp_f: hour.temp_f,
        condition: hour.condition,
        wind_mph: hour.wind_mph,
        wind_kph: hour.wind_kph,
        wind_degree: hour.wind_degree,
        wind_dir: hour.wind_dir,
        pressure_mb: hour.pressure_mb,
        pressure_in: hour.pressure_in,
        humidity: hour.humidity,
        cloud: hour.cloud,
        vis_km: hour.vis_km,
        vis_miles: hour.vis_miles,
        gust_mph: hour.gust_mph,
        gust_kph: hour.gust_kph
    }));
    
    return {
        location: data.location,
        date: marine.date,
        marine_hourly: hourlyMarine,
        marine_day: {
            maxtemp_c: marine.day.maxtemp_c,
            maxtemp_f: marine.day.maxtemp_f,
            mintemp_c: marine.day.mintemp_c,
            mintemp_f: marine.day.mintemp_f,
            avgtemp_c: marine.day.avgtemp_c,
            avgtemp_f: marine.day.avgtemp_f,
            maxwind_mph: marine.day.maxwind_mph,
            maxwind_kph: marine.day.maxwind_kph,
            condition: marine.day.condition
        }
    };
}

/**
 * Standardize historical weather data from WeatherAPI
 */
function standardizeHistoricalData(data) {
    const historical = data.forecast.forecastday[0];
    
    return {
        location: data.location,
        date: historical.date,
        day: {
            maxtemp_c: historical.day.maxtemp_c,
            maxtemp_f: historical.day.maxtemp_f,
            mintemp_c: historical.day.mintemp_c,
            mintemp_f: historical.day.mintemp_f,
            avgtemp_c: historical.day.avgtemp_c,
            avgtemp_f: historical.day.avgtemp_f,
            maxwind_mph: historical.day.maxwind_mph,
            maxwind_kph: historical.day.maxwind_kph,
            totalprecip_mm: historical.day.totalprecip_mm,
            totalprecip_in: historical.day.totalprecip_in,
            avghumidity: historical.day.avghumidity,
            condition: historical.day.condition
        },
        hourly: historical.hour.map(hour => ({
            time: hour.time,
            temp_c: hour.temp_c,
            temp_f: hour.temp_f,
            condition: hour.condition,
            wind_mph: hour.wind_mph,
            wind_kph: hour.wind_kph,
            wind_degree: hour.wind_degree,
            wind_dir: hour.wind_dir,
            pressure_mb: hour.pressure_mb,
            precip_mm: hour.precip_mm,
            humidity: hour.humidity,
            cloud: hour.cloud,
            feelslike_c: hour.feelslike_c,
            feelslike_f: hour.feelslike_f
        }))
    };
}

/**
 * Standardize astronomy data from WeatherAPI
 */
function standardizeAstronomyData(data) {
    const astro = data.astronomy.astro;
    
    return {
        location: data.location,
        date: data.location.localtime.split(' ')[0],
        sunrise: astro.sunrise,
        sunset: astro.sunset,
        moonrise: astro.moonrise,
        moonset: astro.moonset,
        moon_phase: astro.moon_phase,
        moon_illumination: astro.moon_illumination,
        is_moon_up: astro.is_moon_up,
        is_sun_up: astro.is_sun_up
    };
}

// Get weather data with fallback
async function getWeatherData(lat, lon, units = 'metric', preferredProvider = 'openweather') {
    const providerOrder = preferredProvider === 'weatherapi' 
        ? ['weatherapi', 'openweather'] 
        : ['openweather', 'weatherapi'];
    
    for (const providerName of providerOrder) {
        try {
            const provider = providers[providerName];
            if (!provider || !provider.apiKey) {
                console.log(`${providerName} not configured, skipping...`);
                continue;
            }
            
            const weatherData = await provider.getWeather(lat, lon, units);
            weatherData.provider = provider.name;
            return weatherData;
        } catch (error) {
            console.error(`${providerName} failed:`, error.message);
            continue;
        }
    }
    
    throw new Error('All weather providers failed');
}

// Get forecast data with fallback
async function getForecastData(lat, lon, units = 'metric', preferredProvider = 'openweather') {
    const providerOrder = preferredProvider === 'weatherapi' 
        ? ['weatherapi', 'openweather'] 
        : ['openweather', 'weatherapi'];
    
    for (const providerName of providerOrder) {
        try {
            const provider = providers[providerName];
            if (!provider || !provider.apiKey || !provider.getForecast) {
                console.log(`${providerName} forecast not configured, skipping...`);
                continue;
            }
            
            const forecastData = await provider.getForecast(lat, lon, units);
            forecastData.provider = provider.name;
            return forecastData;
        } catch (error) {
            console.error(`${providerName} forecast failed:`, error.message);
            continue;
        }
    }
    
    throw new Error('All forecast providers failed');
}

// Get air pollution data (OpenWeather only)
async function getAirPollutionData(lat, lon) {
    try {
        const provider = providers.openweather;
        if (!provider || !provider.apiKey) {
            throw new Error('OpenWeather API key not configured');
        }
        
        return await provider.getAirPollution(lat, lon);
    } catch (error) {
        console.error('Air pollution data failed:', error.message);
        throw error;
    }
}

// Get marine weather data (WeatherAPI only)
async function getMarineWeatherData(lat, lon) {
    try {
        const provider = providers.weatherapi;
        if (!provider || !provider.apiKey) {
            throw new Error('WeatherAPI key not configured');
        }
        
        return await provider.getMarineWeather(lat, lon);
    } catch (error) {
        console.error('Marine weather data failed:', error.message);
        throw error;
    }
}

// Get historical weather data (WeatherAPI only)
async function getHistoricalWeatherData(lat, lon, date) {
    try {
        const provider = providers.weatherapi;
        if (!provider || !provider.apiKey) {
            throw new Error('WeatherAPI key not configured');
        }
        
        return await provider.getHistoricalWeather(lat, lon, date);
    } catch (error) {
        console.error('Historical weather data failed:', error.message);
        throw error;
    }
}

// Get astronomy data (WeatherAPI only)
async function getAstronomyData(lat, lon, date) {
    try {
        const provider = providers.weatherapi;
        if (!provider || !provider.apiKey) {
            throw new Error('WeatherAPI key not configured');
        }
        
        return await provider.getAstronomy(lat, lon, date);
    } catch (error) {
        console.error('Astronomy data failed:', error.message);
        throw error;
    }
}

module.exports = {
    providers,
    getWeatherData,
    getForecastData,
    getAirPollutionData,
    getMarineWeatherData,
    getHistoricalWeatherData,
    getAstronomyData
};
