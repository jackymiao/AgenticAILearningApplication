import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import { adminApi } from '../../api/endpoints';

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: 'Please review the video and submit your essay below. Make sure to stay within the word limit and use the AI review features to improve your work before final submission.',
    youtubeUrl: '',
    wordLimit: 150,
    attemptLimitPerCategory: 3,
    agentMode: 'agent_a' as 'agent_a' | 'agent_b'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminApi.createProject(formData);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div style={{ padding: '24px 0', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '24px' }}>Create New Project</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            
            <div style={{ marginBottom: '20px' }}>
              <label>Project Code *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="6 alphanumeric characters"
                maxLength={6}
                pattern="[A-Za-z0-9]{6}"
                required
                style={{ textTransform: 'uppercase' }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Must be exactly 6 characters (letters and numbers only)
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>YouTube URL</label>
              <input
                type="url"
                name="youtubeUrl"
                value={formData.youtubeUrl}
                onChange={handleChange}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label>Word Limit *</label>
                <input
                  type="number"
                  name="wordLimit"
                  value={formData.wordLimit}
                  onChange={handleChange}
                  min={1}
                  required
                />
              </div>

              <div>
                <label>Attempts per Category *</label>
                <input
                  type="number"
                  name="attemptLimitPerCategory"
                  value={formData.attemptLimitPerCategory}
                  onChange={handleChange}
                  min={1}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>AI Mode *</label>
              <select
                name="agentMode"
                value={formData.agentMode}
                onChange={handleChange}
                required
              >
                <option value="agent_a">Agent A (Single agent for all categories)</option>
                <option value="agent_b">Agent B (Separate agents per category)</option>
              </select>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                The system will use preset Agent Builder SDKs based on your selection
              </div>
            </div>

            {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </button>
              <button 
                type="button" 
                className="secondary" 
                onClick={() => navigate('/admin')}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
