import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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
    return () => {
      cancelled = true;
    };
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

  const deleteResume = async (id, title) => {
    if (!window.confirm(`Delete "${title || 'this resume'}"?`)) return;
    try {
      await api.delete(`/resumes/${id}`);
      setResumes((prev) => prev.filter((r) => r._id !== id));
      showToast('Resume deleted successfully.', 'success');
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
    } catch {
      showToast('Could not download PDF.');
    }
  };

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
            <Link to="/profile" className="nav-link">
              Profile
            </Link>
            <span className="user-name">👋 {user?.name}</span>
            <button type="button" onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome back, {user?.name}! 🎉</h2>
          <p>Email: {user?.email}</p>
          <p className="account-date">Member since {new Date(user?.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="action-section">
          <div className="card">
            <h3>🚀 Quick Start</h3>
            <p>Create a resume, pick a template, edit step by step, and export a PDF when you are ready.</p>
            <button type="button" className="btn-primary-dash" onClick={createResume} disabled={creating}>
              {creating ? '⏳ Creating…' : '+ Create New Resume'}
            </button>
          </div>

          <div className="card card--wide">
            <h3>📋 My Resumes ({resumes.length})</h3>
            {resumes.length === 0 ? (
              <div className="empty-state">No resumes yet. Click "Create New Resume" to get started! ✨</div>
            ) : null}
            {resumes.length > 0 && (
              <ul className="resume-list">
                {resumes.map((r) => (
                  <li key={r._id} className="resume-row">
                    <div className="resume-row-main">
                      <strong>{r.title || 'Untitled'}</strong>
                      <span className="resume-meta">
                        Template: {r.templateId} · Updated {new Date(r.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="resume-row-actions">
                      <Link to={`/resume/${r._id}/edit`} className="btn-link">
                        ✏️ Edit
                      </Link>
                      <button type="button" className="btn-link" onClick={() => downloadPdf(r._id, r.title)}>
                        📥 PDF
                      </button>
                      <button type="button" className="btn-link btn-link--danger" onClick={() => deleteResume(r._id, r.title)}>
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
