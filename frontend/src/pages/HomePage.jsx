import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';

export default function HomePage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Validate: exactly 6 characters, letters/numbers only
    const trimmed = code.trim();
    if (!/^[A-Za-z0-9]{6}$/.test(trimmed)) {
      setError('Project code must be exactly 6 alphanumeric characters');
      return;
    }
    
    navigate(`/projects/${trimmed.toUpperCase()}`);
  };

  return (
    <PageContainer>
      <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '16px' }}>Welcome to Agentic AI Learning</h1>
        <p style={{ marginBottom: '32px', color: '#666' }}>
          Enter your 6-character project code to get started
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter project code"
            maxLength={6}
            style={{ 
              textAlign: 'center', 
              fontSize: '20px', 
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" className="primary" style={{ width: '100%', marginTop: '16px' }}>
            Continue
          </button>
        </form>
      </div>
    </PageContainer>
  );
}
