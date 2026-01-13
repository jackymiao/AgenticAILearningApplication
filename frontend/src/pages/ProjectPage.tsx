import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import { publicApi } from '../api/endpoints';

console.log("CODE-INIT: ProjectPage component loaded - if you see this, the code is working!");

export default function ProjectPage() {
  console.log("CODE-RENDER: ProjectPage component rendering");
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
    console.log("CODE-B1: handleRunReview called, category:", category);
    setError('');
    setReviewLoading(true);
    
    try {
      console.log("CODE-B2: Calling submitReview API");
      const result = await publicApi.submitReview(code, userName, essay, category);
      console.log("CODE-B3: API response received:", result);
      
      // Reload user state to get updated attempts and history
      console.log("CODE-B4: Reloading user state");
      const updatedState = await publicApi.getUserState(code, userName);
      console.log("CODE-B5: User state updated:", updatedState);
      setUserState(updatedState);
      
    } catch (err) {
      console.error("CODE-B6: Error:", err);
      setError(err.message);
    } finally {
      setReviewLoading(false);
      console.log("CODE-B7: Review loading finished");
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
                      {console.log("CODE-C1: Rendering review history for tab:", activeTab)}
                      {console.log("CODE-C2: Number of reviews:", userState.reviewHistory[activeTab].length)}
                      {userState.reviewHistory[activeTab].map(review => {
                        console.log("CODE-C3: Processing review:", review.id);
                        // Parse result_json to display structured feedback
                        let result = null;
                        let score = review.score;
                        
                        // Debug: Log what we received
                        console.log('='.repeat(80));
                        console.log('CODE-C4: RAW REVIEW DATA RECEIVED IN FRONTEND:');
                        console.log('='.repeat(80));
                        console.log('Review ID:', review.id);
                        console.log('Status:', review.status);
                        console.log('Score:', review.score);
                        console.log('result_json type:', typeof review.result_json);
                        console.log('\nRAW result_json:');
                        console.log(JSON.stringify(review.result_json, null, 2));
                        console.log('='.repeat(80));
                        
                        try {
                          if (review.status === 'success' && review.result_json) {
                            // Parse the result_json if it's a string
                            let parsedResult = typeof review.result_json === 'string' 
                              ? JSON.parse(review.result_json) 
                              : review.result_json;
                            
                            console.log('\n📋 After first parse:', parsedResult);
                            
                            // Check if result_json has nested result_json (double parsing needed)
                            if (parsedResult && parsedResult.result_json) {
                              parsedResult = typeof parsedResult.result_json === 'string'
                                ? JSON.parse(parsedResult.result_json)
                                : parsedResult.result_json;
                              console.log('📋 After second parse:', parsedResult);
                            }
                            
                            result = parsedResult;
                            
                            // Extract score from result (category_score field)
                            const scoreFields = ['grammar_score', 'structure_score', 'style_score', 'content_score', 'overall_score'];
                            for (const field of scoreFields) {
                              if (result && result[field] !== undefined) {
                                score = result[field];
                                break;
                              }
                            }
                            
                            console.log('\n✅ Final result object:', result);
                            console.log('✅ Final score:', score);
                            console.log('='.repeat(80));
                          }
                        } catch (error) {
                          console.error('❌ Error parsing result_json:', error);
                          result = null;
                        }
                        
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
                            {/* Header with attempt number, date, and score */}
                            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ddd', paddingBottom: '8px' }}>
                              <div>
                                <strong>Attempt {review.attempt_number}</strong>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                  {new Date(review.created_at).toLocaleString()}
                                </div>
                              </div>
                              {score !== null && score !== undefined && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ 
                                    fontSize: '24px', 
                                    fontWeight: 'bold', 
                                    color: 'white',
                                    backgroundColor: score >= 80 ? '#28a745' : '#dc3545',
                                    padding: '8px 16px',
                                    borderRadius: '6px'
                                  }}>
                                    {score}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Score</div>
                                  {result?.score_delta !== undefined && result.score_delta !== 0 && (
                                    <div style={{ fontSize: '12px', color: result.score_delta > 0 ? '#28a745' : '#dc3545', marginTop: '4px' }}>
                                      {result.score_delta > 0 ? '+' : ''}{result.score_delta}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {review.status === 'success' && result ? (
                              <>
                                {/* Overview/Summary */}
                                {(result.overview || result.summary) && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Overview</h4>
                                    <div style={{ 
                                      backgroundColor: 'white',
                                      padding: '12px',
                                      borderRadius: '4px',
                                      border: '1px solid #e0e0e0',
                                      lineHeight: '1.6'
                                    }}>
                                      {result.overview || result.summary}
                                    </div>
                                  </div>
                                )}

                                {/* Breakdown Scores */}
                                {result.breakdown && Object.keys(result.breakdown).length > 0 && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Breakdown</h4>
                                    <div style={{ 
                                      backgroundColor: 'white',
                                      padding: '12px',
                                      borderRadius: '4px',
                                      border: '1px solid #e0e0e0'
                                    }}>
                                      {Object.entries(result.breakdown).map(([key, value]) => (
                                        <div key={key} style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between',
                                          padding: '6px 0',
                                          borderBottom: '1px solid #f0f0f0'
                                        }}>
                                          <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>
                                            {key.replace(/_/g, ' ')}
                                          </span>
                                          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{String(value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Suggestions/Sentence Fixes */}
                                {((result.suggestions && result.suggestions.length > 0) || (result.sentence_fixes && result.sentence_fixes.length > 0)) && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                                      Suggestions
                                    </h4>
                                    <div style={{ 
                                      backgroundColor: 'white',
                                      padding: '12px',
                                      borderRadius: '4px',
                                      border: '1px solid #e0e0e0'
                                    }}>
                                      {(() => {
                                        const suggestionsList = result.suggestions || result.sentence_fixes || [];
                                        
                                        // Check if suggestions are in the malformed string format
                                        if (suggestionsList.length > 0 && typeof suggestionsList[0] === 'string' && suggestionsList[0].includes(':')) {
                                          // Parse flat string suggestions into objects
                                          const parsedSuggestions: any[] = [];
                                          let currentSuggestion: any = {};
                                          
                                          for (const item of suggestionsList) {
                                            const str = String(item);
                                            if (str.startsWith('ID:') && Object.keys(currentSuggestion).length > 0) {
                                              // Start of new suggestion, save previous one
                                              parsedSuggestions.push(currentSuggestion);
                                              currentSuggestion = {};
                                            }
                                            
                                            // Parse key-value pairs
                                            const colonIndex = str.indexOf(':');
                                            if (colonIndex > 0) {
                                              const key = str.substring(0, colonIndex).trim().toLowerCase();
                                              const value = str.substring(colonIndex + 1).trim();
                                              currentSuggestion[key] = value;
                                            }
                                          }
                                          
                                          // Add last suggestion
                                          if (Object.keys(currentSuggestion).length > 0) {
                                            parsedSuggestions.push(currentSuggestion);
                                          }
                                          
                                          // Display parsed suggestions
                                          return parsedSuggestions.map((suggestion: any, idx: number) => (
                                            <div key={idx} style={{ 
                                              marginBottom: idx < parsedSuggestions.length - 1 ? '16px' : 0,
                                              paddingBottom: idx < parsedSuggestions.length - 1 ? '16px' : 0,
                                              borderBottom: idx < parsedSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none'
                                            }}>
                                              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                                                {idx + 1}. {suggestion.title || 'Suggestion'}
                                              </div>
                                              
                                              {suggestion.tip && (
                                                <div style={{ fontSize: '12px', marginBottom: '8px', padding: '8px', backgroundColor: '#e7f3ff', borderLeft: '3px solid #007bff', borderRadius: '3px' }}>
                                                  💡 <strong>Tip:</strong> {suggestion.tip}
                                                </div>
                                              )}
                                              
                                              {suggestion.evidence && (
                                                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                                                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>Evidence:</div>
                                                  <div style={{ fontSize: '12px', padding: '8px', backgroundColor: '#fff5f5', borderLeft: '3px solid #dc3545', borderRadius: '3px', fontStyle: 'italic' }}>
                                                    {suggestion.evidence}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {suggestion.actions && (
                                                <div style={{ marginTop: '8px' }}>
                                                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>Actions:</div>
                                                  <div style={{ fontSize: '12px', padding: '8px', backgroundColor: '#f0f8f0', borderLeft: '3px solid #28a745', borderRadius: '3px' }}>
                                                    {suggestion.actions}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {(suggestion.severity || suggestion.category) && (
                                                <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                                                  {suggestion.severity && <span style={{ marginRight: '12px' }}>Severity: <strong>{suggestion.severity}</strong></span>}
                                                  {suggestion.category && <span>Category: <strong>{suggestion.category}</strong></span>}
                                                </div>
                                              )}
                                            </div>
                                          ));
                                        }
                                        
                                        // Normal processing for properly formatted suggestions
                                        return suggestionsList.map((suggestion: any, idx: number) => {
                                          // Handle string suggestions
                                          if (typeof suggestion === 'string') {
                                            return (
                                              <div key={idx} style={{ 
                                                marginBottom: idx < suggestionsList.length - 1 ? '12px' : 0,
                                                paddingBottom: idx < suggestionsList.length - 1 ? '12px' : 0,
                                                borderBottom: idx < suggestionsList.length - 1 ? '1px solid #f0f0f0' : 'none'
                                              }}>
                                                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                                                  {idx + 1}. {suggestion}
                                                </div>
                                              </div>
                                            );
                                          } 
                                          
                                          // Handle object suggestions with title/tip/evidence structure
                                          if (suggestion && suggestion.title) {
                                            return (
                                              <div key={idx} style={{ 
                                                marginBottom: idx < suggestionsList.length - 1 ? '16px' : 0,
                                                paddingBottom: idx < suggestionsList.length - 1 ? '16px' : 0,
                                                borderBottom: idx < suggestionsList.length - 1 ? '1px solid #f0f0f0' : 'none'
                                              }}>
                                                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                                                  {idx + 1}. {suggestion.title}
                                                </div>
                                                
                                                {suggestion.tip && (
                                                  <div style={{ fontSize: '12px', marginBottom: '8px', padding: '8px', backgroundColor: '#e7f3ff', borderLeft: '3px solid #007bff', borderRadius: '3px' }}>
                                                    💡 <strong>Tip:</strong> {suggestion.tip}
                                                  </div>
                                                )}
                                                
                                                {suggestion.evidence && suggestion.evidence.length > 0 && (
                                                  <div style={{ marginTop: '8px' }}>
                                                    {suggestion.evidence.map((ev: any, evIdx: number) => (
                                                      <div key={evIdx} style={{ marginBottom: '4px' }}>
                                                        {ev.original && (
                                                          <div style={{ fontSize: '12px', padding: '8px', backgroundColor: '#fff5f5', borderLeft: '3px solid #dc3545', borderRadius: '3px' }}>
                                                            <strong style={{ color: '#dc3545' }}>Original:</strong> {ev.original}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                                
                                                {suggestion.fixes && suggestion.fixes.length > 0 && suggestion.fixes[0].corrected && (
                                                  <div style={{ fontSize: '12px', marginTop: '4px', padding: '8px', backgroundColor: '#f0f8f0', borderLeft: '3px solid #28a745', borderRadius: '3px' }}>
                                                    <strong style={{ color: '#28a745' }}>Suggested Fix:</strong> {suggestion.fixes[0].corrected}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                          
                                          // Handle object suggestions with original/improved/issue structure
                                          if (typeof suggestion === 'object' && suggestion !== null && (suggestion.original || suggestion.improved)) {
                                            return (
                                              <div key={idx} style={{ 
                                                marginBottom: idx < suggestionsList.length - 1 ? '12px' : 0,
                                                paddingBottom: idx < suggestionsList.length - 1 ? '12px' : 0,
                                                borderBottom: idx < suggestionsList.length - 1 ? '1px solid #f0f0f0' : 'none'
                                              }}>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                                                  {idx + 1}.
                                                </div>
                                                {suggestion.original && (
                                                  <div style={{ fontSize: '12px', marginBottom: '4px', padding: '8px', backgroundColor: '#fff5f5', borderLeft: '3px solid #dc3545', borderRadius: '3px' }}>
                                                    <strong style={{ color: '#dc3545' }}>Original:</strong> {suggestion.original}
                                                  </div>
                                                )}
                                                {suggestion.improved && (
                                                  <div style={{ fontSize: '12px', marginBottom: '4px', padding: '8px', backgroundColor: '#f0f8f0', borderLeft: '3px solid #28a745', borderRadius: '3px' }}>
                                                    <strong style={{ color: '#28a745' }}>Improved:</strong> {suggestion.improved}
                                                  </div>
                                                )}
                                                {suggestion.issue && (
                                                  <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                                                    💡 Issue: {suggestion.issue}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                          
                                          return null;
                                        });
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : review.status === 'success' && !result ? (
                              <div style={{ 
                                whiteSpace: 'pre-wrap',
                                backgroundColor: 'white',
                                padding: '12px',
                                borderRadius: '4px',
                                border: '1px solid #e0e0e0'
                              }}>
                                No detailed feedback available
                              </div>
                            ) : review.status === 'error' ? (
                              <div style={{ color: '#dc3545', padding: '12px', backgroundColor: 'white', borderRadius: '4px' }}>
                                ❌ Error: {review.error_message}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
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
