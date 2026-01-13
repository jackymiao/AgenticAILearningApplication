import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import PageContainer from '../components/PageContainer';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await signup(username, password, accessCode);
      }
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div style={{ maxWidth: '400px', margin: '80px auto' }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ marginBottom: '24px', textAlign: 'center' }}>
            {mode === 'login' ? 'Admin Login' : 'Create Admin Account'}
          </h1>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === 'signup' && (
              <div style={{ marginBottom: '16px' }}>
                <label>Access Code</label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                />
              </div>
            )}

            {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

            <button 
              type="submit" 
              className="primary" 
              disabled={loading}
              style={{ width: '100%', marginBottom: '16px' }}
            >
              {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Create Account')}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: '14px' }}>
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(''); }}>
                  Create one
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setError(''); }}>
                  Login
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
