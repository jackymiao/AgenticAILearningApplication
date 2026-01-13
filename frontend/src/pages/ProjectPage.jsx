import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import { publicApi } from '../api/endpoints';

export default function ProjectPage() {
  const { code } = useParams();
  const [project, setProject] = useState(null);
  const [userName, setUserName] = useState('');
  const [userNameSubmitted, setUserNameSubmitted] = useState(false);
  const [essay, setEssay] = useState('');
  const [userState, setUserState] = useState(null);
  const [activeTab, setActiveTab] = useState('grammar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);


  useEffect(() => {
    loadProject();
  }, [code]);

  const loadProject = async () => {
    try {
      const data = await publicApi.getProject(code);
      setProject(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadUserState = async () => {
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    try {
      const data = await publicApi.getUserState(code, userName);
      setUserState(data);
      setUserNameSubmitted(true);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRunReview = async (category) => {
    setError('');
    setReviewLoading(true);
    
    try {
      const result = await publicApi.submitReview(code, userName, essay, category);
      
      // Reload user state to get updated attempts and history
      const updatedState = await publicApi.getUserState(code, userName);
      setUserState(updatedState);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit? You can only submit once.')) {
      return;
    }
    
    setError('');
    setSubmitLoading(true);
    
    try {
      await publicApi.submitFinal(code, userName, essay);
      
      // Reload user state
      const updatedState = await publicApi.getUserState(code, userName);
      setUserState(updatedState);
      
      alert('Essay submitted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const wordCount = countWords(essay);
  const overLimit = project && wordCount > project.word_limit;

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading project...</div>
      </PageContainer>
    );
  }

  if (error && !project) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="error">{error}</div>
        </div>
      </PageContainer>
    );
  }

  const categories = ['grammar', 'structure', 'style', 'content'];

  return (
    <PageContainer>
      <div style={{ padding: '24px 0' }}>
        {/* Project Header */}
        <section style={{ marginBottom: '32px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
              Project Code: <strong>{code}</strong>
            </div>
            <h1 style={{ marginBottom: '12px' }}>{project.title}</h1>
            <p style={{ color: '#666', marginBottom: '16px' }}>{project.description}</p>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#666' }}>
              <div>Word Limit: <strong>{project.word_limit}</strong></div>
              <div>Attempts per Category: <strong>{project.attempt_limit_per_category}</strong></div>
            </div>
          </div>
        </section>

        {/* YouTube Video */}
        {project.youtube_url && (
          <section style={{ marginBottom: '32px' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
              <iframe
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                src={project.youtube_url.replace('watch?v=', 'embed/')}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* Name Input */}
        {!userNameSubmitted && (
          <section style={{ marginBottom: '32px' }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginBottom: '16px' }}>Enter Your Name</h2>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                style={{ marginBottom: '16px' }}
              />
              <button onClick={loadUserState} className="primary">
                Continue
              </button>
            </div>
          </section>
        )}

        {userNameSubmitted && (
          <>
            {/* Essay Textarea */}
            <section style={{ marginBottom: '32px' }}>
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginBottom: '16px' }}>Your Essay</h2>
                <textarea
                  value={essay}
                  onChange={(e) => setEssay(e.target.value)}
                  placeholder="Write your essay here..."
                  disabled={userState?.alreadySubmitted}
                  style={{ 
                    minHeight: '300px', 
                    marginBottom: '12px',
                    backgroundColor: userState?.alreadySubmitted ? '#f5f5f5' : 'white'
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: '14px'
                }}>
                  <div style={{ color: overLimit ? '#dc3545' : '#666' }}>
                    Word count: <strong>{wordCount}</strong> / {project.word_limit}
                    {overLimit && ' (Over limit!)'}
                  </div>
                  {userState?.alreadySubmitted && (
                    <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                      ✓ Submitted
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* AI Review Tabs */}
            <section style={{ marginBottom: '32px' }}>
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
                      {userState && ` (${userState.attemptsRemaining[cat]} left)`}
                    </button>
                  ))}
                </div>
                
                <div style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ textTransform: 'capitalize' }}>{activeTab} Review</h3>
                    <button
                      onClick={() => handleRunReview(activeTab)}
                      disabled={
                        reviewLoading || 
                        !essay.trim() || 
                        overLimit || 
                        userState?.alreadySubmitted ||
                        userState?.attemptsRemaining[activeTab] <= 0
                      }
                      className="primary"
                    >
                      {reviewLoading ? 'Processing...' : 'Run Review'}
                    </button>
                  </div>

                  {userState?.reviewHistory[activeTab]?.length > 0 ? (
                    <div>
                      {/* Display only the most recent review */}
                      {(() => {
                        const review = userState.reviewHistory[activeTab][0]; // Get most recent
                        return (
                        <div 
                          key={review.id}
                          style={{ 
                            border: '1px solid #ddd', 
                            borderRadius: '6px', 
                            padding: '16px',
                            marginBottom: '12px',
                            backgroundColor: review.status === 'error' ? '#fff5f5' : '#f9f9f9'
                          }}
                        >
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
                              
                              // Parse suggestions if they come as flat array of strings
                              let parsedSuggestions = data.suggestions || [];
                              if (parsedSuggestions.length > 0 && typeof parsedSuggestions[0] === 'string') {
                                // Check if it's the malformed flat array format
                                if (parsedSuggestions[0] === '{') {
                                  const tempSuggestions = [];
                                  let currentObj = {};
                                  let currentKey = null;
                                  
                                  for (let i = 0; i < parsedSuggestions.length; i++) {
                                    const item = parsedSuggestions[i];
                                    
                                    if (item === '{') {
                                      currentObj = {};
                                      currentKey = null;
                                    } else if (item === '}') {
                                      if (Object.keys(currentObj).length > 0) {
                                        tempSuggestions.push(currentObj);
                                      }
                                      currentObj = {};
                                      currentKey = null;
                                    } else if (currentKey === null) {
                                      // This is a key
                                      currentKey = item;
                                    } else {
                                      // This is a value
                                      currentObj[currentKey] = item;
                                      currentKey = null;
                                    }
                                  }
                                  
                                  parsedSuggestions = tempSuggestions;
                                }
                              }
                              
                              return (
                                <>
                                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                                    Attempt {review.attempt_number} - {new Date(review.created_at).toLocaleString()}
                                    <span style={{ marginLeft: '12px', fontWeight: 'bold' }}>Score: {score}</span>
                                  </div>
                            
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
                                          {item.examples && Array.isArray(item.examples) && item.examples.length > 0 && (
                                            <div style={{ marginTop: '6px' }}>
                                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#999', marginBottom: '4px' }}>Examples:</div>
                                              {item.examples.map((ex, i) => (
                                                <div key={i} style={{ 
                                                  fontSize: '13px', 
                                                  fontStyle: 'italic', 
                                                  color: '#555',
                                                  padding: '4px 8px',
                                                  backgroundColor: '#fff',
                                                  borderRadius: '3px',
                                                  marginBottom: '4px'
                                                }}>
                                                  "{ex}"
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
                                {parsedSuggestions && parsedSuggestions.length > 0 && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ marginBottom: '8px' }}>Suggestions:</h4>
                                    {parsedSuggestions.map((suggestion, idx) => {
                                      // Handle if it's a simple string
                                      if (typeof suggestion === 'string') {
                                        return (
                                          <div 
                                            key={idx} 
                                            style={{ 
                                              padding: '12px', 
                                              backgroundColor: '#f5f5f5', 
                                              borderRadius: '4px', 
                                              marginBottom: '8px',
                                              borderLeft: '3px solid #2196F3'
                                            }}
                                          >
                                            {suggestion}
                                          </div>
                                        );
                                      }
                                      
                                      // Handle if it's an object (old format)
                                      return (
                                        <div 
                                          key={idx} 
                                          style={{ 
                                            padding: '12px', 
                                            backgroundColor: '#f5f5f5', 
                                            borderRadius: '4px', 
                                            marginBottom: '8px',
                                            borderLeft: '3px solid #2196F3'
                                          }}
                                        >
                                          {suggestion.title && <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{suggestion.title}</div>}
                                          {suggestion.tip && <div style={{ marginBottom: '4px' }}>{suggestion.tip}</div>}
                                          {suggestion.evidence && (
                                            <div style={{ fontStyle: 'italic', color: '#666', marginBottom: '4px' }}>
                                              <strong>Evidence:</strong>
                                              {Array.isArray(suggestion.evidence) ? (
                                                suggestion.evidence.map((ev, i) => (
                                                  <div key={i} style={{ marginTop: '4px', paddingLeft: '8px' }}>
                                                    {typeof ev === 'object' ? (
                                                      <>
                                                        "{ev.original}"
                                                        {ev.location && (
                                                          <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                                                            (Para {ev.location.paragraph}{ev.location.sentence ? `, Sent ${ev.location.sentence}` : ''})
                                                          </span>
                                                        )}
                                                      </>
                                                    ) : (
                                                      <span>{String(ev)}</span>
                                                    )}
                                                  </div>
                                                ))
                                              ) : (
                                                <span> {String(suggestion.evidence)}</span>
                                              )}
                                            </div>
                                          )}
                                          {suggestion.actions && (
                                            <div style={{ color: '#4CAF50', marginTop: '8px' }}>
                                              <strong>Action:</strong>
                                              {Array.isArray(suggestion.actions) ? (
                                                suggestion.actions.map((action, i) => (
                                                  <div key={i} style={{ marginTop: '4px' }}>
                                                    {typeof action === 'object' ? action.action : String(action)}
                                                  </div>
                                                ))
                                              ) : (
                                                <span> {String(suggestion.actions)}</span>
                                              )}
                                            </div>
                                          )}
                                          {suggestion.fixes && (
                                            <div style={{ color: '#4CAF50', marginTop: '8px' }}>
                                              <strong>Fixes:</strong>
                                              {Array.isArray(suggestion.fixes) ? (
                                                suggestion.fixes.map((fix, i) => (
                                                  <div key={i} style={{ marginTop: '4px' }}>
                                                    {typeof fix === 'object' ? fix.corrected : String(fix)}
                                                  </div>
                                                ))
                                              ) : (
                                                <span> {String(suggestion.fixes)}</span>
                                              )}
                                            </div>
                                          )}
                                          {suggestion.severity && (
                                            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                              Severity: {suggestion.severity}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Sentence Fixes */}
                                {data.sentence_fixes && data.sentence_fixes.length > 0 && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ marginBottom: '8px' }}>Sentence Fixes:</h4>
                                    {data.sentence_fixes.map((fix, idx) => (
                                      <div key={idx} style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
                                        <div style={{ color: '#f44336', marginBottom: '4px' }}>
                                          <strong>Original:</strong> {fix.original}
                                        </div>
                                        <div style={{ color: '#4CAF50', marginBottom: '4px' }}>
                                          <strong>Improved:</strong> {fix.improved}
                                        </div>
                                        {fix.issue && (
                                          <div style={{ color: '#666', fontSize: '14px' }}>
                                            <strong>Issue:</strong> {fix.issue}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                            );
                            } catch (error) {
                              console.error('Error rendering review:', error);
                              return (
                                <div style={{ padding: '12px', backgroundColor: '#fff5f5', color: '#f44336', borderRadius: '4px' }}>
                                  Error displaying results. Please check the console for details.
                                </div>
                              );
                            }
                          })()}
                          {review.status === 'error' && (
                            <div className="error">{review.error_message}</div>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                      No reviews yet. Click "Run Review" to get feedback.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Final Submit */}
            {!userState?.alreadySubmitted && (
              <section style={{ marginBottom: '32px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                  <h2 style={{ marginBottom: '16px' }}>Ready to Submit?</h2>
                  <p style={{ marginBottom: '16px', color: '#666' }}>
                    Once you submit, you won't be able to make any changes or request more reviews.
                  </p>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={submitLoading || !essay.trim() || overLimit}
                    className="primary"
                    style={{ fontSize: '16px', padding: '12px 32px' }}
                  >
                    {submitLoading ? 'Submitting...' : 'Submit Final Essay'}
                  </button>
                </div>
              </section>
            )}

            {error && (
              <div className="error" style={{ padding: '16px', backgroundColor: '#fff5f5', borderRadius: '6px', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
