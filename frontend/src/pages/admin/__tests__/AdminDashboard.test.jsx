import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import { adminApi } from '../../../api/endpoints';

// Mock the API
jest.mock('../../../api/endpoints', () => ({
  adminApi: {
    getProjects: jest.fn(),
    updateProjectStatus: jest.fn(),
    deleteProjects: jest.fn(),
  },
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderAdminDashboard = () => {
    return render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
  };

  // Helper function to find status toggle checkbox for a project
  const getStatusCheckbox = (projectCode) => {
    const rows = screen.getAllByRole('row');
    const projectRow = rows.find(row => row.textContent.includes(projectCode));
    if (!projectRow) return null;
    
    // Status checkbox is in a label with "Enabled" or "Disabled" text
    const labels = projectRow.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent.includes('Enabled') || label.textContent.includes('Disabled')) {
        return label.querySelector('input[type="checkbox"]');
      }
    }
    return null;
  };

  describe('Project List Display', () => {
    it('should load and display projects on mount', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Test Project 1',
          enabled: true,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          code: 'TEST02',
          title: 'Test Project 2',
          enabled: false,
          created_by: 'admin2',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
        expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching projects', () => {
      adminApi.getProjects.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderAdminDashboard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display error message on fetch failure', async () => {
      adminApi.getProjects.mockRejectedValue(new Error('Failed to load projects'));

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
      });
    });

    it('should show empty state when no projects exist', async () => {
      adminApi.getProjects.mockResolvedValue([]);

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Project Enable/Disable Toggle', () => {
    it('should display enabled checkbox checked for enabled projects', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Enabled Project',
          enabled: true,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);

      renderAdminDashboard();

      await waitFor(() => {
        const statusCheckbox = getStatusCheckbox('TEST01');
        expect(statusCheckbox).toBeChecked();
      });
    });

    it('should display enabled checkbox unchecked for disabled projects', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Disabled Project',
          enabled: false,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);

      renderAdminDashboard();

      await waitFor(() => {
        const statusCheckbox = getStatusCheckbox('TEST01');
        expect(statusCheckbox).not.toBeChecked();
      });
    });

    it('should toggle project status when checkbox is clicked', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Test Project',
          enabled: true,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);
      adminApi.updateProjectStatus.mockResolvedValue({
        code: 'TEST01',
        enabled: false,
      });

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      // Find and click the status checkbox
      const statusCheckbox = getStatusCheckbox('TEST01');
      
      fireEvent.click(statusCheckbox);

      await waitFor(() => {
        expect(adminApi.updateProjectStatus).toHaveBeenCalledWith('TEST01', false);
      });
    });

    it('should enable a disabled project when toggled', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Disabled Project',
          enabled: false,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);
      adminApi.updateProjectStatus.mockResolvedValue({
        code: 'TEST01',
        enabled: true,
      });

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Disabled Project')).toBeInTheDocument();
      });

      const statusCheckbox = getStatusCheckbox('TEST01');
      
      fireEvent.click(statusCheckbox);

      await waitFor(() => {
        expect(adminApi.updateProjectStatus).toHaveBeenCalledWith('TEST01', true);
      });
    });

    it('should update UI optimistically after toggle', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Test Project',
          enabled: true,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);
      adminApi.updateProjectStatus.mockResolvedValue({
        code: 'TEST01',
        enabled: false,
      });

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const statusCheckbox = getStatusCheckbox('TEST01');
      
      fireEvent.click(statusCheckbox);

      await waitFor(() => {
        expect(statusCheckbox).not.toBeChecked();
      });
    });

    it('should display error when toggle fails', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Test Project',
          enabled: true,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);
      adminApi.updateProjectStatus.mockRejectedValue(new Error('Failed to update status'));

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const statusCheckbox = getStatusCheckbox('TEST01');
      
      fireEvent.click(statusCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Failed to update status')).toBeInTheDocument();
      });
    });

    it('should disable toggle button while request is pending', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Test Project',
          enabled: true,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);
      adminApi.updateProjectStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      const statusCheckbox = getStatusCheckbox('TEST01');
      
      fireEvent.click(statusCheckbox);

      // Checkbox should be disabled during the API call
      expect(statusCheckbox).toBeDisabled();
    });
  });

  describe('Multiple Project Toggle', () => {
    it('should handle toggling multiple projects independently', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Project 1',
          enabled: true,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          code: 'TEST02',
          title: 'Project 2',
          enabled: false,
          created_by: 'admin1',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);
      adminApi.updateProjectStatus
        .mockResolvedValueOnce({ code: 'TEST01', enabled: false })
        .mockResolvedValueOnce({ code: 'TEST02', enabled: true });

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
        expect(screen.getByText('Project 2')).toBeInTheDocument();
      });

      // Toggle first project
      const statusCheckbox1 = getStatusCheckbox('TEST01');
      fireEvent.click(statusCheckbox1);

      await waitFor(() => {
        expect(adminApi.updateProjectStatus).toHaveBeenCalledWith('TEST01', false);
      });

      // Toggle second project
      const statusCheckbox2 = getStatusCheckbox('TEST02');
      fireEvent.click(statusCheckbox2);

      await waitFor(() => {
        expect(adminApi.updateProjectStatus).toHaveBeenCalledWith('TEST02', true);
      });
    });
  });

  describe('Create Project Button', () => {
    it('should display create project button', async () => {
      adminApi.getProjects.mockResolvedValue([]);

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Create Project')).toBeInTheDocument();
      });
    });

    it('should link to create project page', async () => {
      adminApi.getProjects.mockResolvedValue([]);

      renderAdminDashboard();

      await waitFor(() => {
        const createButton = screen.getByText('Create Project');
        expect(createButton.closest('a')).toHaveAttribute('href', '/admin/projects/new');
      });
    });
  });

  describe('Project Selection', () => {
    it('should show select all checkbox', async () => {
      const mockProjects = [
        {
          code: 'TEST01',
          title: 'Project 1',
          enabled: true,
          created_by: 'admin1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      adminApi.getProjects.mockResolvedValue(mockProjects);

      renderAdminDashboard();

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(1);
      });
    });
  });
});
