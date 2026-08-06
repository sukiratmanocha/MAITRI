import { useEffect, useRef } from 'react';
import './SlideOverModal.css';

export default function SlideOverModal({ open, onClose, title, children }) {
    const panelRef = useRef(null);

    return (
        <div className={`slideover-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
            <div
                ref={panelRef}
                className={`slideover-panel ${open ? 'open' : ''}`}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="slideover-header">
                    <h2 className="slideover-title">{title}</h2>
                    <button className="slideover-close" onClick={onClose} aria-label="Close panel">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="slideover-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
