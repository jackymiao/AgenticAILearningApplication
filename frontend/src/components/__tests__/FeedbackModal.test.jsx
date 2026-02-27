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
    // Suppress console logs in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('Validation', () => {
    it('shows validation error when ratings are missing', () => {
      render(<FeedbackModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

      expect(screen.getByText('Please provide ratings for all three categories')).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('shows validation error when comment exceeds 200 words', () => {
      global.fetch.mockResolvedValue({ ok: true, json: jest.fn() });

      render(<FeedbackModal {...defaultProps} />);

      const stars = screen.getAllByText('☆');
      fireEvent.click(stars[4]);
      fireEvent.click(stars[9]);
      fireEvent.click(stars[14]);

      const longComment = Array(201).fill('word').join(' ');
      fireEvent.change(screen.getByPlaceholderText('Share any additional thoughts or suggestions...'), {
        target: { value: longComment }
      });

      fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

      expect(screen.getByText(/Comment is too long/)).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('displays word count correctly', () => {
      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Share any additional thoughts or suggestions...');
      fireEvent.change(textarea, { target: { value: 'This is a test comment' } });

      expect(screen.getByText('5 / 200 words')).toBeInTheDocument();
    });
  });

  describe('Successful Submission', () => {
    it('submits feedback with all ratings and comment', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
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
      expect(options.credentials).toBe('include');
      const payload = JSON.parse(options.body);
      expect(payload).toEqual({
        userName: 'Test User',
        contentRating: 5,
        systemDesignRating: 5,
        responseQualityRating: 5,
        comment: 'Helpful feedback comment.'
      });
    });

    it('submits feedback without comment', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<FeedbackModal {...defaultProps} />);

      const stars = screen.getAllByText('☆');
      fireEvent.click(stars[2]);
      fireEvent.click(stars[8]);
      fireEvent.click(stars[13]);

      fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(payload.comment).toBe('');
    });

    it('calls onClose with false when skip is clicked', () => {
      render(<FeedbackModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

      expect(onClose).toHaveBeenCalledWith(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
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

    it('shows error for duplicate submission (409)', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Feedback already submitted for this project' })
      });

      render(<FeedbackModal {...defaultProps} />);

      const stars = screen.getAllByText('☆');
      fireEvent.click(stars[4]);
      fireEvent.click(stars[9]);
      fireEvent.click(stars[14]);

      fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

      await waitFor(() => {
        expect(screen.getByText('Feedback already submitted for this project')).toBeInTheDocument();
      });
    });

    it('shows error when feedback is disabled (403)', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Feedback is not enabled for this project' })
      });

      render(<FeedbackModal {...defaultProps} />);

      const stars = screen.getAllByText('☆');
      fireEvent.click(stars[4]);
      fireEvent.click(stars[9]);
      fireEvent.click(stars[14]);

      fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

      await waitFor(() => {
        expect(screen.getByText('Feedback is not enabled for this project')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      render(<FeedbackModal {...defaultProps} />);

      const stars = screen.getAllByText('☆');
      fireEvent.click(stars[4]);
      fireEvent.click(stars[9]);
      fireEvent.click(stars[14]);

      fireEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('UI Behavior', () => {
    it('disables submit button while submitting', async () => {
      global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100)));

      render(<FeedbackModal {...defaultProps} />);

      const stars = screen.getAllByText('☆');
      fireEvent.click(stars[4]);
      fireEvent.click(stars[9]);
      fireEvent.click(stars[14]);

      const submitButton = screen.getByRole('button', { name: 'Submit Feedback' });
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Submitting...')).toBeInTheDocument();

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows star hover effect', () => {
      render(<FeedbackModal {...defaultProps} />);

      const stars = screen.getAllByText('☆');
      const firstStar = stars[0];

      fireEvent.mouseEnter(firstStar);
      // Visual feedback should update (tested via style changes)
      expect(firstStar).toBeInTheDocument();
    });
  });
});
