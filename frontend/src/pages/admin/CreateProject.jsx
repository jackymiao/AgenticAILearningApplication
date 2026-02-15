import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import { adminApi } from '../../api/endpoints';

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');
  const [studentFile, setStudentFile] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: 'Please review the video and submit your essay below. Make sure to stay within the word limit and use the AI review features to improve your work before final submission.',
    youtubeUrl: '',
    wordLimit: 150,
    attemptLimitPerCategory: 3,
    reviewCooldownSeconds: 120,
    enableFeedback: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setImportError('');
    setLoading(true);

    console.log('[CREATE PROJECT FORM] Submitting with data:', formData);

    try {
      const result = await adminApi.createProject(formData);
      console.log('[CREATE PROJECT FORM] Success:', result);

      if (studentFile) {
        try {
          await adminApi.importStudents(result.code || formData.code, studentFile);
        } catch (importErr) {
          setImportError(importErr.message || 'Failed to import student roster');
          setLoading(false);
          return;
        }
      }

      navigate('/admin');
    } catch (err) {
      console.error('[CREATE PROJECT FORM] Error:', err);
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

            <div style={{ marginBottom: '20px' }}>
              <label>Student Roster (Optional)</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setStudentFile(e.target.files?.[0] || null)}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                Upload a CSV or Excel file with a single header: <strong>name</strong>. Importing replaces any existing roster.
              </div>
            </div>

            {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}
            {importError && <div className="error" style={{ marginBottom: '16px' }}>{importError}</div>}

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
