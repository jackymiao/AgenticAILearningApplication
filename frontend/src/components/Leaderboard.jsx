import { useState, useEffect, useMemo } from 'react';
import { publicApi } from '../api/endpoints';

// Update interval in milliseconds (configurable)
const LEADERBOARD_UPDATE_INTERVAL = 10000; // 10 seconds

export default function Leaderboard({ projectCode, refreshTrigger, currentUserName }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const normalizedCurrentUserName = useMemo(
    () => (currentUserName ? currentUserName : ''),
    [currentUserName]
  );

  const fetchLeaderboard = async () => {
    try {
      const data = await publicApi.getLeaderboard(projectCode);
      setLeaderboard(data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLeaderboard();

    // Set up interval for periodic updates
    const intervalId = setInterval(fetchLeaderboard, LEADERBOARD_UPDATE_INTERVAL);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [projectCode, refreshTrigger]);

  if (loading) {
    return (
      <div className="leaderboard">
        <h3>🏆 Top Performers</h3>
        <p className="loading-message">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard">
        <h3>🏆 Top Performers</h3>
        <p className="error-message">🌟 No rankings yet... Be the first legend!</p>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <h3>🏆 Top Performers</h3>
      {leaderboard.length === 0 ? (
        <p className="empty-message">🌟 No rankings yet... Be the first legend!</p>
      ) : (
        <div className="leaderboard-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {leaderboard.map((entry) => {
            const isCurrentUser = normalizedCurrentUserName && entry.userName === normalizedCurrentUserName;
            return (
              <div
                key={entry.rank}
                className="leaderboard-entry"
                style={isCurrentUser ? {
                  backgroundColor: '#E9F7EF',
                  borderRadius: '6px',
                  outline: '2px solid #2E7D32',
                  outlineOffset: '-1px'
                } : undefined}
              >
              <span className="rank">#{entry.rank}</span>
              <span className="name" data-testid={`leaderboard-top-${entry.rank}-name`}>{entry.userName}</span>
              <span className="score" data-testid={`leaderboard-top-${entry.rank}-score`}>{entry.score}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
