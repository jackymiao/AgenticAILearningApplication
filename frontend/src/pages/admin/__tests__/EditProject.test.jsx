import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EditProject from '../EditProject';
import { adminApi } from '../../../api/endpoints';

// Mock the API
jest.mock('../../../api/endpoints', () => ({
  adminApi: {
    getProject: jest.fn(),
    updateProject: jest.fn(),
    getStudents: jest.fn(),
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

// Mock PageContainer
jest.mock('../../../components/PageContainer', () => {
  return function MockedPageContainer({ children }) {
    return <div data-testid="page-container">{children}</div>;
  };
});

// Mock react-router-dom navigation and params
const mockNavigate = jest.fn();
const mockParams = { code: 'PROJ01' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

describe('EditProject Component', () => {
  const mockProjectData = {
    code: 'PROJ01',
    title: 'Test Project',
    description: '<p>Original description</p>',
    project_password: 'PASS123',
    youtube_url: 'https://youtube.com/watch?v=test',
    word_limit: 200,
    attempt_limit_per_category: 3,
    review_cooldown_seconds: 120,
    enable_feedback: true,
    test_mode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adminApi.getProject.mockResolvedValue(mockProjectData);
    adminApi.getStudents.mockResolvedValue([]);
  });

  const renderEditProject = (projectCode = 'PROJ01') => {
    mockParams.code = projectCode;
    return render(
      <BrowserRouter>
        <EditProject />
      </BrowserRouter>
    );
  };

  describe('Initial Loading and Data Fetching', () => {
    it('should show loading state initially', () => {
      adminApi.getProject.mockReturnValue(new Promise(() => {})); // Never resolves
      renderEditProject();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load project data on mount', async () => {
      renderEditProject();

      await waitFor(() => {
        expect(adminApi.getProject).toHaveBeenCalledWith('PROJ01');
      });
    });

    it('should display error when project load fails', async () => {
      adminApi.getProject.mockRejectedValue(new Error('Project not found'));
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument();
      });
    });

    it('should display project title after loading', async () => {
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText(/Edit Project: PROJ01/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Pre-fill and Show/Hide Toggle', () => {
    it('should pre-fill password field with decrypted password', async () => {
      renderEditProject();

      await waitFor(() => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const passwordInput = Array.from(passwordInputs).find(
          input => input.name === 'projectPassword'
        );
        expect(passwordInput).toHaveValue('PASS123');
      });
    });

    it('should initially hide password (type="password")', async () => {
      renderEditProject();

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="projectPassword"]');
        expect(passwordInput).toHaveAttribute('type', 'password');
      });
    });

    it('should show password when Show button is clicked', async () => {
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText('Show')).toBeInTheDocument();
      });

      const showButton = screen.getByText('Show');
      fireEvent.click(showButton);

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="projectPassword"]');
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(screen.getByText('Hide')).toBeInTheDocument();
      });
    });

    it('should toggle password visibility multiple times', async () => {
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText('Show')).toBeInTheDocument();
      });

      // Show password
      fireEvent.click(screen.getByText('Show'));
      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="projectPassword"]');
        expect(passwordInput).toHaveAttribute('type', 'text');
      });

      // Hide password
      fireEvent.click(screen.getByText('Hide'));
      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="projectPassword"]');
        expect(passwordInput).toHaveAttribute('type', 'password');
      });
    });

    it('should allow editing the pre-filled password', async () => {
      renderEditProject();

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="projectPassword"]');
        expect(passwordInput).toHaveValue('PASS123');
      });

      const passwordInput = document.querySelector('input[name="projectPassword"]');
      fireEvent.change(passwordInput, { target: { value: 'NEWPASS456' } });

      expect(passwordInput).toHaveValue('NEWPASS456');
    });
  });

  describe('RichTextEditor Integration', () => {
    it('should render RichTextEditor with project description', async () => {
      renderEditProject();

      await waitFor(() => {
        const descriptionEditor = screen.getByTestId('description-editor');
        expect(descriptionEditor).toHaveValue('<p>Original description</p>');
      });
    });

    it('should update description via RichTextEditor', async () => {
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByTestId('description-editor')).toBeInTheDocument();
      });

      const descriptionEditor = screen.getByTestId('description-editor');
      fireEvent.change(descriptionEditor, {
        target: { value: '<h1>Updated</h1><p>New description with <b>formatting</b></p>' }
      });

      expect(descriptionEditor).toHaveValue('<h1>Updated</h1><p>New description with <b>formatting</b></p>');
    });

    it('should preserve HTML formatting in description field', async () => {
      const htmlDescription = '<h1>Title</h1><p>Text with <i>italic</i> and <img src="test.jpg" style="width: 300px;" /></p>';
      adminApi.getProject.mockResolvedValue({
        ...mockProjectData,
        description: htmlDescription,
      });

      renderEditProject();

      await waitFor(() => {
        const descriptionEditor = screen.getByTestId('description-editor');
        expect(descriptionEditor).toHaveValue(htmlDescription);
      });
    });
  });

  describe('Form Field Updates', () => {
    it('should update title field', async () => {
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText(/Edit Project: PROJ01/i)).toBeInTheDocument();
      });

      const titleInput = document.querySelector('input[name="title"]');
      fireEvent.change(titleInput, { target: { value: 'Updated Project Title' } });

      expect(titleInput).toHaveValue('Updated Project Title');
    });

    it('should update YouTube URL field', async () => {
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText(/Edit Project: PROJ01/i)).toBeInTheDocument();
      });

      const youtubeInput = document.querySelector('input[name="youtubeUrl"]');
      fireEvent.change(youtubeInput, { target: { value: 'https://youtube.com/watch?v=newvideo' } });

      expect(youtubeInput).toHaveValue('https://youtube.com/watch?v=newvideo');
    });

    it('should update word limit field', async () => {
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText(/Edit Project: PROJ01/i)).toBeInTheDocument();
      });

      const wordLimitInput = document.querySelector('input[name="wordLimit"]');
      fireEvent.change(wordLimitInput, { target: { value: '350' } });

      expect(wordLimitInput).toHaveValue(350);
    });

    it('should have project code field disabled', async () => {
      renderEditProject();

      await waitFor(() => {
        const codeInput = screen.getByDisplayValue('PROJ01');
        expect(codeInput).toBeDisabled();
        expect(codeInput).toHaveStyle('backgroundColor: rgb(245, 245, 245)');
      });
    });
  });

  describe('Form Submission', () => {
    it('should call updateProject API with updated data', async () => {
      adminApi.updateProject.mockResolvedValue({});
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText(/Edit Project: PROJ01/i)).toBeInTheDocument();
      });

      // Update fields
      const titleInput = document.querySelector('input[name="title"]');
      const passwordInput = document.querySelector('input[name="projectPassword"]');
      const descriptionEditor = screen.getByTestId('description-editor');

      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      fireEvent.change(passwordInput, { target: { value: 'NEWPASS' } });
      fireEvent.change(descriptionEditor, { target: { value: '<p>Updated description</p>' } });

      // Submit form
      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(adminApi.updateProject).toHaveBeenCalledWith(
          'PROJ01',
          expect.objectContaining({
            title: 'Updated Title',
            projectPassword: 'NEWPASS',
            description: '<p>Updated description</p>',
          })
        );
      });
    });

    it('should navigate to admin page after successful update', async () => {
      adminApi.updateProject.mockResolvedValue({});
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText(/Edit Project: PROJ01/i)).toBeInTheDocument();
      });

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin');
      });
    });

    it('should display error message on failed update', async () => {
      adminApi.updateProject.mockRejectedValue(new Error('Update failed'));
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText(/Edit Project: PROJ01/i)).toBeInTheDocument();
      });

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });

    it('should include all form fields in update request', async () => {
      adminApi.updateProject.mockResolvedValue({});
      renderEditProject();

      await waitFor(() => {
        expect(screen.getByText(/Edit Project: PROJ01/i)).toBeInTheDocument();
      });

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(adminApi.updateProject).toHaveBeenCalledWith(
          'PROJ01',
          expect.objectContaining({
            title: mockProjectData.title,
            description: mockProjectData.description,
            projectPassword: mockProjectData.project_password,
            youtubeUrl: mockProjectData.youtube_url,
            wordLimit: mockProjectData.word_limit,
            attemptLimitPerCategory: mockProjectData.attempt_limit_per_category,
            reviewCooldownSeconds: mockProjectData.review_cooldown_seconds,
            enableFeedback: mockProjectData.enable_feedback,
            testMode: mockProjectData.test_mode,
          })
        );
      });
    });
  });

  describe('Password Security', () => {
    it('should not display password in plain text by default', async () => {
      renderEditProject();

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="projectPassword"]');
        expect(passwordInput).toHaveAttribute('type', 'password');
      });
    });

    it('should require password field to be filled', async () => {
      renderEditProject();

      await waitFor(() => {
        const passwordInput = document.querySelector('input[name="projectPassword"]');
        expect(passwordInput).toBeRequired();
      });
    });
  });
});
