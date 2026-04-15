import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { API_URL } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiError';
import './Profile.css';

function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', isError: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/auth/me');
        const d = res.data.data;
        if (!cancelled && d) {
          setUser(d);
          setName(d.name || '');
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveName = async (e) => {
    e.preventDefault();
    setFeedback({ text: '', isError: false });
    setSaving(true);
    try {
      const res = await api.patch('/users/me', { name: name.trim() });
      const d = res.data.data;
      setUser(d);
      localStorage.setItem(
        'user',
        JSON.stringify({ id: d.id, name: d.name, email: d.email, avatar: d.avatar || '' })
      );
      setFeedback({ text: '✅ Profile updated successfully.', isError: false });
    } catch (err) {
      setFeedback({ text: getApiErrorMessage(err, 'Could not update profile.'), isError: true });
    } finally {
      setSaving(false);
    }
  };

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    setFeedback({ text: '', isError: false });
    try {
      // Do not set Content-Type — axios must add the multipart boundary automatically.
      const res = await api.post('/users/me/avatar', fd);
      const d = res.data.data;
      setUser(d);
      localStorage.setItem(
        'user',
        JSON.stringify({ id: d.id, name: d.name, email: d.email, avatar: d.avatar || '' })
      );
      setFeedback({ text: '📸 Photo updated successfully.', isError: false });
    } catch (err) {
      setFeedback({
        text: getApiErrorMessage(
          err,
          'Upload failed. Use JPEG, PNG, or WebP under 2MB, and ensure the backend is running.'
        ),
        isError: true
      });
    }
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner" />
        <span>Loading profile…</span>
      </div>
    );
  }

  const avatarSrc = user?.avatar
    ? user.avatar.startsWith('http')
      ? user.avatar
      : `${API_URL}${user.avatar}`
    : null;

  return (
    <div className="profile-page">
      <nav className="profile-nav">
        <Link to="/dashboard" className="profile-back">
          ← Dashboard
        </Link>
        <h1>⚙️ Account Settings</h1>
      </nav>

      <div className="profile-card">
        <div className="profile-avatar-row">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar--placeholder">{user?.name?.charAt(0) || '?'}</div>
          )}
          <div>
            <p className="profile-email">{user?.email}</p>
            <label className="profile-upload">
              📷 Change photo
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onAvatar} />
            </label>
          </div>
        </div>

        <form onSubmit={saveName} className="profile-form">
          <label className="profile-label">
            Display name
            <input
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
            />
          </label>
          <button type="submit" className="profile-save" disabled={saving}>
            {saving ? '⏳ Saving…' : '💾 Save Changes'}
          </button>
        </form>

        {feedback.text ? (
          <p className={`profile-msg ${feedback.isError ? 'profile-msg--error' : ''}`} role="alert">
            {feedback.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default Profile;
