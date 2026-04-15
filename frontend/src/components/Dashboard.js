import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (text, type = 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    const [meRes, listRes] = await Promise.all([api.get('/auth/me'), api.get('/resumes')]);
    setUser(meRes.data.data);
    setResumes(listRes.data.data || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (error) {
        console.error('Error loading dashboard:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!cancelled) navigate('/login', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [load, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const createResume = async () => {
    setCreating(true);
    try {
      const res = await api.post('/resumes', {});
      const id = res.data.data?._id;
      if (id) navigate(`/resume/${id}/edit`);
    } catch (e) {
      console.error(e);
      showToast('Could not create resume. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const duplicateResume = async (id, title) => {
    setDuplicatingId(id);
    try {
      const res = await api.post(`/resumes/${id}/duplicate`);
      const newResume = res.data.data;
      setResumes((prev) => [newResume, ...prev]);
      showToast(`"${title || 'Resume'}" duplicated successfully.`, 'success');
    } catch {
      showToast('Could not duplicate resume.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const deleteResume = async (id, title) => {
    if (!window.confirm(`Delete "${title || 'this resume'}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/resumes/${id}`);
      setResumes((prev) => prev.filter((r) => r._id !== id));
      showToast('Resume deleted.', 'success');
    } catch {
      showToast('Could not delete resume.');
    }
  };

  const downloadPdf = async (id, title) => {
    try {
      const res = await api.get(`/resumes/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = (title || 'resume').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'resume';
      a.href = url;
      a.download = `${safe}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF downloaded!', 'success');
    } catch {
      showToast('Could not download PDF.');
    }
  };

  const TEMPLATE_LABELS = { classic: 'Classic', modern: 'Modern', minimal: 'Minimal', twocolumn: 'Two Column' };

  const filtered = resumes.filter((r) => {
    const matchSearch = !search || (r.title || '').toLowerCase().includes(search.toLowerCase());
    const matchTemplate = !filterTemplate || r.templateId === filterTemplate;
    return matchSearch && matchTemplate;
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-content">
          <div className="spinner" />
          <span className="loading-text">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>{toast.text}</div>
        </div>
      )}

      <nav className="navbar">
        <div className="nav-content">
          <h1>📄 Resume Builder</h1>
          <div className="nav-right">
            <Link to="/profile" className="nav-link">Profile</Link>
            <span className="user-name">👋 {user?.name}</span>
            <button type="button" onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome back, {user?.name}! 🎉</h2>
          <p className="account-date">Member since {new Date(user?.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="action-section">
          {/* Quick start card */}
          <div className="card">
            <h3>🚀 Quick Start</h3>
            <p>Create a resume, pick a template, fill each section, and export a polished PDF.</p>
            <button type="button" className="btn-primary-dash" onClick={createResume} disabled={creating}>
              {creating ? '⏳ Creating…' : '+ Create New Resume'}
            </button>
          </div>

          {/* Resume list card */}
          <div className="card card--wide">
            <div className="resume-list-header">
              <h3>📋 My Resumes ({resumes.length})</h3>
              <div className="resume-filters">
                <input
                  className="filter-input"
                  type="search"
                  placeholder="Search by title…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="filter-select"
                  value={filterTemplate}
                  onChange={(e) => setFilterTemplate(e.target.value)}
                >
                  <option value="">All templates</option>
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                  <option value="twocolumn">Two Column</option>
                </select>
              </div>
            </div>

            {resumes.length === 0 ? (
              <div className="empty-state">No resumes yet. Click "Create New Resume" to get started! ✨</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">No resumes match your search.</div>
            ) : (
              <ul className="resume-list">
                {filtered.map((r) => (
                  <li key={r._id} className="resume-row">
                    <div className="resume-row-main">
                      <strong className="resume-title">{r.title || 'Untitled'}</strong>
                      <span className="resume-meta">
                        <span className={`template-badge template-badge--${r.templateId}`}>
                          {TEMPLATE_LABELS[r.templateId] || r.templateId}
                        </span>
                        Updated {new Date(r.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="resume-row-actions">
                      <Link to={`/resume/${r._id}/edit`} className="btn-link">✏️ Edit</Link>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => duplicateResume(r._id, r.title)}
                        disabled={duplicatingId === r._id}
                      >
                        {duplicatingId === r._id ? '⏳' : '📋'} Duplicate
                      </button>
                      <button type="button" className="btn-link" onClick={() => downloadPdf(r._id, r.title)}>
                        📥 PDF
                      </button>
                      <button
                        type="button"
                        className="btn-link btn-link--danger"
                        onClick={() => deleteResume(r._id, r.title)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
