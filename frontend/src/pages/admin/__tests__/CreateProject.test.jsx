import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateProject from '../CreateProject';
import { adminApi } from '../../../api/endpoints';

// Mock the API
jest.mock('../../../api/endpoints', () => ({
  adminApi: {
    createProject: jest.fn(),
    importStudents: jest.fn(),
  },
}));

// Mock RichTextEditor
jest.mock('../../../components/RichTextEditor', () => {
  return function MockedRichTextEditor({ value, onChange, placeholder }) {
    return (
      <div data-testid="rich-text-editor">
        <textarea
          data-testid="description-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  };
});

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CreateProject Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderCreateProject = () => {
    return render(
      <BrowserRouter>
        <CreateProject />
      </BrowserRouter>
    );
  };

  describe('Form Rendering', () => {
    it('should render the create project form with all required fields', () => {
      renderCreateProject();

      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      expect(screen.getByText('Project Code *')).toBeInTheDocument();
      expect(screen.getByText('Title *')).toBeInTheDocument();
      expect(screen.getByText('Description *')).toBeInTheDocument();
      expect(screen.getByText('Project Password *')).toBeInTheDocument();
      expect(screen.getByText('YouTube URL')).toBeInTheDocument();
      expect(screen.getByText('Word Limit *')).toBeInTheDocument();
    });

    it('should render RichTextEditor for description field', () => {
      renderCreateProject();

      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
      expect(screen.getByTestId('description-editor')).toBeInTheDocument();
    });

    it('should have project password field as password type', () => {
      renderCreateProject();

      // Simply verify password input exists
      const inputs = document.querySelectorAll('input[type="password"]');
      expect(inputs.length).toBe(1);
    });

    it('should have project code with max length of 6', () => {
      renderCreateProject();

      const codeField = screen.getByPlaceholderText('6 alphanumeric characters');
      expect(codeField).toHaveAttribute('maxLength', '6');
      expect(codeField).toHaveAttribute('pattern', '[A-Za-z0-9]{6}');
      expect(codeField).toBeRequired();
    });

    it('should display default description text', () => {
      renderCreateProject();

      const descriptionEditor = screen.getByTestId('description-editor');
      expect(descriptionEditor.value).toContain('Please review the video');
    });
  });

  describe('Form Input Handling', () => {
    it('should update form fields when user types', () => {
      renderCreateProject();

      const codeInput = screen.getByPlaceholderText('6 alphanumeric characters');
      const inputs = document.querySelectorAll('input');
      const titleInput = Array.from(inputs).find(input => input.name === 'title');
      const passwordInput = Array.from(inputs).find(input => input.type === 'password');

      fireEvent.change(codeInput, { target: { value: 'PROJ01' } });
      fireEvent.change(titleInput, { target: { value: 'Test Project' } });
      fireEvent.change(passwordInput, { target: { value: 'PASS123' } });

      expect(codeInput).toHaveValue('PROJ01');
      expect(titleInput).toHaveValue('Test Project');
      expect(passwordInput).toHaveValue('PASS123');
    });

    it('should update description via RichTextEditor', () => {
      renderCreateProject();

      const descriptionEditor = screen.getByTestId('description-editor');
      fireEvent.change(descriptionEditor, { 
        target: { value: '<h1>New Description</h1><p>With formatting</p>' } 
      });

      expect(descriptionEditor).toHaveValue('<h1>New Description</h1><p>With formatting</p>');
    });

    it('should handle numeric inputs for word limit and attempts', () => {
      renderCreateProject();

      const inputs = document.querySelectorAll('input[type="number"]');
      const wordLimitInput = Array.from(inputs).find(input => input.name === 'wordLimit');
      const attemptsInput = Array.from(inputs).find(input => input.name === 'attemptLimitPerCategory');

      fireEvent.change(wordLimitInput, { target: { value: '250' } });
      fireEvent.change(attemptsInput, { target: { value: '5' } });

      expect(wordLimitInput).toHaveValue(250);
      expect(attemptsInput).toHaveValue(5);
    });
  });

  describe('Form Submission', () => {
    const fillRequiredFields = () => {
      const inputs = document.querySelectorAll('input');
      const codeInput = Array.from(inputs).find(input => input.name === 'code');
      const titleInput = Array.from(inputs).find(input => input.name === 'title');
      const passwordInput = Array.from(inputs).find(input => input.type === 'password');
      const descriptionEditor = screen.getByTestId('description-editor');

      fireEvent.change(codeInput, { target: { value: 'PROJ01' } });
      fireEvent.change(titleInput, { target: { value: 'Test Project' } });
      fireEvent.change(descriptionEditor, { target: { value: '<p>Test description</p>' } });
      fireEvent.change(passwordInput, { target: { value: 'PASS123' } });
    };

    it('should call createProject API with form data including password', async () => {
      adminApi.createProject.mockResolvedValue({ code: 'PROJ01' });
      
      renderCreateProject();
      fillRequiredFields();

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Create Project/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(adminApi.createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'PROJ01',
            title: 'Test Project',
            description: '<p>Test description</p>',
            projectPassword: 'PASS123',
          })
        );
      });
    });

    it('should navigate to admin page after successful creation', async () => {
      adminApi.createProject.mockResolvedValue({ code: 'PROJ01' });
      
      renderCreateProject();
      fillRequiredFields();

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Create Project/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin');
      });
    });

    it('should display error message on failed creation', async () => {
      adminApi.createProject.mockRejectedValue(new Error('Code already exists'));
      
      renderCreateProject();
      fillRequiredFields();

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Create Project/i }));

      await waitFor(() => {
        expect(screen.getByText('Code already exists')).toBeInTheDocument();
      });
    });
  });

  describe('Rich Text Editor Integration', () => {
    it('should use RichTextEditor for description with proper placeholder', () => {
      renderCreateProject();

      const editor = screen.getByTestId('description-editor');
      expect(editor).toHaveAttribute('placeholder', 'Enter project description...');
    });

    it('should preserve formatted HTML in description', () => {
      renderCreateProject();

      const htmlContent = '<h1>Title</h1><p>Paragraph with <b>bold</b> and <i>italic</i></p><img src="test.jpg" />';
      const descriptionEditor = screen.getByTestId('description-editor');
      
      fireEvent.change(descriptionEditor, { target: { value: htmlContent } });

      expect(descriptionEditor).toHaveValue(htmlContent);
    });
  });
});
