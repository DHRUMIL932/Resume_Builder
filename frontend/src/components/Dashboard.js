import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(response.data.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-content">
          <h1>Resume Builder</h1>
          <div className="nav-right">
            <span className="user-name">👋 {user?.name}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome to Your Dashboard, {user?.name}!</h2>
          <p>Email: {user?.email}</p>
          <p className="account-date">Account created: {new Date(user?.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="action-section">
          <div className="card">
            <h3>🎯 Quick Start</h3>
            <p>Your resume builder is ready. Start creating your professional resume now!</p>
            <button className="btn-primary">Create New Resume</button>
          </div>

          <div className="card">
            <h3>📄 My Resumes</h3>
            <p>You don't have any resumes yet. Create your first one to get started.</p>
            <div className="empty-state">No resumes found</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
