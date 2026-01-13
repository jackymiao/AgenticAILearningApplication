import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import { adminApi } from '../../api/endpoints';

export default function SubmissionDetail() {
  const { code, submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('grammar');
  const [expandedReviews, setExpandedReviews] = useState({});
  
  const [adminScore, setAdminScore] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState(null);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      const data = await adminApi.getSubmission(submissionId);
      setSubmission(data);
      setAdminScore(data.admin_score || '');
      setAdminFeedback(data.admin_feedback || '');
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const saveGrading = useCallback(async (score, feedback) => {
    try {
      await adminApi.updateGrading(submissionId, score || null, feedback);
    } catch (err) {
      console.error('Autosave failed:', err);
    }
  }, [submissionId]);

  const handleScoreChange = (e) => {
    const value = e.target.value;
    setAdminScore(value);
    
    // Debounced autosave
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(() => {
      saveGrading(value, adminFeedback);
    }, 1000);
    setSaveTimeout(timeout);
  };

  const handleFeedbackChange = (e) => {
    const value = e.target.value;
    setAdminFeedback(value);
    
    // Debounced autosave
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(() => {
      saveGrading(adminScore, value);
    }, 1000);
    setSaveTimeout(timeout);
  };

  const handleSaveNow = async () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaving(true);
    try {
      await saveGrading(adminScore, adminFeedback);
      alert('Grading saved successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleReview = (reviewId) => {
    setExpandedReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </PageContainer>
    );
  }

  if (!submission) {
    return (
      <PageContainer>
        <div className="error" style={{ padding: '40px', textAlign: 'center' }}>{error}</div>
      </PageContainer>
    );
  }

  const categories = ['grammar', 'structure', 'style', 'content'];

  return (
    <PageContainer>
      <div style={{ padding: '24px 0' }}>
        <div style={{ marginBottom: '24px' }}>
          <button 
            onClick={() => navigate(`/admin/projects/${code}`)}
            className="secondary"
            style={{ marginBottom: '12px' }}
          >
            ← Back to Submissions
          </button>
          <h1>Submission Detail</h1>
        </div>

        {/* Student Info */}
        <section style={{ marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>Student Name</div>
                <div style={{ fontWeight: 'bold' }}>{submission.user_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>Submitted</div>
                <div style={{ fontWeight: 'bold' }}>{new Date(submission.submitted_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Essay */}
        <section style={{ marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '16px' }}>Essay</h2>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              padding: '16px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '6px',
              border: '1px solid #ddd',
              lineHeight: '1.8'
            }}>
              {submission.essay}
            </div>
          </div>
        </section>

        {/* Review Attempts Tabs */}
        <section style={{ marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ borderBottom: '1px solid #ddd', display: 'flex' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    backgroundColor: activeTab === cat ? 'white' : '#f5f5f5',
                    borderBottom: activeTab === cat ? '2px solid #007bff' : 'none',
                    fontWeight: activeTab === cat ? 'bold' : 'normal',
                    textTransform: 'capitalize'
                  }}
                >
                  {cat}
                  {submission.reviewHistory[cat] && ` (${submission.reviewHistory[cat].length})`}
                </button>
              ))}
            </div>
            
            <div style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', textTransform: 'capitalize' }}>
                {activeTab} Review Attempts
              </h3>

              {submission.reviewHistory[activeTab]?.length > 0 ? (
                <div>
                  {submission.reviewHistory[activeTab].map(review => (
                    <div 
                      key={review.id}
                      style={{ 
                        border: '1px solid #ddd', 
                        borderRadius: '6px', 
                        marginBottom: '12px',
                        overflow: 'hidden'
                      }}
                    >
                      <div 
                        style={{ 
                          padding: '12px 16px', 
                          backgroundColor: '#f5f5f5',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onClick={() => toggleReview(review.id)}
                      >
                        <div>
                          <strong>Attempt {review.attempt_number}</strong>
                          <span style={{ marginLeft: '12px', color: '#666', fontSize: '14px' }}>
                            {new Date(review.created_at).toLocaleString()}
                          </span>
                          {review.score && (
                            <span style={{ marginLeft: '12px', fontWeight: 'bold' }}>
                              Score: {review.score}
                            </span>
                          )}
                        </div>
                        <div>{expandedReviews[review.id] ? '▼' : '▶'}</div>
                      </div>
                      
                      {expandedReviews[review.id] && (
                        <div style={{ padding: '16px' }}>
                          {review.status === 'success' && review.result_json && (() => {
                            try {
                              const data = review.result_json;
                              
                              // Calculate correct score: 100 - total deducted points
                              const calculateScore = (breakdown) => {
                                if (!breakdown || !Array.isArray(breakdown) || breakdown.length === 0) {
                                  return data.score || 0;
                                }
                                const totalDeductions = breakdown.reduce((sum, item) => {
                                  return sum + (item.deducted_points || 0);
                                }, 0);
                                return Math.max(0, 100 - totalDeductions);
                              };
                              
                              const score = calculateScore(data.breakdown);
                              const scoreColor = score >= 80 ? '#4CAF50' : '#f44336';
                              
                              return (
                                <div>
                                  {/* Score */}
                                  <div style={{ 
                                    padding: '12px', 
                                    backgroundColor: scoreColor, 
                                    color: 'white', 
                                    borderRadius: '4px', 
                                    marginBottom: '16px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                  }}>
                                    Score: {score}/100
                                  </div>

                                  {/* Overview */}
                                  {data.overview && (
                                    <div style={{ marginBottom: '16px' }}>
                                      <h4 style={{ marginBottom: '8px' }}>Summary:</h4>
                                      <p style={{ lineHeight: '1.6' }}>{data.overview}</p>
                                    </div>
                                  )}

                                  {/* Breakdown */}
                                  {data.breakdown && Array.isArray(data.breakdown) && data.breakdown.length > 0 && (
                                    <div style={{ marginBottom: '16px' }}>
                                      <h4 style={{ marginBottom: '8px' }}>Breakdown:</h4>
                                      <div style={{ paddingLeft: '12px' }}>
                                        {data.breakdown.map((item, idx) => (
                                          <div key={idx} style={{ 
                                            marginBottom: '12px', 
                                            padding: '12px', 
                                            backgroundColor: '#fff9e6',
                                            borderLeft: '3px solid #ff9800',
                                            borderRadius: '4px'
                                          }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#ff6f00' }}>
                                              {item.category_name} (-{item.deducted_points} points)
                                            </div>
                                            <div style={{ color: '#666', marginBottom: '6px' }}>
                                              {item.reason}
                                            </div>
                                            {item.examples && item.examples.length > 0 && (
                                              <div style={{ marginTop: '8px' }}>
                                                <strong style={{ fontSize: '14px' }}>Examples:</strong>
                                                {item.examples.map((example, i) => (
                                                  <div key={i} style={{ 
                                                    marginTop: '4px', 
                                                    padding: '6px 8px', 
                                                    backgroundColor: '#fff', 
                                                    borderRadius: '3px',
                                                    fontSize: '14px',
                                                    fontStyle: 'italic'
                                                  }}>
                                                    "{example}"
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Suggestions */}
                                  {data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0 && (
                                    <div style={{ marginBottom: '16px' }}>
                                      <h4 style={{ marginBottom: '8px' }}>Suggestions:</h4>
                                      <ul style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
                                        {data.suggestions.map((suggestion, idx) => (
                                          <li key={idx} style={{ marginBottom: '8px' }}>
                                            {typeof suggestion === 'string' ? suggestion : suggestion.suggestion || JSON.stringify(suggestion)}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              );
                            } catch (error) {
                              console.error('Error rendering review:', error);
                              return (
                                <div style={{ padding: '12px', backgroundColor: '#fff5f5', color: '#f44336', borderRadius: '4px' }}>
                                  Error displaying results. Raw data: {JSON.stringify(review.result_json, null, 2)}
                                </div>
                              );
                            }
                          })()}
                          {review.status === 'error' && (
                            <div className="error">{review.error_message}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No review attempts for this category
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Admin Grading */}
        <section style={{ marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '16px' }}>Admin Grading</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label>Score</label>
              <input
                type="number"
                value={adminScore}
                onChange={handleScoreChange}
                placeholder="Enter score (e.g., 85)"
                min={0}
                max={100}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Autosaves while typing
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Feedback</label>
              <textarea
                value={adminFeedback}
                onChange={handleFeedbackChange}
                placeholder="Enter your feedback for the student..."
                rows={8}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Autosaves while typing
              </div>
            </div>

            {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

            <button 
              onClick={handleSaveNow} 
              className="primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Now'}
            </button>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
