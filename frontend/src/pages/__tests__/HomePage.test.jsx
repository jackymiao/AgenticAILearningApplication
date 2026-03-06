import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { publicApi } from '../../api/endpoints';

jest.mock('../../api/endpoints', () => ({
  publicApi: {
    getProject: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('HomePage', () => {
  const renderHomePage = () => {
    return render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders project code input only', () => {
    renderHomePage();

    expect(screen.getByPlaceholderText('Enter project code')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter student ID')).not.toBeInTheDocument();
  });

  it('validates project code format before API call', async () => {
    renderHomePage();

    fireEvent.change(screen.getByPlaceholderText('Enter project code'), { target: { value: 'abc12' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Project code must be exactly 6 alphanumeric characters')).toBeInTheDocument();
    });
    expect(publicApi.getProject).not.toHaveBeenCalled();
  });

  it('calls getProject and navigates when code is valid', async () => {
    publicApi.getProject.mockResolvedValue({ code: 'TEST01', title: 'Test' });
    renderHomePage();

    fireEvent.change(screen.getByPlaceholderText('Enter project code'), { target: { value: 'test01' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(publicApi.getProject).toHaveBeenCalledWith('TEST01');
      expect(mockNavigate).toHaveBeenCalledWith('/projects/TEST01');
    });
  });

  it('shows API error for invalid or disabled project', async () => {
    publicApi.getProject.mockRejectedValue(new Error('Project not found'));
    renderHomePage();

    fireEvent.change(screen.getByPlaceholderText('Enter project code'), { target: { value: 'TEST01' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Project not found')).toBeInTheDocument();
    });
  });
});
