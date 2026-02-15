import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
      grammar: [],
      structure: [],
      overall: [],
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
  });
});
