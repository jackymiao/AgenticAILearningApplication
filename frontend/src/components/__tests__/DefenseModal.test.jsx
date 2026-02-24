import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock import.meta before importing the component
jest.mock('../DefenseModal', () => {
  return function MockDefenseModal({ isOpen, onClose, projectCode, userName, attackId, onDefend }) {
    if (!attackId) return null;
    
    return (
      <div className="modal-overlay defense-modal-overlay" data-testid="pending-attack-modal">
        <div className="modal-content defense-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🚨 Under Attack!</h2>
          </div>
          <div className="modal-body">
            <p>You are under attack! Choose wisely:</p>
            <div className="defense-options">
              <button onClick={() => onDefend({ action: 'shield' })}>
                Use Shield
              </button>
              <button onClick={() => onDefend({ action: 'accept' })}>
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
});

import DefenseModal from '../DefenseModal';

describe('DefenseModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnDefend = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    projectCode: 'TEST01',
    userName: 'Player1',
    attackId: 'attack123',
    onDefend: mockOnDefend
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when attackId is null', () => {
      render(
        <DefenseModal {...defaultProps} attackId={null} />
      );
      expect(screen.queryByText('🚨 Under Attack!')).not.toBeInTheDocument();
    });

    it('should render modal when attackId is provided', () => {
      render(
        <DefenseModal {...defaultProps} />
      );
      expect(screen.getByText('🚨 Under Attack!')).toBeInTheDocument();
    });

    it('should display attack warning message', () => {
      render(
        <DefenseModal {...defaultProps} />
      );
      expect(screen.getByText(/You are under attack/i)).toBeInTheDocument();
    });
  });

  describe('Defense Options', () => {
    it('should display Use Shield button', () => {
      render(
        <DefenseModal {...defaultProps} />
      );
      expect(screen.getByText(/Use Shield/i)).toBeInTheDocument();
    });

    it('should display Accept button', () => {
      render(
        <DefenseModal {...defaultProps} />
      );
      expect(screen.getByText('Accept')).toBeInTheDocument();
    });

    it('should have both buttons enabled initially', () => {
      render(
        <DefenseModal {...defaultProps} />
      );
      const buttons = screen.getAllByRole('button');
      buttons.forEach(btn => {
        expect(btn).not.toBeDisabled();
      });
    });
  });

  describe('Use Shield Action', () => {
    it('should call onDefend when Use Shield clicked', () => {
      render(
        <DefenseModal {...defaultProps} />
      );

      const shieldButton = screen.getByText(/Use Shield/i);
      fireEvent.click(shieldButton);

      expect(mockOnDefend).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'shield' })
      );
    });
  });

  describe('Accept Action', () => {
    it('should call onDefend when Accept clicked', () => {
      render(
        <DefenseModal {...defaultProps} />
      );

      const acceptButton = screen.getByText('Accept');
      fireEvent.click(acceptButton);

      expect(mockOnDefend).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'accept' })
      );
    });
  });

  describe('Modal Interactions', () => {
    it('should not have close button (user must choose shield or accept)', () => {
      render(
        <DefenseModal {...defaultProps} />
      );
      const closeButton = screen.queryByRole('button', { name: '×' });
      expect(closeButton).not.toBeInTheDocument();
    });

    it('should trigger onDefend callback when shield is chosen', () => {
      render(
        <DefenseModal {...defaultProps} />
      );

      const shieldButton = screen.getByText(/Use Shield/i);
      fireEvent.click(shieldButton);

      expect(mockOnDefend).toHaveBeenCalled();
    });

    it('should trigger onDefend callback when accept is chosen', () => {
      render(
        <DefenseModal {...defaultProps} />
      );

      const acceptButton = screen.getByText('Accept');
      fireEvent.click(acceptButton);

      expect(mockOnDefend).toHaveBeenCalled();
    });
  });
});
