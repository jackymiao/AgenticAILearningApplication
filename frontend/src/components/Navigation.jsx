import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function Navigation() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #ddd',
      padding: '12px 0',
      marginBottom: '24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to="/" style={{ 
          fontSize: '20px', 
          fontWeight: 'bold',
          textDecoration: 'none',
          color: '#333'
        }}>
          Agentic AI Learning
        </Link>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link to="/help">Help</Link>
          
          {auth.isAdmin ? (
            <>
              <Link to="/admin">Dashboard</Link>
              <span style={{ color: '#666' }}>{auth.adminName}</span>
              <button onClick={handleLogout} className="secondary">
                Logout
              </button>
            </>
          ) : !auth.isBootstrapping && (
            <Link to="/login">
              <button className="primary">Login</button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
