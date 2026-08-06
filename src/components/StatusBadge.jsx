import './StatusBadge.css';

export default function StatusBadge({ status }) {
    const getStatusConfig = (status) => {
        switch (status) {
            case 'operational': return { label: 'Operational', color: 'success' };
            case 'in_progress': return { label: 'In Progress', color: 'warning' };
            case 'not_started': return { label: 'Not Started', color: 'danger' };
            case 'partial': return { label: 'Partial', color: 'warning' };
            case 'integrated': return { label: 'Integrated', color: 'success' };
            case 'in_transit': return { label: 'In Transit', color: 'info', pulse: true };
            case 'cleared': return { label: 'Cleared', color: 'success' };
            case 'under_inspection': return { label: 'Customs Hold', color: 'warning' };
            case 'pending': return { label: 'Pending', color: 'pending' };
            case 'loading': return { label: 'Loading', color: 'info', pulse: true };
            case 'filed': return { label: 'Filed', color: 'success' };
            case 'delivered': return { label: 'Delivered', color: 'success' };
            case 'at_port': return { label: 'At Port', color: 'success' };
            case 'arriving_soon': return { label: 'Arriving Soon', color: 'info', pulse: true };
            default: return { label: status, color: 'info' };
        }
    };

    const config = getStatusConfig(status);

    return (
        <span className={`status-badge status-${config.color} ${config.pulse ? 'has-pulse' : ''}`}>
            <span className="status-dot"></span>
            {config.label}
        </span>
    );
}
