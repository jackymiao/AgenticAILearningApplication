import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldTokenIcon } from './TokenIcons';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function DefenseModal({ 
  attackId, 
  projectCode,
  hasShield,
  onDefend,
  onClose 
}) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [defending, setDefending] = useState(false);
  const defendingRef = useRef(false);

  const handleDefend = useCallback(async (useShield) => {
    if (defendingRef.current) return;
    
    defendingRef.current = true;
    setDefending(true);
    
    try {
      const response = await fetch(`${API_BASE}/game/projects/${projectCode}/defend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          attackId,
          useShield
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Defense failed');
      }
      
      onDefend(data);
      onClose();
    } catch (err) {
      console.error('Defense error:', err);
      // Even on error, close the modal
      onClose();
    }
  }, [attackId, projectCode, onDefend, onClose]);

  useEffect(() => {
    if (!attackId) return;
    
    // Reset defending state when attackId changes
    defendingRef.current = false;
    setDefending(false);
    setTimeLeft(15);
    
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto accept
          handleDefend(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attackId, handleDefend]);

  if (!attackId) return null;

  return (
    <div className="modal-overlay defense-modal-overlay" data-testid="pending-attack-modal">
      <div className="modal-content defense-modal">
        <div className="defense-header">
          <h2>🚨 Under Attack!</h2>
          <div className="countdown-timer">
            <div className="countdown-circle">
              <svg viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#e0e0e0" 
                  strokeWidth="8"
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#E74C3C" 
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="282.74"
                  strokeDashoffset={282.74 * (1 - timeLeft / 15)}
                  transform="rotate(-90 50 50)"
                  className="countdown-progress"
                />
              </svg>
              <div className="countdown-number">{timeLeft}s</div>
            </div>
          </div>
        </div>
        
        <div className="defense-body">
          <p className="defense-message">
            Someone is trying to steal one of your review tokens!
          </p>
          
          <div className="defense-options">
            {hasShield ? (
              <button
                className="defense-button shield-button"
                data-testid="use-shield-btn"
                onClick={() => handleDefend(true)}
                disabled={defending}
              >
                <ShieldTokenIcon size={24} />
                <span>Use Shield</span>
                <small>Block this attack</small>
              </button>
            ) : (
              <div className="no-shield-notice">
                No shield available - you will lose 1 review token
              </div>
            )}
            
            <button
              className="defense-button accept-button"
              data-testid="dont-use-shield-btn"
              onClick={() => handleDefend(false)}
              disabled={defending}
            >
              <span>Accept</span>
              <small>Lose 1 review token</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
