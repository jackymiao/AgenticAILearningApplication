import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldTokenIcon } from './TokenIcons';
import { useDefenseCountdown } from '../hooks/useDefenseCountdown';

// Use import.meta for Vite, process.env for tests
const API_BASE = typeof process !== 'undefined' && process.env.VITE_API_BASE 
  ? process.env.VITE_API_BASE 
  : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || '/api';

export default function DefenseModal({ 
  attackId, 
  projectCode,
  hasShield,
  onDefend,
  onClose 
}) {
  const [defending, setDefending] = useState(false);
  const defendingRef = useRef(false);
  const handleDefendRef = useRef(null);

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
      // Don't call onClose() - modal will close naturally when queue updates and attackId becomes null
    } catch (err) {
      console.error('Defense error:', err);
      // On error, close the modal
      onClose();
    }
  }, [attackId, projectCode, onDefend, onClose]);

  useEffect(() => {
    handleDefendRef.current = handleDefend;
  }, [handleDefend]);

  useEffect(() => {
    if (!attackId) return;

    defendingRef.current = false;
    setDefending(false);
  }, [attackId]);

  const timeLeft = useDefenseCountdown(
    attackId,
    () => handleDefendRef.current?.(false),
    15,
  );

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
            Another player is trying to destroy one of your passes!
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
                No shield available - you will lose 1 pass
              </div>
            )}
            
            <button
              className="defense-button accept-button"
              data-testid="dont-use-shield-btn"
              onClick={() => handleDefend(false)}
              disabled={defending}
            >
              <span>Accept</span>
              <small>Lose 1 pass</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
