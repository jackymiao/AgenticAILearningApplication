import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import { publicApi } from '../api/endpoints';

export default function HomePage() {
  const [code, setCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Validate: exactly 6 characters, letters/numbers only
    const trimmed = code.trim();
    if (!/^[A-Za-z0-9]{6}$/.test(trimmed)) {
      setError('Project code must be exactly 6 alphanumeric characters');
      setLoading(false);
      return;
    }

    const studentIdTrimmed = studentId.trim();
    if (!studentIdTrimmed) {
      setError('Student ID is required');
      setLoading(false);
      return;
    }

    try {
      const projectCode = trimmed.toUpperCase();
      const result = await publicApi.validateStudent(projectCode, studentIdTrimmed);
      localStorage.setItem(`project_${projectCode}_studentId`, result.studentId);
      localStorage.setItem(`project_${projectCode}_studentName`, result.studentName);
      navigate(`/projects/${projectCode}`);
    } catch (err) {
      setError(err.message || 'Failed to validate student ID');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '16px' }}>Welcome to Agentic AI Learning</h1>
        <p style={{ marginBottom: '32px', color: '#666' }}>
          Enter your 6-character project code and student ID to get started
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
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value.toUpperCase())}
            placeholder="Enter student ID"
            style={{ 
              textAlign: 'center', 
              fontSize: '18px', 
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" className="primary" disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
            {loading ? 'Validating...' : 'Continue'}
          </button>
        </form>
      </div>
    </PageContainer>
  );
}
