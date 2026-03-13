import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import ProjectPage from '../ProjectPage';
import { publicApi, gameApi } from '../../api/endpoints';
import { useWebSocket } from '../../hooks/useWebSocket';

jest.mock('../../api/endpoints', () => ({
  publicApi: {
    getProject: jest.fn(),
    validateStudent: jest.fn(),
    getUserState: jest.fn(),
    submitReview: jest.fn(),
    submitFinal: jest.fn(),
    checkFeedback: jest.fn(),
  },
  gameApi: {
    initPlayer: jest.fn(),
    sendHeartbeat: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

jest.mock('../../hooks/useQueue', () => {
  // Self-contained real-state queue: no out-of-scope refs, re-renders happen naturally.
  const React = require('react');
  return {
    useQueue: () => {
      const [items, setItems] = React.useState([]);
      return {
        enqueue: (item) => setItems((prev) => [...prev, item]),
        dequeue: () => setItems((prev) => prev.slice(1)),
        peek: () => items[0] ?? null,
        size: () => items.length,
        isEmpty: () => items.length === 0,
        clear: () => setItems([]),
      };
    },
  };
});

jest.mock('../../components/AttackModal', () => ({
  __esModule: true,
  default: ({ isOpen, onAttack }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="attack-modal">
        <button
          data-testid="confirm-attack"
          onClick={() => onAttack({
            tokens: {
              review_tokens: 2,
              attack_tokens: 0,
              shield_tokens: 1,
            },
          })}
        >
          Confirm Attack
        </button>
      </div>
    );
  },
}));

jest.mock('../../components/DefenseModal', () => ({
  __esModule: true,
  default: ({ attackId, onDefend }) => {
    if (!attackId) return null;
    return (
      <div data-testid="defense-modal">
        <div data-testid="incoming-attack-id">{attackId}</div>
        <button data-testid="defend-btn" onClick={() => onDefend({ tokens: { review_tokens: 3, attack_tokens: 1, shield_tokens: 0 } })}>
          Defend
        </button>
      </div>
    );
  },
}));

jest.mock('../../components/FeedbackModal', () => ({
  __esModule: true,
  default: () => <div data-testid="feedback-modal">Feedback Modal</div>,
}));

jest.mock('../../components/Leaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="leaderboard">Leaderboard</div>,
}));

describe('ProjectPage', () => {
  const renderProjectPage = () => {
    return render(
      <BrowserRouter>
        <ProjectPage />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    useParams.mockReturnValue({ code: 'TEST01' });
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    publicApi.getProject.mockResolvedValue({
      code: 'TEST01',
      title: 'Test Project',
      description: 'Project description',
      word_limit: 150,
      attempt_limit_per_category: 3,
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      enable_feedback: true,
    });
  });

  it('shows student access form before login', async () => {
    renderProjectPage();

    await waitFor(() => {
      expect(screen.getByText('Student Access Required')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter project password')).toBeInTheDocument();
    });

    expect(screen.queryByText('Your Essay')).not.toBeInTheDocument();
  });

  it('validates with student ID and project password and then reveals writing UI', async () => {
    publicApi.validateStudent.mockResolvedValue({
      studentName: 'Jane Smith',
      studentId: 'JS1234',
    });

    publicApi.getUserState.mockResolvedValue({
      alreadySubmitted: false,
      attemptsRemaining: 3,
      reviewHistory: {
        content: [],
        structure: [],
        mechanics: [],
      },
      cooldownRemaining: 0,
    });

    gameApi.initPlayer.mockResolvedValue({
      reviewTokens: 3,
      attackTokens: 0,
      shieldTokens: 1,
      cooldownRemaining: 0,
    });

    renderProjectPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter student ID'), { target: { value: 'js1234' } });
    fireEvent.change(screen.getByPlaceholderText('Enter project password'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(publicApi.validateStudent).toHaveBeenCalledWith('TEST01', 'JS1234', 'pass123');
      expect(publicApi.getUserState).toHaveBeenCalledWith('TEST01', 'Jane Smith');
      expect(gameApi.initPlayer).toHaveBeenCalledWith('TEST01', 'Jane Smith');
    });

    await waitFor(() => {
      expect(screen.getByText('Your Essay')).toBeInTheDocument();
      expect(screen.getByText('Signed in as')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Student Access Required')).not.toBeInTheDocument();
    });
  });

  it('shows error when login fails', async () => {
    publicApi.validateStudent.mockRejectedValue(new Error('Invalid project password'));

    renderProjectPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter student ID'), { target: { value: 'JS1234' } });
    fireEvent.change(screen.getByPlaceholderText('Enter project password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Invalid project password')).toBeInTheDocument();
    });
  });

  it('shows disabled banner and disables review/final submit buttons when project is disabled', async () => {
    const disabledError = new Error('This project is currently disabled');
    disabledError.status = 403;

    // First call from initial load succeeds, subsequent availability check fails as disabled.
    publicApi.getProject
      .mockResolvedValueOnce({
        code: 'TEST01',
        title: 'Test Project',
        description: 'Project description',
        word_limit: 150,
        attempt_limit_per_category: 3,
        youtube_url: '',
      })
      .mockRejectedValue(disabledError);

    publicApi.getUserState.mockResolvedValue({
      alreadySubmitted: false,
      attemptsRemaining: 3,
      reviewHistory: {
        content: [],
        structure: [],
        mechanics: [],
      },
      cooldownRemaining: 0,
    });

    gameApi.initPlayer.mockResolvedValue({
      reviewTokens: 3,
      attackTokens: 0,
      shieldTokens: 0,
      cooldownRemaining: 0,
    });

    window.localStorage.setItem('project_TEST01_studentName', 'Jane Smith');
    window.localStorage.setItem('project_TEST01_studentId', 'JS1234');
    window.localStorage.setItem('project_TEST01_Jane Smith_essay', 'This is my essay.');

    renderProjectPage();

    await waitFor(() => {
      expect(screen.getByText('Project is currently disabled. Review and final submission are unavailable.')).toBeInTheDocument();
    });

    expect(screen.getByTestId('submit-review-btn')).toBeDisabled();
    expect(screen.getByText('Submit Final Essay')).toBeDisabled();
  });

  it('updates UI state after successful review submit', async () => {
    publicApi.validateStudent.mockResolvedValue({
      studentName: 'Jane Smith',
      studentId: 'JS1234',
    });

    publicApi.getUserState
      .mockResolvedValueOnce({
        alreadySubmitted: false,
        attemptsRemaining: 3,
        reviewHistory: {
          content: [],
          structure: [],
          mechanics: [],
        },
        cooldownRemaining: 0,
      })
      .mockResolvedValueOnce({
        alreadySubmitted: false,
        attemptsRemaining: 2,
        reviewHistory: {
          content: [{ id: 1, category: 'content', status: 'success', result_json: { score: 90 }, attempt_number: 1, created_at: new Date().toISOString() }],
          structure: [{ id: 2, category: 'structure', status: 'success', result_json: { score: 80 }, attempt_number: 1, created_at: new Date().toISOString() }],
          mechanics: [{ id: 3, category: 'mechanics', status: 'success', result_json: { score: 70 }, attempt_number: 1, created_at: new Date().toISOString() }],
        },
        cooldownRemaining: 0,
      });

    publicApi.submitReview.mockResolvedValue({
      tokens: {
        review_tokens: 2,
        attack_tokens: 1,
        shield_tokens: 1,
      },
      cooldownMs: 60_000,
      reviews: [
        { category: 'content', score: 90 },
        { category: 'structure', score: 80 },
        { category: 'mechanics', score: 70 },
      ],
    });

    gameApi.initPlayer.mockResolvedValue({
      reviewTokens: 3,
      attackTokens: 0,
      shieldTokens: 1,
      cooldownRemaining: 0,
    });

    renderProjectPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter student ID'), { target: { value: 'js1234' } });
    fireEvent.change(screen.getByPlaceholderText('Enter project password'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Your Essay')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Write your essay here...'), {
      target: { value: 'This is a complete essay for review.' },
    });

    fireEvent.click(screen.getByTestId('submit-review-btn'));

    await waitFor(() => {
      expect(publicApi.submitReview).toHaveBeenCalledWith('TEST01', 'Jane Smith', 'This is a complete essay for review.');
      expect(publicApi.getUserState).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText('80/100')).toBeInTheDocument();
    expect(screen.getByTestId('submit-review-btn')).toHaveTextContent('Wait 1:00');
  });

  it('wires websocket attack callback to queue and attack action refresh', async () => {
    publicApi.validateStudent.mockResolvedValue({
      studentName: 'Jane Smith',
      studentId: 'JS1234',
    });

    publicApi.getUserState
      .mockResolvedValueOnce({
        alreadySubmitted: false,
        attemptsRemaining: 3,
        reviewHistory: {
          content: [],
          structure: [],
          mechanics: [],
        },
        cooldownRemaining: 0,
      })
      .mockResolvedValueOnce({
        alreadySubmitted: false,
        attemptsRemaining: 2,
        reviewHistory: {
          content: [],
          structure: [],
          mechanics: [],
        },
        cooldownRemaining: 0,
      })
      .mockResolvedValueOnce({
        alreadySubmitted: false,
        attemptsRemaining: 2,
        reviewHistory: {
          content: [],
          structure: [],
          mechanics: [],
        },
        cooldownRemaining: 0,
      });

    gameApi.initPlayer.mockResolvedValue({
      reviewTokens: 2,
      attackTokens: 1,
      shieldTokens: 1,
      cooldownRemaining: 0,
    });

    renderProjectPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter student ID'), { target: { value: 'js1234' } });
    fireEvent.change(screen.getByPlaceholderText('Enter project password'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(useWebSocket).toHaveBeenCalled();
      expect(screen.getByTestId('attack-player-btn')).toBeInTheDocument();
    });

    const onAttackReceived = useWebSocket.mock.calls[0][2];
    onAttackReceived('attack-xyz');

    // Defense modal must appear — proves onAttackReceived enqueued the attack
    await waitFor(() => {
      expect(screen.getByTestId('defense-modal')).toBeInTheDocument();
      expect(screen.getByTestId('incoming-attack-id')).toHaveTextContent('attack-xyz');
    });

    fireEvent.click(screen.getByTestId('attack-player-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('attack-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('confirm-attack'));

    await waitFor(() => {
      expect(publicApi.getUserState).toHaveBeenLastCalledWith('TEST01', 'Jane Smith');
    });
  });

  it('opens feedback modal after successful final submit when feedback is enabled', async () => {
    publicApi.validateStudent.mockResolvedValue({
      studentName: 'Jane Smith',
      studentId: 'JS1234',
    });

    publicApi.getUserState
      .mockResolvedValueOnce({
        alreadySubmitted: false,
        attemptsRemaining: 3,
        reviewHistory: {
          content: [],
          structure: [],
          mechanics: [],
        },
        cooldownRemaining: 0,
      })
      .mockResolvedValueOnce({
        alreadySubmitted: true,
        attemptsRemaining: 3,
        reviewHistory: {
          content: [],
          structure: [],
          mechanics: [],
        },
        cooldownRemaining: 0,
      });

    gameApi.initPlayer.mockResolvedValue({
      reviewTokens: 3,
      attackTokens: 0,
      shieldTokens: 1,
      cooldownRemaining: 0,
    });

    publicApi.submitFinal.mockResolvedValue({ ok: true });
    publicApi.checkFeedback.mockResolvedValue({ hasSubmitted: false });

    renderProjectPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter student ID'), { target: { value: 'js1234' } });
    fireEvent.change(screen.getByPlaceholderText('Enter project password'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Your Essay')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Write your essay here...'), {
      target: { value: 'Final essay text for submission.' },
    });

    fireEvent.click(screen.getByText('Submit Final Essay'));

    await waitFor(() => {
      expect(publicApi.submitFinal).toHaveBeenCalledWith('TEST01', 'Jane Smith', 'Final essay text for submission.');
      expect(publicApi.checkFeedback).toHaveBeenCalledWith('TEST01', 'Jane Smith');
      expect(screen.getByTestId('feedback-modal')).toBeInTheDocument();
    });
  });

  it('renders defense modal on incoming websocket attack and clears it after defending', async () => {
    publicApi.validateStudent.mockResolvedValue({
      studentName: 'Jane Smith',
      studentId: 'JS1234',
    });

    publicApi.getUserState.mockResolvedValue({
      alreadySubmitted: false,
      attemptsRemaining: 3,
      reviewHistory: { content: [], structure: [], mechanics: [] },
      cooldownRemaining: 0,
    });

    gameApi.initPlayer.mockResolvedValue({
      reviewTokens: 2,
      attackTokens: 0,
      shieldTokens: 1,
      cooldownRemaining: 0,
    });

    renderProjectPage();

    await waitFor(() => expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Enter student ID'), { target: { value: 'js1234' } });
    fireEvent.change(screen.getByPlaceholderText('Enter project password'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => expect(screen.getByText('Your Essay')).toBeInTheDocument());

    // No defense modal before attack
    expect(screen.queryByTestId('defense-modal')).not.toBeInTheDocument();

    // Simulate WebSocket delivering an incoming attack
    const onAttackReceived = useWebSocket.mock.calls[0][2];
    act(() => { onAttackReceived('incoming-attack-1'); });

    // Defense modal must appear with the correct attack id
    await waitFor(() => {
      expect(screen.getByTestId('defense-modal')).toBeInTheDocument();
      expect(screen.getByTestId('incoming-attack-id')).toHaveTextContent('incoming-attack-1');
    });

    // Click defend  — triggers handleDefenseResponse: dequeue + re-init player
    fireEvent.click(screen.getByTestId('defend-btn'));

    // initPlayer must be called again (state refresh after defend)
    await waitFor(() => {
      expect(gameApi.initPlayer).toHaveBeenCalledTimes(2);
    });

    // Defense modal dismisses when queue is empty after dequeue
    await waitFor(() => expect(screen.queryByTestId('defense-modal')).not.toBeInTheDocument());
  });

  it('sends editor blur analytics event after focus session', async () => {
    publicApi.validateStudent.mockResolvedValue({
      studentName: 'Jane Smith',
      studentId: 'JS1234',
    });

    publicApi.getUserState.mockResolvedValue({
      alreadySubmitted: false,
      attemptsRemaining: 3,
      reviewHistory: {
        content: [],
        structure: [],
        mechanics: [],
      },
      cooldownRemaining: 0,
    });

    gameApi.initPlayer.mockResolvedValue({
      reviewTokens: 3,
      attackTokens: 0,
      shieldTokens: 1,
      cooldownRemaining: 0,
    });

    renderProjectPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter student ID'), { target: { value: 'js1234' } });
    fireEvent.change(screen.getByPlaceholderText('Enter project password'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write your essay here...')).toBeInTheDocument();
    });

    const essayArea = screen.getByPlaceholderText('Write your essay here...');
    fireEvent.change(essayArea, { target: { value: 'One two three four five.' } });
    fireEvent.focus(essayArea);
    fireEvent.blur(essayArea);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/TEST01/editor-events',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      userName: 'Jane Smith',
      eventType: 'blur',
      essay_length: 5,
      attempt_number: 0,
    });
    expect(typeof payload.duration_ms).toBe('number');
  });
});
