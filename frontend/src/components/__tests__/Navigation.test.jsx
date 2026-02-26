import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the API before importing anything that uses it
jest.mock('../../api/endpoints', () => ({
  publicApi: {},
  auth: {},
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock useAuth
jest.mock('../../store/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    auth: { isAdmin: false, isBootstrapping: false, adminName: '' },
    logout: jest.fn(),
  })),
}));

// Now import Navigation after all mocks are set up
import Navigation from '../Navigation';
import { useAuth } from '../../store/AuthContext';

describe('Navigation Component - Instructor Login Button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  test('should render Instructor Login button when not authenticated', () => {
    useAuth.mockReturnValue({
      auth: { isAdmin: false, isBootstrapping: false, adminName: '' },
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const button = screen.getByText('Instructor Login');
    expect(button).toBeInTheDocument();
    expect(button).toBeVisible();
  });

  test('should have correct button properties', () => {
    useAuth.mockReturnValue({
      auth: { isAdmin: false, isBootstrapping: false, adminName: '' },
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const button = screen.getByText('Instructor Login');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveClass('primary');
    expect(button).not.toBeDisabled();
  });

  test('should call navigate when Instructor Login button is clicked', async () => {
    useAuth.mockReturnValue({
      auth: { isAdmin: false, isBootstrapping: false, adminName: '' },
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const button = screen.getByText('Instructor Login');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('should have working onClick handler', () => {
    useAuth.mockReturnValue({
      auth: { isAdmin: false, isBootstrapping: false, adminName: '' },
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const button = screen.getByText('Instructor Login');
    
    // Button should have onclick property
    expect(button.onclick).not.toBeNull();
    
    // Click should succeed
    const result = fireEvent.click(button);
    expect(result).toBe(true);
  });

  test('should NOT show Instructor Login button when user is admin', () => {
    useAuth.mockReturnValue({
      auth: { isAdmin: true, isBootstrapping: false, adminName: 'TestAdmin' },
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const button = screen.queryByText('Instructor Login');
    expect(button).not.toBeInTheDocument();
  });

  test('should NOT show Instructor Login button when bootstrapping', () => {
    useAuth.mockReturnValue({
      auth: { isAdmin: false, isBootstrapping: true, adminName: '' },
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const button = screen.queryByText('Instructor Login');
    expect(button).not.toBeInTheDocument();
  });

  test('should show authenticated user controls when logged in', () => {
    useAuth.mockReturnValue({
      auth: { isAdmin: true, isBootstrapping: false, adminName: 'John' },
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});
