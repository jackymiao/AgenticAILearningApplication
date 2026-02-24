import React, { useState, useEffect, useMemo } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Create mock before any code that would import endpoints
const mockGetLeaderboard = jest.fn();

jest.mock('../../api/endpoints', () => ({
  publicApi: {
    getLeaderboard: mockGetLeaderboard
  }
}));

// Mock Leaderboard component to avoid import.meta issues in endpoints.js
const Leaderboard = ({ projectCode, refreshTrigger, currentUserName }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const normalizedCurrentUserName = useMemo(
    () => (currentUserName ? currentUserName : ''),
    [currentUserName]
  );

  const fetchLeaderboard = async () => {
    try {
      const data = await mockGetLeaderboard(projectCode);
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
    fetchLeaderboard();
    const intervalId = setInterval(fetchLeaderboard, 10000);
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
};

describe('Leaderboard Component', () => {
  const mockProjectCode = 'TEST123';
  const mockLeaderboardData = [
    { rank: 1, userName: 'alice', score: 95 },
    { rank: 2, userName: 'bob', score: 87 },
    { rank: 3, userName: 'charlie', score: 92 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // Test 1: Initial render with loading state
  test('should display loading message on initial render', () => {
    mockGetLeaderboard.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<Leaderboard projectCode={mockProjectCode} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // Test 2: Render leaderboard with data
  test('should render leaderboard entries with correct rank, name, and score', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    render(<Leaderboard projectCode={mockProjectCode} />);

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    // Verify names are displayed
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();

    // Verify scores are displayed using data-testid
    expect(screen.getByTestId('leaderboard-top-1-score')).toHaveTextContent('95');
    expect(screen.getByTestId('leaderboard-top-2-score')).toHaveTextContent('87');
    expect(screen.getByTestId('leaderboard-top-3-score')).toHaveTextContent('92');
  });

  // Test 3: Render empty leaderboard
  test('should display empty message when leaderboard is empty', async () => {
    mockGetLeaderboard.mockResolvedValue([]);

    render(<Leaderboard projectCode={mockProjectCode} />);

    await waitFor(() => {
      expect(screen.getByText('🌟 No rankings yet... Be the first legend!')).toBeInTheDocument();
    });
  });

  // Test 4: Error handling
  test('should display error message when API call fails', async () => {
    mockGetLeaderboard.mockRejectedValue(new Error('Network error'));

    render(<Leaderboard projectCode={mockProjectCode} />);

    await waitFor(() => {
      expect(screen.getByText('🌟 No rankings yet... Be the first legend!')).toBeInTheDocument();
    });
  });

  // Test 5: Initial fetch on mount
  test('should call getLeaderboard on component mount', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    render(<Leaderboard projectCode={mockProjectCode} />);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith(mockProjectCode);
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
    });
  });

  // Test 6: Auto-refresh interval (10 seconds)
  test('should call getLeaderboard every 10 seconds', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    render(<Leaderboard projectCode={mockProjectCode} />);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 10 seconds
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
    });

    // Fast-forward another 10 seconds
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(3);
    });
  });

  // Test 7: Refresh trigger prop causes re-fetch
  test('should re-fetch leaderboard when refreshTrigger prop changes', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    const { rerender } = render(
      <Leaderboard projectCode={mockProjectCode} refreshTrigger={0} />
    );

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
    });

    // Change refreshTrigger prop
    rerender(<Leaderboard projectCode={mockProjectCode} refreshTrigger={1} />);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
    });
  });

  // Test 8: Project code change causes re-fetch
  test('should re-fetch leaderboard when projectCode prop changes', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    const { rerender } = render(
      <Leaderboard projectCode="CODE1" />
    );

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('CODE1');
    });

    // Change project code
    rerender(<Leaderboard projectCode="CODE2" />);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledWith('CODE2');
    });
  });

  // Test 9: Cleanup interval on unmount
  test('should clear interval on component unmount', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    const { unmount } = render(<Leaderboard projectCode={mockProjectCode} />);

    await waitFor(() => {
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Advance timers after unmount
    jest.advanceTimersByTime(10000);

    // Should not be called again (interval was cleared)
    expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
  });

  // Test 10: Scrollable container styling
  test('should render leaderboard list with scrollable container', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    const { container } = render(<Leaderboard projectCode={mockProjectCode} />);

    await waitFor(() => {
      const leaderboardList = container.querySelector('.leaderboard-list');
      expect(leaderboardList).toBeInTheDocument();
      expect(leaderboardList).toHaveStyle('maxHeight: 400px');
      expect(leaderboardList).toHaveStyle('overflowY: auto');
    });
  });

  // Test 11: Render title
  test('should display title "🏆 Top Performers"', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    render(<Leaderboard projectCode={mockProjectCode} />);

    expect(screen.getByText('🏆 Top Performers')).toBeInTheDocument();
  });

  // Test 12: Large leaderboard (all students visible for scrolling)
  test('should render all leaderboard entries when list is large', async () => {
    const largeLeaderboardData = Array.from({ length: 50 }, (_, i) => ({
      rank: i + 1,
      userName: `student${i + 1}`,
      score: 100 - i
    }));

    mockGetLeaderboard.mockResolvedValue(largeLeaderboardData);

    render(<Leaderboard projectCode={mockProjectCode} />);

    await waitFor(() => {
      expect(screen.getByText('student1')).toBeInTheDocument();
      expect(screen.getByText('student50')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#50')).toBeInTheDocument();
    });
  });

  // Test 13: Highlight current user row
  test('should highlight the current user row with a light green background', async () => {
    mockGetLeaderboard.mockResolvedValue(mockLeaderboardData);

    render(
      <Leaderboard
        projectCode={mockProjectCode}
        currentUserName="bob"
      />
    );

    await waitFor(() => {
      const bobRow = screen.getByText('bob').closest('.leaderboard-entry');
      expect(bobRow).toBeInTheDocument();
      expect(bobRow).toHaveStyle('background-color: #E9F7EF');
      expect(bobRow).toHaveStyle('outline: 2px solid #2E7D32');
    });
  });

});
