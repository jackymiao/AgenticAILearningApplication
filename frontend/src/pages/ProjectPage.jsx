import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import Leaderboard from '../components/Leaderboard';
import ReviewLoadingAnimation from '../components/ReviewLoadingAnimation';
import TokenDisplay from '../components/TokenDisplay';
import AttackModal from '../components/AttackModal';
import DefenseModal from '../components/DefenseModal';
import FeedbackModal from '../components/FeedbackModal';
import { publicApi, gameApi } from '../api/endpoints';
import { useWebSocket } from '../hooks/useWebSocket';

export default function ProjectPage() {
  const { code } = useParams();
  const [project, setProject] = useState(null);
  const [userName, setUserName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [userNameSubmitted, setUserNameSubmitted] = useState(false);
  const [essay, setEssay] = useState('');
  const [userState, setUserState] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [showCongratsMessage, setShowCongratsMessage] = useState(false);
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  
  // Game state
  const [tokens, setTokens] = useState(null);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [incomingAttackId, setIncomingAttackId] = useState(null);
  const [attackWaitingResult, setAttackWaitingResult] = useState(false);
  const [cooldownEnds, setCooldownEnds] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Load saved student name/id and essay from localStorage on mount
  useEffect(() => {
    const savedUserName = localStorage.getItem(`project_${code}_studentName`);
    const savedStudentId = localStorage.getItem(`project_${code}_studentId`);
    
    if (savedUserName && savedStudentId) {
      setUserName(savedUserName);
      setStudentId(savedStudentId);
      setUserNameSubmitted(true);
      
      // Load essay for this specific user
      const savedEssay = localStorage.getItem(`project_${code}_${savedUserName}_essay`);
      if (savedEssay) {
        setEssay(savedEssay);
      }
      
      // Auto-load user state
      loadUserStateWithName(savedUserName);
    }
  }, [code]);

  // Save essay to localStorage whenever it changes
  useEffect(() => {
    if (essay && userNameSubmitted && userName) {
      localStorage.setItem(`project_${code}_${userName}_essay`, essay);
    }
  }, [essay, code, userNameSubmitted, userName]);

  useEffect(() => {
    loadProject();
  }, [code]);

  const loadUserStateWithName = async (name) => {
    try {
      const data = await publicApi.getUserState(code, name);
      setUserState(data);
      setError('');
      
      // Restore finalScore from review history if available
      const allReviews = Object.values(data.reviewHistory).flat();
      if (allReviews.length > 0) {
        const mostRecentReview = allReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        if (mostRecentReview.status === 'success' && mostRecentReview.result_json) {
          try {
            const resultData = typeof mostRecentReview.result_json === 'string' 
              ? JSON.parse(mostRecentReview.result_json)
              : mostRecentReview.result_json;
            setFinalScore(resultData.score || 0);
          } catch (e) {
            console.error('Error parsing result_json for final score:', e);
          }
        }
      }
      
      // Initialize player in game system
      await initializePlayerWithName(name);
    } catch (err) {
      // If user state fails, clear saved student info
      localStorage.removeItem(`project_${code}_studentName`);
      localStorage.removeItem(`project_${code}_studentId`);
      setUserNameSubmitted(false);
      setError(err.message);
    }
  };

  const initializePlayerWithName = async (name) => {
    try {
      const playerData = await gameApi.initPlayer(code, name);
      setTokens({
        reviewTokens: playerData.reviewTokens,
        attackTokens: playerData.attackTokens,
        shieldTokens: playerData.shieldTokens
      });
      
      // Set cooldown if exists
      if (playerData.cooldownRemaining > 0) {
        const endsAt = Date.now() + playerData.cooldownRemaining;
        setCooldownEnds(endsAt);
      }
    } catch (err) {
      console.error('Failed to initialize player:', err);
    }
  };

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

  // Initialize player and get tokens
  const initializePlayer = useCallback(async () => {
    try {
      const playerData = await gameApi.initPlayer(code, userName);
      setTokens({
        reviewTokens: playerData.reviewTokens,
        attackTokens: playerData.attackTokens,
        shieldTokens: playerData.shieldTokens
      });
      
      // Set cooldown if exists
      if (playerData.cooldownRemaining > 0) {
        const endsAt = Date.now() + playerData.cooldownRemaining;
        setCooldownEnds(endsAt);
      }
    } catch (err) {
      console.error('Failed to initialize player:', err);
    }
  }, [code, userName]);
  
  // WebSocket connection for real-time game events
  useWebSocket(
    code,
    userNameSubmitted ? userName : null,
    (attackId) => {
      // Handle incoming attack
      console.log('Incoming attack:', attackId);
      setIncomingAttackId(attackId);
    },
    async (updatedTokens) => {
      // Handle token update
      console.log('Tokens updated:', updatedTokens);
      setTokens({
        reviewTokens: updatedTokens.review_tokens,
        attackTokens: updatedTokens.attack_tokens,
        shieldTokens: updatedTokens.shield_tokens
      });
      
      // Also update userState to reflect review_tokens as attemptsRemaining
      try {
        const updatedState = await publicApi.getUserState(code, userName);
        setUserState(updatedState);
      } catch (err) {
        console.error('Failed to reload user state after token update:', err);
      }
    },
    (result) => {
      // Handle attack result
      console.log('Attack result:', result);
      setAttackWaitingResult(false);
      if (result.success) {
        alert('✅ ' + result.message);
        // Refresh tokens
        initializePlayer();
      } else {
        alert('🛡️ ' + result.message);
      }
    }
  );
  
  // Heartbeat to maintain active session
  useEffect(() => {
    if (!userNameSubmitted || !userName) return;
    
    const sendHeartbeat = async () => {
      try {
        await gameApi.sendHeartbeat(code, userName, sessionId);
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    };
    
    // Send immediately
    sendHeartbeat();
    
    // Then every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);
    
    return () => clearInterval(interval);
  }, [userNameSubmitted, userName, code, sessionId]);
  
  // Cooldown timer
  useEffect(() => {
    if (!cooldownEnds) {
      setCooldownRemaining(0);
      return;
    }
    
    const updateCooldown = () => {
      const remaining = Math.max(0, cooldownEnds - Date.now());
      setCooldownRemaining(remaining);
      
      if (remaining === 0) {
        setCooldownEnds(null);
      }
    };
    
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    
    return () => clearInterval(interval);
  }, [cooldownEnds]);

  const handleRunReview = async () => {
    setError('');
    setReviewLoading(true);
    
    console.log('[FRONTEND] Submitting review with:');
    console.log('  Project Code:', code);
    console.log('  User Name:', userName);
    console.log('  Essay length:', essay.length, 'characters');
    console.log('  Essay word count:', essay.split(/\s+/).length, 'words');
    console.log('  Essay preview:', essay.substring(0, 100) + '...');
    
    try {
      const result = await publicApi.submitReview(code, userName, essay);
      console.log('[FRONTEND] API Response:', result);
      
      // Clear any previous errors on success
      setError('');
      
      // Update tokens from response
      if (result.tokens) {
        setTokens({
          reviewTokens: result.tokens.review_tokens,
          attackTokens: result.tokens.attack_tokens,
          shieldTokens: result.tokens.shield_tokens
        });
      }
      
      // Set cooldown
      if (result.cooldownMs) {
        const endsAt = Date.now() + result.cooldownMs;
        setCooldownEnds(endsAt);
      }
      
      // Result contains { reviews: [], finalScore: number, attemptsRemaining: number }
      if (result.finalScore !== undefined) {
        setFinalScore(result.finalScore);
      }
      
      // Reload user state to get updated attempts and history
      const updatedState = await publicApi.getUserState(code, userName);
      setUserState(updatedState);
      
      // Trigger leaderboard refresh
      setLeaderboardRefresh(prev => prev + 1);
      
    } catch (err) {
      console.error('[FRONTEND] Error:', err);
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
      setShowCongratsMessage(true);
      
      // Reload user state
      const updatedState = await publicApi.getUserState(code, userName);
      setUserState(updatedState);
      
      alert('Essay submitted successfully!');
      
      // Check if feedback is enabled and user hasn't submitted yet
      console.log('[FEEDBACK DEBUG] project.enable_feedback:', project?.enable_feedback);
      if (project?.enable_feedback) {
        try {
          console.log('[FEEDBACK DEBUG] Checking feedback status...');
          const feedbackCheck = await publicApi.checkFeedback(code, userName);
          console.log('[FEEDBACK DEBUG] feedbackCheck:', feedbackCheck);
          if (!feedbackCheck.hasSubmitted) {
            console.log('[FEEDBACK DEBUG] Showing feedback modal');
            setShowFeedbackModal(true);
          } else {
            console.log('[FEEDBACK DEBUG] User already submitted feedback');
          }
        } catch (err) {
          console.error('[FEEDBACK DEBUG] Failed to check feedback status:', err);
        }
      } else {
        console.log('[FEEDBACK DEBUG] Feedback not enabled for this project');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };
  
  const handleAttackClick = () => {
    if (!tokens || tokens.attackTokens < 1) {
      alert('You need an attack token to attack! Submit a review to gain one.');
      return;
    }
    setShowAttackModal(true);
  };
  
  const handleAttackInitiated = async (result) => {
    console.log('Attack initiated:', result);
    setAttackWaitingResult(true);
    
    // Update tokens immediately if provided
    if (result.tokens) {
      setTokens({
        reviewTokens: result.tokens.review_tokens,
        attackTokens: result.tokens.attack_tokens,
        shieldTokens: result.tokens.shield_tokens
      });
    }
    
    // Reload user state to update attempts remaining
    try {
      const updatedState = await publicApi.getUserState(code, userName);
      setUserState(updatedState);
    } catch (err) {
      console.error('Failed to reload user state after attack:', err);
    }
    
    // Modal will close itself
  };
  
  const handleDefenseResponse = useCallback(async (result) => {
    console.log('Defense response:', result);
    if (result.tokens) {
      setTokens({
        reviewTokens: result.tokens.review_tokens,
        attackTokens: result.tokens.attack_tokens,
        shieldTokens: result.tokens.shield_tokens
      });
    }
    setIncomingAttackId(null);
    
    // Refresh player state
    await initializePlayer();
  }, [initializePlayer]);

  const handleDefenseClose = useCallback(() => {
    setIncomingAttackId(null);
  }, []);
  
  const formatCooldown = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  const categories = ['content', 'structure', 'mechanics'];
  
  const getCategoryDisplayName = (cat) => {
    const names = {
      content: 'Story Content',
      structure: 'Narration Skills',
      mechanics: 'Language Use & Mechanics'
    };
    return names[cat];
  };

  return (
    <PageContainer>
      {reviewLoading && <ReviewLoadingAnimation />}
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
              <div>Review Attempts Allowed: <strong>{project.attempt_limit_per_category}</strong></div>
            </div>
          </div>
        </section>

        {/* YouTube Video and Leaderboard */}
        {project.youtube_url && (
          <section style={{ marginBottom: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
              {/* Video */}
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
                <iframe
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  src={project.youtube_url.replace('watch?v=', 'embed/')}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              
              {/* Leaderboard */}
              <div>
                <Leaderboard projectCode={code} refreshTrigger={leaderboardRefresh} />
              </div>
            </div>
          </section>
        )}

        {/* Student Access */}
        {!userNameSubmitted && (
          <section style={{ marginBottom: '32px' }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginBottom: '12px' }}>Student Access Required</h2>
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Please return to the home page and enter your project code and student ID.
              </p>
              <Link to="/">
                <button className="primary">Back to Home</button>
              </Link>
            </div>
          </section>
        )}

        {userNameSubmitted && (
          <>
            <section style={{ marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Signed in as</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{userName}</div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Student ID: {studentId}</div>
              </div>
            </section>
            {/* Token Display */}
            {tokens && (
              <section style={{ marginBottom: '24px' }}>
                <TokenDisplay 
                  reviewTokens={tokens.reviewTokens}
                  attackTokens={tokens.attackTokens}
                  shieldTokens={tokens.shieldTokens}
                />
              </section>
            )}
            
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

            {/* Submit for Review Button */}
            {!userState?.alreadySubmitted && (
              <section style={{ marginBottom: '32px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                  <h3 style={{ marginBottom: '12px' }}>Get AI Feedback</h3>
                  <p style={{ marginBottom: '16px', color: '#666' }}>
                    {userState && `${userState.attemptsRemaining} review${userState.attemptsRemaining !== 1 ? 's' : ''} remaining`}
                  </p>
                  
                  {error && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#fff5f5', 
                      border: '2px solid #f44336',
                      borderRadius: '6px', 
                      marginBottom: '16px',
                      color: '#d32f2f',
                      fontWeight: '500'
                    }}>
                      ⚠️ {error}
                    </div>
                  )}
                  
                  <button
                    onClick={handleRunReview}
                    disabled={
                      reviewLoading || 
                      !essay.trim() || 
                      overLimit ||
                      cooldownRemaining > 0 ||
                      (tokens && tokens.reviewTokens < 1) ||
                      userState?.attemptsRemaining <= 0
                    }
                    className="primary"
                    data-testid="submit-review-btn"
                    style={{ fontSize: '16px', padding: '12px 32px', width: '280px' }}
                  >
                    {reviewLoading ? 'Processing...' : cooldownRemaining > 0 ? `Wait ${formatCooldown(cooldownRemaining)}` : tokens && tokens.reviewTokens < 1 ? 'No Review Tokens' : 'Submit for Review'}
                  </button>
                  
                  {/* Attack Button */}
                  {tokens && tokens.attackTokens > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <button
                        onClick={handleAttackClick}
                        disabled={attackWaitingResult}
                        data-testid="attack-player-btn"
                        style={{
                          background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
                          color: 'white',
                          padding: '12px 32px',
                          fontSize: '16px',
                          fontWeight: '600',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: attackWaitingResult ? 'not-allowed' : 'pointer',
                          opacity: attackWaitingResult ? 0.6 : 1,
                          width: '280px'
                        }}
                      >
                        {attackWaitingResult ? '⏳ Waiting for result...' : '⚔️ Attack Another Player'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
            
            {/* Modals */}
            <AttackModal
              isOpen={showAttackModal}
              onClose={() => setShowAttackModal(false)}
              projectCode={code}
              currentUserName={userName}
              onAttack={handleAttackInitiated}
            />
            
            <DefenseModal
              attackId={incomingAttackId}
              projectCode={code}
              hasShield={tokens && tokens.shieldTokens > 0}
              onDefend={handleDefenseResponse}
              onClose={handleDefenseClose}
            />

            {/* Congratulations Message */}
            {showCongratsMessage && (
              <section style={{ marginBottom: '16px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FFF7E6, #FFFFFF)',
                  border: '2px solid #F4C542',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '26px', fontWeight: '700', color: '#9C6B00' }}>
                    🎉 Congratulations!!! {userName}
                  </div>
                </div>
              </section>
            )}

            {/* Final Score Display */}
            {finalScore !== null && (
              <section style={{ marginBottom: '32px' }}>
                <div style={{ 
                  backgroundColor: 'white', 
                  padding: '24px', 
                  borderRadius: '8px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <h3 style={{ marginBottom: '8px' }}>Overall Score</h3>
                  <div style={{ 
                    fontSize: '48px', 
                    fontWeight: 'bold', 
                    color: finalScore >= 80 ? '#4CAF50' : finalScore >= 60 ? '#ff9800' : '#f44336'
                  }}>
                    {finalScore}/100
                  </div>
                </div>
              </section>
            )}

            {/* AI Review Tabs */}
            <section style={{ marginBottom: '32px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ borderBottom: '1px solid #ddd', display: 'flex' }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        console.log('Tab clicked:', cat, 'Reviews available:', userState?.reviewHistory[cat]);
                        setActiveTab(cat);
                      }}
                      style={{
                        flex: 1,
                        padding: '16px',
                        backgroundColor: activeTab === cat ? 'white' : '#f5f5f5',
                        borderBottom: activeTab === cat ? '2px solid #007bff' : 'none',
                        fontWeight: activeTab === cat ? 'bold' : 'normal'
                      }}
                    >
                      {getCategoryDisplayName(cat)}
                    </button>
                  ))}
                </div>
                
                <div style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px' }}>{getCategoryDisplayName(activeTab)} Review</h3>

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
                              // Handle result_json - it might be a string or object depending on how it was stored
                              const data = typeof review.result_json === 'string' 
                                ? JSON.parse(review.result_json) 
                                : review.result_json;
                              const score = data.score || 0;
                              const scoreColor = score >= 80 ? '#4CAF50' : score >= 60 ? '#ff9800' : '#f44336';
                              
                              return (
                                <>
                                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                                    Attempt {review.attempt_number} - {new Date(review.created_at).toLocaleString()}
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

                                    {/* What's Good */}
                                    {data.overview?.good && data.overview.good.length > 0 && (
                                      <div style={{ marginBottom: '16px' }}>
                                        <h4 style={{ marginBottom: '8px', color: '#4CAF50' }}>✓ Strengths:</h4>
                                        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                                          {data.overview.good.map((item, idx) => (
                                            <li key={idx} style={{ marginBottom: '6px', color: '#333' }}>{item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* What to Improve */}
                                    {data.overview?.improve && data.overview.improve.length > 0 && (
                                      <div style={{ marginBottom: '16px' }}>
                                        <h4 style={{ marginBottom: '8px', color: '#ff9800' }}>⚠ Areas for Improvement:</h4>
                                        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                                          {data.overview.improve.map((item, idx) => (
                                            <li key={idx} style={{ marginBottom: '6px', color: '#333' }}>{item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Suggestions */}
                                    {data.suggestions && data.suggestions.length > 0 && (
                                      <div style={{ marginBottom: '16px' }}>
                                        <h4 style={{ marginBottom: '8px', color: '#2196F3' }}>💡 Suggestions:</h4>
                                        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                                          {data.suggestions.map((suggestion, idx) => (
                                            <li key={idx} style={{ marginBottom: '6px', color: '#333' }}>
                                              {typeof suggestion === 'string' ? suggestion : JSON.stringify(suggestion)}
                                            </li>
                                          ))}
                                        </ul>
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
                      No reviews yet. Click "Submit for Review" to get feedback.
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
          </>
        )}
      </div>
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          projectCode={code}
          userName={userName}
          essay={essay}
          onClose={(submitted) => {
            setShowFeedbackModal(false);
            if (submitted) {
              console.log('Feedback submitted successfully');
            }
          }}
        />
      )}
    </PageContainer>
  );
}
