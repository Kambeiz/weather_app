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
    },
    
    openmeteo: {
        name: 'Open-Meteo',
        apiKey: null, // No API key required
        baseUrl: 'https://api.open-meteo.com/v1',
        marineUrl: 'https://marine-api.open-meteo.com/v1',
        historicalUrl: 'https://archive-api.open-meteo.com/v1',
        getWeather: async function(lat, lon, units = 'metric') {
            try {
                const response = await axios.get(`${this.baseUrl}/forecast`, {
                    params: {
                        latitude: lat,
                        longitude: lon,
                        current_weather: true,
                        temperature_unit: units === 'metric' ? 'celsius' : 'fahrenheit',
                        windspeed_unit: units === 'metric' ? 'ms' : 'mph',
                        precipitation_unit: units === 'metric' ? 'mm' : 'inch',
                        timezone: 'auto',
                        hourly: 'temperature_2m,relativehumidity_2m,apparent_temperature,precipitation,weathercode,pressure_msl,visibility,windspeed_10m,winddirection_10m'
                    }
                });
                
                return standardizeWeatherData(response.data, 'openmeteo', units);
            } catch (error) {
                console.error('Open-Meteo API error:', error);
                throw new Error('Open-Meteo service unavailable');
            }
        },
        getForecast: async function(lat, lon, units = 'metric') {
            try {
                const response = await axios.get(`${this.baseUrl}/forecast`, {
                    params: {
                        latitude: lat,
                        longitude: lon,
                        temperature_unit: units === 'metric' ? 'celsius' : 'fahrenheit',
                        windspeed_unit: units === 'metric' ? 'ms' : 'mph',
                        precipitation_unit: units === 'metric' ? 'mm' : 'inch',
                        timezone: 'auto',
                        forecast_days: 7,
                        hourly: 'temperature_2m,relativehumidity_2m,apparent_temperature,precipitation,weathercode,pressure_msl,visibility,windspeed_10m,winddirection_10m'
                    }
                });
                
                return standardizeForecastData(response.data, 'openmeteo');
            } catch (error) {
                console.error('Open-Meteo Forecast API error:', error);
                throw new Error('Open-Meteo forecast service unavailable');
            }
        },
        getMarineWeather: async function(lat, lon) {
            try {
                const response = await axios.get(`${this.marineUrl}/marine`, {
                    params: {
                        latitude: lat,
                        longitude: lon,
                        timezone: 'auto',
                        hourly: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period'
                    }
                });
                
                return standardizeMarineDataOpenMeteo(response.data);
            } catch (error) {
                console.error('Open-Meteo Marine API error:', error);
                throw new Error('Marine weather data unavailable');
            }
        },
        getHistoricalWeather: async function(lat, lon, date) {
            try {
                // Calculate start and end date (single day)
                const startDate = date;
                const endDate = date;
                
                const response = await axios.get(`${this.historicalUrl}/archive`, {
                    params: {
                        latitude: lat,
                        longitude: lon,
                        start_date: startDate,
                        end_date: endDate,
                        timezone: 'auto',
                        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
                        hourly: 'temperature_2m,relativehumidity_2m,precipitation,weathercode,pressure_msl,windspeed_10m,winddirection_10m'
                    }
                });
                
                return standardizeHistoricalDataOpenMeteo(response.data, date);
            } catch (error) {
                console.error('Open-Meteo Historical API error:', error);
                throw new Error('Historical weather data unavailable');
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
    } else if (provider === 'openmeteo') {
        const current = data.current_weather;
        const hourlyData = data.hourly;
        const currentIndex = hourlyData.time.findIndex(time => 
            new Date(time).getTime() >= new Date(current.time).getTime()
        ) || 0;
        
        // Map Open-Meteo weather codes to descriptive text
        const weatherCodeMap = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            56: 'Light freezing drizzle',
            57: 'Dense freezing drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        
        // Map weather codes to OpenWeatherMap-like icon codes
        const weatherIconMap = {
            0: '01d', // Clear sky
            1: '02d', // Mainly clear
            2: '03d', // Partly cloudy
            3: '04d', // Overcast
            45: '50d', // Fog
            48: '50d', // Depositing rime fog
            51: '09d', // Light drizzle
            53: '09d', // Moderate drizzle
            55: '09d', // Dense drizzle
            56: '09d', // Light freezing drizzle
            57: '09d', // Dense freezing drizzle
            61: '10d', // Slight rain
            63: '10d', // Moderate rain
            65: '10d', // Heavy rain
            66: '10d', // Light freezing rain
            67: '10d', // Heavy freezing rain
            71: '13d', // Slight snow fall
            73: '13d', // Moderate snow fall
            75: '13d', // Heavy snow fall
            77: '13d', // Snow grains
            80: '10d', // Slight rain showers
            81: '10d', // Moderate rain showers
            82: '10d', // Violent rain showers
            85: '13d', // Slight snow showers
            86: '13d', // Heavy snow showers
            95: '11d', // Thunderstorm
            96: '11d', // Thunderstorm with slight hail
            99: '11d'  // Thunderstorm with heavy hail
        };
        
        const weatherCode = current.weathercode;
        const weatherDesc = weatherCodeMap[weatherCode] || 'Unknown';
        
        standardized = {
            coord: {
                lon: data.longitude,
                lat: data.latitude
            },
            weather: [{
                id: weatherCode,
                main: weatherDesc.split(' ')[0],
                description: weatherDesc,
                icon: weatherIconMap[weatherCode] || '01d'
            }],
            main: {
                temp: current.temperature,
                feels_like: hourlyData.apparent_temperature[currentIndex],
                temp_min: Math.min(...hourlyData.temperature_2m.slice(0, 24)),
                temp_max: Math.max(...hourlyData.temperature_2m.slice(0, 24)),
                pressure: hourlyData.pressure_msl[currentIndex],
                humidity: hourlyData.relativehumidity_2m[currentIndex]
            },
            visibility: hourlyData.visibility[currentIndex],
            wind: {
                speed: current.windspeed,
                deg: current.winddirection
            },
            name: 'Location', // Open-Meteo doesn't provide location name
            sys: {
                country: '' // Open-Meteo doesn't provide country
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
    } else if (provider === 'openmeteo') {
        const hourlyData = data.hourly;
        const weatherCodeMap = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            56: 'Light freezing drizzle',
            57: 'Dense freezing drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        
        // Map weather codes to OpenWeatherMap-like icon codes
        const weatherIconMap = {
            0: '01d', // Clear sky
            1: '02d', // Mainly clear
            2: '03d', // Partly cloudy
            3: '04d', // Overcast
            45: '50d', // Fog
            48: '50d', // Depositing rime fog
            51: '09d', // Light drizzle
            53: '09d', // Moderate drizzle
            55: '09d', // Dense drizzle
            56: '09d', // Light freezing drizzle
            57: '09d', // Dense freezing drizzle
            61: '10d', // Slight rain
            63: '10d', // Moderate rain
            65: '10d', // Heavy rain
            66: '10d', // Light freezing rain
            67: '10d', // Heavy freezing rain
            71: '13d', // Slight snow fall
            73: '13d', // Moderate snow fall
            75: '13d', // Heavy snow fall
            77: '13d', // Snow grains
            80: '10d', // Slight rain showers
            81: '10d', // Moderate rain showers
            82: '10d', // Violent rain showers
            85: '13d', // Slight snow showers
            86: '13d', // Heavy snow showers
            95: '11d', // Thunderstorm
            96: '11d', // Thunderstorm with slight hail
            99: '11d'  // Thunderstorm with heavy hail
        };
        
        // Create forecast entries for each hour
        for (let i = 0; i < hourlyData.time.length; i++) {
            const time = hourlyData.time[i];
            const weatherCode = hourlyData.weathercode[i];
            
            standardized.list.push({
                dt: new Date(time).getTime() / 1000,
                main: {
                    temp: hourlyData.temperature_2m[i],
                    feels_like: hourlyData.apparent_temperature[i],
                    temp_min: hourlyData.temperature_2m[i],
                    temp_max: hourlyData.temperature_2m[i],
                    pressure: hourlyData.pressure_msl[i],
                    humidity: hourlyData.relativehumidity_2m[i]
                },
                weather: [{
                    id: weatherCode,
                    main: (weatherCodeMap[weatherCode] && weatherCodeMap[weatherCode].split(' ')[0]) || 'Unknown',
                    description: weatherCodeMap[weatherCode] || 'Unknown',
                    icon: weatherIconMap[weatherCode] || '01d'
                }],
                wind: {
                    speed: hourlyData.windspeed_10m[i],
                    deg: hourlyData.winddirection_10m[i]
                },
                visibility: hourlyData.visibility[i],
                dt_txt: time
            });
        }
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
 * Standardize marine weather data from Open-Meteo
 */
function standardizeMarineDataOpenMeteo(data) {
    const hourlyMarine = [];
    
    for (let i = 0; i < data.hourly.time.length; i++) {
        hourlyMarine.push({
            time: data.hourly.time[i],
            wave_height: data.hourly.wave_height[i],
            wave_direction: data.hourly.wave_direction[i],
            wave_period: data.hourly.wave_period[i],
            swell_wave_height: data.hourly.swell_wave_height[i],
            swell_wave_direction: data.hourly.swell_wave_direction[i],
            swell_wave_period: data.hourly.swell_wave_period[i]
        });
    }
    
    return {
        location: {
            name: 'Marine Location',
            lat: data.latitude,
            lon: data.longitude
        },
        date: new Date().toISOString().split('T')[0],
        marine_hourly: hourlyMarine,
        marine_day: {
            avg_wave_height: calculateAverage(data.hourly.wave_height.slice(0, 24)),
            max_wave_height: Math.max(...data.hourly.wave_height.slice(0, 24)),
            avg_wave_period: calculateAverage(data.hourly.wave_period.slice(0, 24))
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
 * Standardize historical weather data from Open-Meteo
 */
function standardizeHistoricalDataOpenMeteo(data, date) {
    const hourlyData = [];
    
    // Map Open-Meteo weather codes to descriptive text
    const weatherCodeMap = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    
    for (let i = 0; i < data.hourly.time.length; i++) {
        hourlyData.push({
            time: data.hourly.time[i],
            temp_c: data.hourly.temperature_2m[i],
            temp_f: celsiusToFahrenheit(data.hourly.temperature_2m[i]),
            condition: {
                text: weatherCodeMap[data.hourly.weathercode[i]] || 'Unknown',
                code: data.hourly.weathercode[i]
            },
            wind_mph: msToMph(data.hourly.windspeed_10m[i]),
            wind_kph: msToKph(data.hourly.windspeed_10m[i]),
            wind_degree: data.hourly.winddirection_10m[i],
            wind_dir: getWindDirection(data.hourly.winddirection_10m[i]),
            pressure_mb: data.hourly.pressure_msl[i],
            precip_mm: data.hourly.precipitation[i],
            humidity: data.hourly.relativehumidity_2m[i],
            feelslike_c: data.hourly.temperature_2m[i], // Open-Meteo doesn't always provide apparent temperature
            feelslike_f: celsiusToFahrenheit(data.hourly.temperature_2m[i])
        });
    }
    
    return {
        location: {
            name: 'Historical Location',
            lat: data.latitude,
            lon: data.longitude
        },
        date: date,
        day: {
            maxtemp_c: data.daily.temperature_2m_max[0],
            maxtemp_f: celsiusToFahrenheit(data.daily.temperature_2m_max[0]),
            mintemp_c: data.daily.temperature_2m_min[0],
            mintemp_f: celsiusToFahrenheit(data.daily.temperature_2m_min[0]),
            avgtemp_c: calculateAverage([data.daily.temperature_2m_max[0], data.daily.temperature_2m_min[0]]),
            avgtemp_f: celsiusToFahrenheit(calculateAverage([data.daily.temperature_2m_max[0], data.daily.temperature_2m_min[0]])),
            totalprecip_mm: data.daily.precipitation_sum[0],
            totalprecip_in: mmToInches(data.daily.precipitation_sum[0]),
            condition: {
                text: weatherCodeMap[data.daily.weathercode[0]] || 'Unknown',
                code: data.daily.weathercode[0]
            }
        },
        hourly: hourlyData
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

// Helper functions
function calculateAverage(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function msToMph(ms) {
    return ms * 2.237;
}

function msToKph(ms) {
    return ms * 3.6;
}

function mmToInches(mm) {
    return mm * 0.0393701;
}

function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// Get weather data with fallback
async function getWeatherData(lat, lon, units = 'metric', preferredProvider = 'openweather') {
    const providerOrder = getProviderOrder(preferredProvider);
    
    for (const providerName of providerOrder) {
        try {
            const provider = providers[providerName];
            if (!provider || (providerName !== 'openmeteo' && !provider.apiKey)) {
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
    const providerOrder = getProviderOrder(preferredProvider);
    
    for (const providerName of providerOrder) {
        try {
            const provider = providers[providerName];
            if (!provider || (providerName !== 'openmeteo' && !provider.apiKey) || !provider.getForecast) {
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

// Helper function to get provider order based on preference
function getProviderOrder(preferredProvider) {
    switch (preferredProvider) {
        case 'weatherapi':
            return ['weatherapi', 'openmeteo', 'openweather'];
        case 'openmeteo':
            return ['openmeteo', 'openweather', 'weatherapi'];
        default:
            return ['openweather', 'openmeteo', 'weatherapi'];
    }
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

// Get marine weather data (WeatherAPI or Open-Meteo)
async function getMarineWeatherData(lat, lon, preferredProvider = 'weatherapi') {
    const providersList = preferredProvider === 'openmeteo' 
        ? ['openmeteo', 'weatherapi'] 
        : ['weatherapi', 'openmeteo'];
    
    for (const providerName of providersList) {
        try {
            if (providerName === 'openmeteo') {
                if (providers.openmeteo) {
                    return await providers.openmeteo.getMarineWeather(lat, lon);
                }
            } else if (providerName === 'weatherapi') {
                const provider = providers.weatherapi;
                if (!provider || !provider.apiKey) {
                    console.log('WeatherAPI not configured for marine data, skipping...');
                    continue;
                }
                return await provider.getMarineWeather(lat, lon);
            }
        } catch (error) {
            console.error(`${providerName} marine data failed:`, error.message);
            continue;
        }
    }
    
    throw new Error('All marine weather providers failed');
}

// Get historical weather data (WeatherAPI or Open-Meteo)
async function getHistoricalWeatherData(lat, lon, date, preferredProvider = 'weatherapi') {
    const providersList = preferredProvider === 'openmeteo' 
        ? ['openmeteo', 'weatherapi'] 
        : ['weatherapi', 'openmeteo'];
    
    for (const providerName of providersList) {
        try {
            if (providerName === 'openmeteo') {
                if (providers.openmeteo) {
                    return await providers.openmeteo.getHistoricalWeather(lat, lon, date);
                }
            } else if (providerName === 'weatherapi') {
                const provider = providers.weatherapi;
                if (!provider || !provider.apiKey) {
                    console.log('WeatherAPI not configured for historical data, skipping...');
                    continue;
                }
                return await provider.getHistoricalWeather(lat, lon, date);
            }
        } catch (error) {
            console.error(`${providerName} historical data failed:`, error.message);
            continue;
        }
    }
    
    throw new Error('All historical weather providers failed');
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
    getAstronomyData,
    getProviderOrder
};
