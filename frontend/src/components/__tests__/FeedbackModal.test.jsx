import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedbackModal from '../FeedbackModal';

describe('FeedbackModal', () => {
  const onClose = jest.fn();
  const defaultProps = {
    projectCode: 'TEST01',
    userName: 'Test User',
    onClose
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('shows validation error when ratings are missing', () => {
    render(<FeedbackModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

    expect(screen.getByText('Please provide ratings for all three categories')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits feedback and closes on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn()
    });

    render(<FeedbackModal {...defaultProps} />);

    const stars = screen.getAllByText('☆');
    fireEvent.click(stars[4]);
    fireEvent.click(stars[9]);
    fireEvent.click(stars[14]);

    fireEvent.change(screen.getByPlaceholderText('Share any additional thoughts or suggestions...'), {
      target: { value: 'Helpful feedback comment.' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledWith(true);
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/public/TEST01/feedback/submit');
    expect(options.method).toBe('POST');
    const payload = JSON.parse(options.body);
    expect(payload).toEqual({
      userName: 'Test User',
      contentRating: 5,
      systemDesignRating: 5,
      responseQualityRating: 5,
      comment: 'Helpful feedback comment.'
    });
  });

  it('shows server error when submission fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to submit feedback' })
    });

    render(<FeedbackModal {...defaultProps} />);

    const stars = screen.getAllByText('☆');
    fireEvent.click(stars[4]);
    fireEvent.click(stars[9]);
    fireEvent.click(stars[14]);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to submit feedback')).toBeInTheDocument();
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
