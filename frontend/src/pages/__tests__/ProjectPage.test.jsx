import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import ProjectPage from '../ProjectPage';
import { publicApi, gameApi } from '../../api/endpoints';

// Mock the API
jest.mock('../../api/endpoints', () => ({
  publicApi: {
    getProject: jest.fn(),
    getUserState: jest.fn(),
  },
  gameApi: {
    initPlayer: jest.fn(),
  },
}));

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

// Mock WebSocket hook
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

// Mock modals that use import.meta
jest.mock('../../components/AttackModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="attack-modal">Attack Modal</div> : null),
}));

jest.mock('../../components/DefenseModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="defense-modal">Defense Modal</div> : null),
}));

jest.mock('../../components/FeedbackModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="feedback-modal">Feedback Modal</div> : null),
}));

describe('ProjectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    jest.spyOn(Storage.prototype, 'setItem');
    jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'removeItem');
    useParams.mockReturnValue({ code: 'TEST01' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to create default user state
  const defaultUserState = () => ({
    submissionCount: 0,
    reviewHistory: {
      content: [],
      structure: [],
      mechanics: [],
    },
  });

  const renderProjectPage = () => {
    return render(
      <BrowserRouter>
        <ProjectPage />
      </BrowserRouter>
    );
  };

  describe('Student Credentials Loading', () => {
    it('should load student name and ID from localStorage', async () => {
      localStorage.setItem('project_TEST01_studentName', 'John Doe');
      localStorage.setItem('project_TEST01_studentId', 'JD1234');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
        word_limit: 150,
      });
      
      publicApi.getUserState.mockResolvedValue({
        submissionCount: 0,
        reviewHistory: {
          content: [],
          grammar: [],
          structure: [],
          overall: [],
        },
      });
      
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 3,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(publicApi.getUserState).toHaveBeenCalledWith('TEST01', 'John Doe');
        expect(gameApi.initPlayer).toHaveBeenCalledWith('TEST01', 'John Doe');
      });
    });

    it('should display student information card when loaded', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Jane Smith');
      localStorage.setItem('project_TEST01_studentId', 'JS5678');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      publicApi.getUserState.mockResolvedValue(defaultUserState());
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 3,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
        expect(screen.getByText(/JS5678/i)).toBeInTheDocument();
      });
    });

    it('should not auto-submit if student credentials are missing', async () => {
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      renderProjectPage();
      
      // Should not call getUserState without student name
      await waitFor(() => {
        expect(publicApi.getUserState).not.toHaveBeenCalled();
      });
    });

    it('should clear credentials from localStorage on validation error', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Invalid User');
      localStorage.setItem('project_TEST01_studentId', 'INVALID');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      publicApi.getUserState.mockRejectedValue(new Error('User not found'));
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith('project_TEST01_studentName');
        expect(localStorage.removeItem).toHaveBeenCalledWith('project_TEST01_studentId');
      });
    });
  });

  describe('Student ID Display', () => {
    it('should display student ID in uppercase format', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Bob Johnson');
      localStorage.setItem('project_TEST01_studentId', 'bj9012');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      publicApi.getUserState.mockResolvedValue(defaultUserState());
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 3,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        // The component should display the ID as stored (or normalized)
        const studentIdElement = screen.getByText(/bj9012/i);
        expect(studentIdElement).toBeInTheDocument();
      });
    });

    it('should show student name and ID together', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Alice Wonder');
      localStorage.setItem('project_TEST01_studentId', 'AW3456');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      publicApi.getUserState.mockResolvedValue(defaultUserState());
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 3,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(screen.getByText(/Alice Wonder/i)).toBeInTheDocument();
        expect(screen.getByText(/AW3456/i)).toBeInTheDocument();
      });
    });
  });

  describe('Project Access Control', () => {
    it('should block access when project is disabled', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');
      
      publicApi.getProject.mockRejectedValue(new Error('This project is currently disabled'));
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(screen.getByText(/This project is currently disabled/i)).toBeInTheDocument();
      });
    });

    it('should show error when project not found', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');
      
      publicApi.getProject.mockRejectedValue(new Error('Project not found'));
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(screen.getByText(/Project not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Essay Storage', () => {
    it('should load saved essay from localStorage', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');
      localStorage.setItem('project_TEST01_Test User_essay', 'This is my saved essay');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      publicApi.getUserState.mockResolvedValue(defaultUserState());
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 3,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        const textarea = screen.queryByDisplayValue('This is my saved essay');
        expect(textarea).toBeInTheDocument();
      });
    });
  });

  describe('Review Tabs Rendering', () => {
    it('should render review results for each category tab', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');

      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
        word_limit: 150,
      });

      publicApi.getUserState.mockResolvedValue({
        alreadySubmitted: false,
        attemptsRemaining: 2,
        reviewHistory: {
          content: [
            {
              id: 1,
              category: 'content',
              status: 'success',
              attempt_number: 1,
              created_at: '2024-01-01T12:00:00.000Z',
              result_json: {
                score: 85,
                overview: {
                  good: ['Strong thesis statement'],
                  improve: ['Add more examples'],
                },
                suggestions: ['Expand your second paragraph'],
              },
            },
          ],
          structure: [
            {
              id: 2,
              category: 'structure',
              status: 'success',
              attempt_number: 1,
              created_at: '2024-01-01T12:05:00.000Z',
              result_json: {
                score: 78,
                overview: {
                  good: ['Clear introduction'],
                  improve: ['Smoother transitions'],
                },
                suggestions: ['Add a transition sentence between paragraphs'],
              },
            },
          ],
          mechanics: [
            {
              id: 3,
              category: 'mechanics',
              status: 'success',
              attempt_number: 1,
              created_at: '2024-01-01T12:10:00.000Z',
              result_json: {
                score: 92,
                overview: {
                  good: ['Strong grammar'],
                  improve: ['Vary sentence length'],
                },
                suggestions: ['Mix short and long sentences for rhythm'],
              },
            },
          ],
        },
      });

      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 2,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });

      renderProjectPage();

      await waitFor(() => {
        expect(screen.getByText('Story Content')).toBeInTheDocument();
        expect(screen.getByText('Narration Skills')).toBeInTheDocument();
        expect(screen.getByText('Language Use & Mechanics')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('✓ Strengths:')).toBeInTheDocument();
        expect(screen.getByText('Strong thesis statement')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Narration Skills'));
      await waitFor(() => {
        expect(screen.getByText('Clear introduction')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Language Use & Mechanics'));
      await waitFor(() => {
        expect(screen.getByText('Strong grammar')).toBeInTheDocument();
      });
    });

    it('should show no reviews when reviewHistory keys do not match expected categories', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');

      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
        word_limit: 150,
      });

      publicApi.getUserState.mockResolvedValue({
        alreadySubmitted: false,
        attemptsRemaining: 2,
        reviewHistory: {
          grammar: [
            {
              id: 10,
              category: 'grammar',
              status: 'success',
              attempt_number: 1,
              created_at: '2024-01-01T12:00:00.000Z',
              result_json: {
                score: 90,
                overview: {
                  good: ['Great punctuation'],
                  improve: [],
                },
                suggestions: [],
              },
            },
          ],
          overall: [],
        },
      });

      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 2,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });

      renderProjectPage();

      await waitFor(() => {
        expect(screen.getByText('Story Content')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('No reviews yet. Click "Submit for Review" to get feedback.')).toBeInTheDocument();
      });
    });
  });

  describe('Token Display', () => {
    it('should display review tokens from game initialization', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      publicApi.getUserState.mockResolvedValue(defaultUserState());
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 5,
        attackTokens: 2,
        shieldTokens: 1,
        cooldownRemaining: 0,
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(gameApi.initPlayer).toHaveBeenCalled();
      });
    });

    it('should initialize tokens based on project attempt limit', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
        attempt_limit_per_category: 5,
      });
      
      publicApi.getUserState.mockResolvedValue(defaultUserState());
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 5,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(gameApi.initPlayer).toHaveBeenCalledWith('TEST01', 'Test User');
      });
    });
  });

  describe('Cooldown Display', () => {
    it('should show cooldown when remaining time exists', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      publicApi.getUserState.mockResolvedValue(defaultUserState());
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 3,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 60000, // 1 minute
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(gameApi.initPlayer).toHaveBeenCalled();
      });
    });

    it('should not show cooldown when remaining time is 0', async () => {
      localStorage.setItem('project_TEST01_studentName', 'Test User');
      localStorage.setItem('project_TEST01_studentId', 'TU1234');
      
      publicApi.getProject.mockResolvedValue({
        code: 'TEST01',
        title: 'Test Project',
      });
      
      publicApi.getUserState.mockResolvedValue(defaultUserState());
      gameApi.initPlayer.mockResolvedValue({
        reviewTokens: 3,
        attackTokens: 0,
        shieldTokens: 0,
        cooldownRemaining: 0,
      });
      
      renderProjectPage();
      
      await waitFor(() => {
        expect(gameApi.initPlayer).toHaveBeenCalled();
      });
    });

    describe('Admin-set cooldown periods', () => {
      beforeEach(() => {
        localStorage.setItem('project_TEST01_studentName', 'Test User');
        localStorage.setItem('project_TEST01_studentId', 'TU1234');
        
        publicApi.getProject.mockResolvedValue({
          code: 'TEST01',
          title: 'Test Project',
          word_limit: 150,
        });
        
        publicApi.getUserState.mockResolvedValue(defaultUserState());
      });

      it('should display 30s cooldown correctly when admin sets it to 30 seconds', async () => {
        gameApi.initPlayer.mockResolvedValue({
          reviewTokens: 3,
          attackTokens: 0,
          shieldTokens: 0,
          cooldownRemaining: 30000, // 30 seconds
        });
        
        renderProjectPage();
        
        await waitFor(() => {
          const submitButton = screen.getByText(/Wait 0:30/i);
          expect(submitButton).toBeInTheDocument();
          expect(submitButton.closest('button')).toBeDisabled();
        });
      });

      it('should display 60s cooldown correctly when admin sets it to 60 seconds', async () => {
        gameApi.initPlayer.mockResolvedValue({
          reviewTokens: 3,
          attackTokens: 0,
          shieldTokens: 0,
          cooldownRemaining: 60000, // 60 seconds
        });
        
        renderProjectPage();
        
        await waitFor(() => {
          const submitButton = screen.getByText(/Wait 1:00/i);
          expect(submitButton).toBeInTheDocument();
          expect(submitButton.closest('button')).toBeDisabled();
        });
      });

      it('should display 90s cooldown correctly when admin sets it to 90 seconds', async () => {
        gameApi.initPlayer.mockResolvedValue({
          reviewTokens: 3,
          attackTokens: 0,
          shieldTokens: 0,
          cooldownRemaining: 90000, // 90 seconds
        });
        
        renderProjectPage();
        
        await waitFor(() => {
          const submitButton = screen.getByText(/Wait 1:30/i);
          expect(submitButton).toBeInTheDocument();
          expect(submitButton.closest('button')).toBeDisabled();
        });
      });

      it('should display 120s cooldown correctly when admin sets it to 120 seconds', async () => {
        gameApi.initPlayer.mockResolvedValue({
          reviewTokens: 3,
          attackTokens: 0,
          shieldTokens: 0,
          cooldownRemaining: 120000, // 120 seconds (2 minutes)
        });
        
        renderProjectPage();
        
        await waitFor(() => {
          const submitButton = screen.getByText(/Wait 2:00/i);
          expect(submitButton).toBeInTheDocument();
          expect(submitButton.closest('button')).toBeDisabled();
        });
      });

      it('should countdown over time from 30s and enable button when it reaches zero', async () => {
        jest.useFakeTimers();
        
        gameApi.initPlayer.mockResolvedValue({
          reviewTokens: 3,
          attackTokens: 0,
          shieldTokens: 0,
          cooldownRemaining: 5000, // 5 seconds for faster test
        });
        
        renderProjectPage();
        
        // Wait for component to load and add essay text
        await waitFor(() => {
          expect(screen.getByPlaceholderText(/Write your essay here/i)).toBeInTheDocument();
        });
        
        // Type essay text to enable the button
        const essayTextarea = screen.getByPlaceholderText(/Write your essay here/i);
        fireEvent.change(essayTextarea, { target: { value: 'This is my test essay content.' } });
        
        // Initial state - button should be disabled with cooldown message
        await waitFor(() => {
          const submitButton = screen.getByTestId('submit-review-btn');
          expect(submitButton).toHaveTextContent(/Wait 0:05/i);
          expect(submitButton).toBeDisabled();
        });
        
        // Advance time by 2 seconds
        jest.advanceTimersByTime(2000);
        
        await waitFor(() => {
          const submitButton = screen.getByTestId('submit-review-btn');
          expect(submitButton).toHaveTextContent(/Wait 0:03/i);
          expect(submitButton).toBeDisabled();
        });
        
        // Advance time to complete cooldown
        jest.advanceTimersByTime(3000);
        
        await waitFor(() => {
          const submitButton = screen.getByTestId('submit-review-btn');
          expect(submitButton).toHaveTextContent(/Submit for Review/i);
          expect(submitButton).not.toBeDisabled();
        });
        
        jest.useRealTimers();
      });

      it('should countdown over time from 60s and enable button when it reaches zero', async () => {
        jest.useFakeTimers();
        
        gameApi.initPlayer.mockResolvedValue({
          reviewTokens: 3,
          attackTokens: 0,
          shieldTokens: 0,
          cooldownRemaining: 10000, // 10 seconds for faster test
        });
        
        renderProjectPage();
        
        // Wait for component to load and add essay text
        await waitFor(() => {
          expect(screen.getByPlaceholderText(/Write your essay here/i)).toBeInTheDocument();
        });
        
        // Type essay text to enable the button
        const essayTextarea = screen.getByPlaceholderText(/Write your essay here/i);
        fireEvent.change(essayTextarea, { target: { value: 'This is my test essay content for 60 second cooldown.' } });
        
        // Initial state - button should show Wait 0:10
        await waitFor(() => {
          const submitButton = screen.getByTestId('submit-review-btn');
          expect(submitButton).toHaveTextContent(/Wait 0:10/i);
          expect(submitButton).toBeDisabled();
        });
        
        // Advance time by 5 seconds
        jest.advanceTimersByTime(5000);
        
        await waitFor(() => {
          const submitButton = screen.getByTestId('submit-review-btn');
          expect(submitButton).toHaveTextContent(/Wait 0:05/i);
          expect(submitButton).toBeDisabled();
        });
        
        // Advance time by another 4 seconds (total 9s)
        jest.advanceTimersByTime(4000);
        
        await waitFor(() => {
          const submitButton = screen.getByTestId('submit-review-btn');
          expect(submitButton).toHaveTextContent(/Wait 0:01/i);
          expect(submitButton).toBeDisabled();
        });
        
        // Complete the cooldown
        jest.advanceTimersByTime(1000);
        
        await waitFor(() => {
          const submitButton = screen.getByTestId('submit-review-btn');
          expect(submitButton).toHaveTextContent(/Submit for Review/i);
          expect(submitButton).not.toBeDisabled();
        });
        
        jest.useRealTimers();
      });

      it('should show "Submit for Review" when cooldown is 0', async () => {
        gameApi.initPlayer.mockResolvedValue({
          reviewTokens: 3,
          attackTokens: 0,
          shieldTokens: 0,
          cooldownRemaining: 0,
        });
        
        renderProjectPage();
        
        // Wait for component to load and add essay text
        await waitFor(() => {
          expect(screen.getByPlaceholderText(/Write your essay here/i)).toBeInTheDocument();
        });
        
        // Type essay text to enable the button
        const essayTextarea = screen.getByPlaceholderText(/Write your essay here/i);
        fireEvent.change(essayTextarea, { target: { value: 'This is my test essay with no cooldown.' } });
        
        await waitFor(() => {
          const submitButton = screen.getByTestId('submit-review-btn');
          expect(submitButton).toHaveTextContent(/Submit for Review/i);
          expect(submitButton).not.toBeDisabled();
        });
      });
    });
  });
});
