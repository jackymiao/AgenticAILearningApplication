import { useState, useEffect } from 'react';
import { ReviewTokenIcon, ShieldTokenIcon } from './TokenIcons';

// Use import.meta for Vite, process.env for tests
const API_BASE = typeof process !== 'undefined' && process.env.VITE_API_BASE 
  ? process.env.VITE_API_BASE 
  : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || '/api';

export default function AttackModal({ 
  isOpen, 
  onClose, 
  projectCode, 
  currentUserName,
  onAttack 
}) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attacking, setAttacking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchActivePlayers();
    }
  }, [isOpen]);

  const fetchActivePlayers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE}/game/projects/${projectCode}/active-players?userName=${encodeURIComponent(currentUserName)}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch players');
      }
      
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAttack = async (targetName) => {
    if (attacking) return;
    
    setAttacking(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/game/projects/${projectCode}/attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          attackerName: currentUserName,
          targetName
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Attack failed');
      }
      
      onAttack(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setAttacking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content attack-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚔️ Choose Your Target</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {error && (
            <div className="error-message" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="loading-players">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="no-players">
              No other players are currently active.
            </div>
          ) : (
            <div className="player-list" data-testid="target-list">
              {players.map((player) => (
                <div 
                  key={player.userName} 
                  className={`player-item ${!player.canAttack ? 'disabled' : ''}`}
                  data-testid="target-row"
                >
                  <div className="player-info">
                    <div className="player-name" data-testid="target-name">{player.userName}</div>
                    <div className="player-tokens">
                      <span className="token-badge" data-testid="target-review-tokens">
                        <ReviewTokenIcon size={16} />
                        {player.reviewTokens}
                      </span>
                      <span className="token-badge" data-testid="target-shield-tokens">
                        <ShieldTokenIcon size={16} />
                        {player.shieldTokens}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    className="attack-button"
                    data-testid="attack-btn"
                    onClick={() => handleAttack(player.userName)}
                    disabled={!player.canAttack || attacking}
                  >
                    {!player.canAttack ? (
                      player.reviewTokens === 0 ? '🛡️ Protected' : '✓ Attacked'
                    ) : attacking ? (
                      'Attacking...'
                    ) : (
                      '⚔️ Attack'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
