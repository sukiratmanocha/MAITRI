import { useState, useEffect } from 'react';
import { fetchPortWeather } from '../services/weatherService';
import './PortWeather.css';

export default function PortWeather() {
    const [ports, setPorts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await fetchPortWeather();
                if (!cancelled) {
                    setPorts(data);
                    setLoading(false);
                }
            } catch (e) {
                if (!cancelled) {
                    setError('Weather unavailable');
                    setLoading(false);
                }
            }
        }

        load();
        // Refresh every 10 minutes
        const id = setInterval(load, 10 * 60 * 1000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    if (error) return null;

    return (
        <div className="port-weather-strip">
            <span className="weather-title">⚓ Live Port Conditions</span>
            <div className="weather-ports">
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="weather-port skeleton" />
                    ))
                    : ports.map(port => (
                        <div key={port.name} className="weather-port">
                            <span className="weather-port-flag">{port.flag}</span>
                            <span className="weather-port-name">{port.name}</span>
                            <span className="weather-condition">{port.condition.icon}</span>
                            <span className="weather-temp">
                                {port.temp !== null ? `${port.temp}°C` : '—'}
                            </span>
                            <span className="weather-wind">
                                {port.windKnots !== null ? `${port.windKnots}kn` : '—'}
                                <span className="weather-wind-label"> wind</span>
                            </span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}
