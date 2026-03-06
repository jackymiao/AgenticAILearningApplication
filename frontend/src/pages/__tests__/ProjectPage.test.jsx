import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import ProjectPage from '../ProjectPage';
import { publicApi, gameApi } from '../../api/endpoints';

jest.mock('../../api/endpoints', () => ({
  publicApi: {
    getProject: jest.fn(),
    validateStudent: jest.fn(),
    getUserState: jest.fn(),
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

jest.mock('../../hooks/useQueue', () => ({
  useQueue: () => ({
    enqueue: jest.fn(),
    dequeue: jest.fn(),
    peek: jest.fn(() => null),
  }),
}));

jest.mock('../../components/AttackModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/DefenseModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/FeedbackModal', () => ({
  __esModule: true,
  default: () => null,
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

    publicApi.getProject.mockResolvedValue({
      code: 'TEST01',
      title: 'Test Project',
      description: 'Project description',
      word_limit: 150,
      attempt_limit_per_category: 3,
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
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
});
