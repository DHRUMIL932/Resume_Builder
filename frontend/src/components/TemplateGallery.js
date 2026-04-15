import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import './TemplateGallery.css';

function TemplateGallery({ open, onClose, selectedId, onSelect }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/templates');
        if (!cancelled) setTemplates(res.data.data || []);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="tg-overlay" role="dialog" aria-modal="true">
      <div className="tg-panel">
        <div className="tg-header">
          <h2>Choose a template</h2>
          <button type="button" className="tg-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {loading ? (
          <p className="tg-loading">Loading templates…</p>
        ) : (
          <div className="tg-grid">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tg-card ${selectedId === t.id ? 'tg-card--active' : ''}`}
                onClick={() => onSelect(t.id)}
              >
                <div className="tg-swatch" style={{ background: t.accent }} />
                <h3>{t.name}</h3>
                <p>{t.description}</p>
              </button>
            ))}
          </div>
        )}
        <div className="tg-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateGallery;
