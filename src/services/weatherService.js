// Open-Meteo API — free, no auth required
// Docs: https://open-meteo.com/en/docs

const PORTS = [
    { name: 'JNPA', label: 'Mumbai', lat: 18.95, lon: 72.95, flag: '🇮🇳' },
    { name: 'Kandla', label: 'Kandla', lat: 23.00, lon: 70.21, flag: '🇮🇳' },
    { name: 'Jebel Ali', label: 'Dubai', lat: 25.01, lon: 55.06, flag: '🇦🇪' },
    { name: 'Khalifa', label: 'Abu Dhabi', lat: 24.82, lon: 54.64, flag: '🇦🇪' },
];

function buildUrl(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m',
        wind_speed_unit: 'kn', // knots (maritime standard)
        timezone: 'auto',
    });
    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function weatherCodeToCondition(code) {
    if (code === 0) return { label: 'Clear', icon: '☀️' };
    if (code <= 3) return { label: 'Partly Cloudy', icon: '⛅' };
    if (code <= 48) return { label: 'Foggy', icon: '🌫️' };
    if (code <= 67) return { label: 'Rainy', icon: '🌧️' };
    if (code <= 77) return { label: 'Snow', icon: '❄️' };
    if (code <= 82) return { label: 'Showers', icon: '🌦️' };
    if (code <= 99) return { label: 'Thunderstorm', icon: '⛈️' };
    return { label: 'Unknown', icon: '🌡️' };
}

export async function fetchPortWeather() {
    const results = await Promise.allSettled(
        PORTS.map(async (port) => {
            const res = await fetch(buildUrl(port.lat, port.lon));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const current = data.current;
            const condition = weatherCodeToCondition(current.weather_code);
            return {
                ...port,
                temp: Math.round(current.temperature_2m),
                windKnots: Math.round(current.wind_speed_10m),
                humidity: current.relative_humidity_2m,
                condition,
            };
        })
    );

    return results.map((result, i) => {
        if (result.status === 'fulfilled') return result.value;
        // Return a placeholder on error so one failure doesn't break the others
        return { ...PORTS[i], temp: null, windKnots: null, humidity: null, condition: { label: 'Unavailable', icon: '—' } };
    });
}
