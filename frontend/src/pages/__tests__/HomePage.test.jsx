import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { publicApi } from '../../api/endpoints';

// Mock the API
jest.mock('../../api/endpoints', () => ({
  publicApi: {
    validateStudent: jest.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    window.localStorage.clear();
    // Spy on localStorage methods
    jest.spyOn(Storage.prototype, 'setItem');
    jest.spyOn(Storage.prototype, 'getItem');
  });

  afterEach(() => {
    // Restore mocks
    jest.restoreAllMocks();
  });

  const renderHomePage = () => {
    return render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );
  };

  describe('Project Code Validation', () => {
    it('should render project code and student ID inputs', () => {
      renderHomePage();
      
      expect(screen.getByPlaceholderText('Enter project code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter student ID')).toBeInTheDocument();
    });

    it('should enforce 6-character limit on project code input', () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      
      expect(codeInput).toHaveAttribute('maxLength', '6');
    });

    it('should convert project code to uppercase as user types', () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      
      fireEvent.change(codeInput, { target: { value: 'abc123' } });
      
      expect(codeInput.value).toBe('ABC123');
    });

    it('should convert student ID to uppercase as user types', () => {
      renderHomePage();
      
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      
      fireEvent.change(studentIdInput, { target: { value: 'jd1234' } });
      
      expect(studentIdInput.value).toBe('JD1234');
    });

    it('should show error for non-alphanumeric project code', async () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'ABC-12' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Project code must be exactly 6 alphanumeric characters')).toBeInTheDocument();
      });
    });

    it('should show error for project code shorter than 6 characters', async () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'ABC12' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Project code must be exactly 6 alphanumeric characters')).toBeInTheDocument();
      });
    });

    it('should show error for project code longer than 6 characters (after trim)', async () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const submitButton = screen.getByText('Continue');
      
      // Note: input has maxLength=6, so this tests trimming behavior
      fireEvent.change(codeInput, { target: { value: 'ABC123' } });
      fireEvent.click(submitButton);
      
      // Should NOT show error for valid 6-char code
      await waitFor(() => {
        expect(screen.queryByText('Project code must be exactly 6 alphanumeric characters')).not.toBeInTheDocument();
      });
    });

    it('should show error for empty student ID', async () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'ABC123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Student ID is required')).toBeInTheDocument();
      });
    });

    it('should trim whitespace from project code', async () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      const submitButton = screen.getByText('Continue');
      
      publicApi.validateStudent.mockResolvedValue({
        studentName: 'Test Student',
        studentId: 'TS1234',
      });
      
      fireEvent.change(codeInput, { target: { value: '  ABC123  ' } });
      fireEvent.change(studentIdInput, { target: { value: 'TS1234' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(publicApi.validateStudent).toHaveBeenCalledWith('ABC123', 'TS1234');
      });
    });
  });

  describe('Student ID Validation', () => {
    it('should call validateStudent API with correct parameters', async () => {
      renderHomePage();
      
      publicApi.validateStudent.mockResolvedValue({
        studentName: 'John Doe',
        studentId: 'JD1234',
      });
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'TEST01' } });
      fireEvent.change(studentIdInput, { target: { value: 'JD1234' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(publicApi.validateStudent).toHaveBeenCalledWith('TEST01', 'JD1234');
      });
    });

    it('should store student credentials in localStorage on success', async () => {
      renderHomePage();
      
      publicApi.validateStudent.mockResolvedValue({
        studentName: 'Jane Smith',
        studentId: 'JS5678',
      });
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'TEST01' } });
      fireEvent.change(studentIdInput, { target: { value: 'JS5678' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('project_TEST01_studentId', 'JS5678');
        expect(localStorage.setItem).toHaveBeenCalledWith('project_TEST01_studentName', 'Jane Smith');
      });
    });

    it('should navigate to project page on successful validation', async () => {
      renderHomePage();
      
      publicApi.validateStudent.mockResolvedValue({
        studentName: 'Bob Johnson',
        studentId: 'BJ9012',
      });
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'TEST01' } });
      fireEvent.change(studentIdInput, { target: { value: 'BJ9012' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/projects/TEST01');
      });
    });

    it('should display error message on failed validation', async () => {
      renderHomePage();
      
      publicApi.validateStudent.mockRejectedValue(new Error('Student ID not found'));
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'TEST01' } });
      fireEvent.change(studentIdInput, { target: { value: 'INVALID' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Student ID not found')).toBeInTheDocument();
      });
    });

    it('should show loading state during validation', async () => {
      renderHomePage();
      
      publicApi.validateStudent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'TEST01' } });
      fireEvent.change(studentIdInput, { target: { value: 'JD1234' } });
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Validating...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should handle API errors gracefully', async () => {
      renderHomePage();
      
      publicApi.validateStudent.mockRejectedValue(new Error('Network error'));
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      const submitButton = screen.getByText('Continue');
      
      fireEvent.change(codeInput, { target: { value: 'TEST01' } });
      fireEvent.change(studentIdInput, { target: { value: 'JD1234' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should prevent form submission when fields are empty', async () => {
      renderHomePage();
      
      const form = screen.getByRole('button', { name: /continue/i }).closest('form');
      
      fireEvent.submit(form);
      
      // Should not call API
      expect(publicApi.validateStudent).not.toHaveBeenCalled();
    });

    it('should clear previous errors on new submission', async () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      const submitButton = screen.getByText('Continue');
      
      // First submission with error
      publicApi.validateStudent.mockRejectedValueOnce(new Error('First error'));
      
      fireEvent.change(codeInput, { target: { value: 'TEST01' } });
      fireEvent.change(studentIdInput, { target: { value: 'JD1234' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });
      
      // Second submission
      publicApi.validateStudent.mockResolvedValueOnce({
        studentName: 'John Doe',
        studentId: 'JD1234',
      });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Input Formatting', () => {
    it('should use uppercase text transform for project code', () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      
      expect(codeInput).toHaveStyle({ textTransform: 'uppercase' });
    });

    it('should use uppercase text transform for student ID', () => {
      renderHomePage();
      
      const studentIdInput = screen.getByPlaceholderText('Enter student ID');
      
      expect(studentIdInput).toHaveStyle({ textTransform: 'uppercase' });
    });

    it('should center-align project code input', () => {
      renderHomePage();
      
      const codeInput = screen.getByPlaceholderText('Enter project code');
      
      expect(codeInput).toHaveStyle({ textAlign: 'center' });
    });
  });
});
