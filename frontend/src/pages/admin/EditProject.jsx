import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import { adminApi } from '../../api/endpoints';

export default function EditProject() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    loadProject();
  }, [code]);

  const loadProject = async () => {
    try {
      const data = await adminApi.getProject(code);
      setFormData({
        title: data.title,
        description: data.description,
        youtubeUrl: data.youtube_url || '',
        wordLimit: data.word_limit,
        attemptLimitPerCategory: data.attempt_limit_per_category,
        reviewCooldownSeconds: data.review_cooldown_seconds || 120,
        enableFeedback: data.enable_feedback || false
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await adminApi.updateProject(code, formData);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </PageContainer>
    );
  }

  if (!formData) {
    return (
      <PageContainer>
        <div className="error" style={{ padding: '40px', textAlign: 'center' }}>{error}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div style={{ padding: '24px 0', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '24px' }}>Edit Project: {code}</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            
            <div style={{ marginBottom: '20px' }}>
              <label>Project Code</label>
              <input
                type="text"
                value={code}
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
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

              <div>
                <label>Review Cooldown *</label>
                <select
                  name="reviewCooldownSeconds"
                  value={formData.reviewCooldownSeconds}
                  onChange={handleChange}
                  required
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={90}>90 seconds</option>
                  <option value={120}>120 seconds</option>
                  <option value={150}>150 seconds</option>
                  <option value={180}>180 seconds</option>
                </select>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Time between reviews
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  name="enableFeedback"
                  checked={formData.enableFeedback}
                  onChange={(e) => setFormData(prev => ({ ...prev, enableFeedback: e.target.checked }))}
                  style={{ width: '20px', height: '20px', marginRight: '12px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Enable Feedback</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Collect anonymous feedback from students after final submission
                  </div>
                </div>
              </label>
            </div>

            {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
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
