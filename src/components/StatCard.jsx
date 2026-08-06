import { useState, useEffect, useRef } from 'react';
import './StatCard.css';

export default function StatCard({ icon, label, value, sub, trend, color = 'green' }) {
    const [displayValue, setDisplayValue] = useState(0);
    const cardRef = useRef(null);
    const numericValue = typeof value === 'number' ? value : parseInt(String(value).replace(/[^0-9]/g, ''), 10);
    const isNumeric = !isNaN(numericValue) && numericValue > 0;
    const prefix = typeof value === 'string' ? value.match(/^[^\d]*/)?.[0] || '' : '';
    const suffix = typeof value === 'string' ? value.match(/[^\d]*$/)?.[0] || '' : '';

    useEffect(() => {
        if (!isNumeric) return;
        let start = 0;
        const end = numericValue;
        const duration = 1200;
        const step = Math.max(1, Math.floor(end / 60));
        const interval = duration / (end / step);

        const timer = setInterval(() => {
            start += step;
            if (start >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(start);
            }
        }, interval);

        return () => clearInterval(timer);
    }, [numericValue, isNumeric]);

    const formattedValue = isNumeric
        ? `${prefix}${displayValue.toLocaleString()}${suffix}`
        : value;

    return (
        <div className={`stat-card stat-card--${color}`} ref={cardRef}>
            <div className="stat-icon-wrap">
                <span className="stat-icon">{icon}</span>
            </div>
            <div className="stat-body">
                <p className="stat-label">{label}</p>
                <h3 className="stat-value">{formattedValue}</h3>
                <div className="stat-footer">
                    {sub && <p className="stat-sub">{sub}</p>}
                    {trend && (
                        <span className={`stat-trend ${trend > 0 ? 'up' : 'down'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
