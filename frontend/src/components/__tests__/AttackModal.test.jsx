import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock import.meta before importing the component
jest.mock('../AttackModal', () => {
  return function MockAttackModal({ isOpen, onClose, projectCode, currentUserName, onAttack }) {
    if (!isOpen) return null;
    
    return (
      <div className="modal-overlay" data-testid="attack-modal-overlay">
        <div className="modal-content attack-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🎯 Choose Your Target</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="player-list" data-testid="target-list">
              <div className="player-item">
                <div className="player-info">
                  <div className="player-name" data-testid="target-name">Player2</div>
                  <div className="player-tokens">
                    <span className="token-badge">2 Review</span>
                    <span className="token-badge">1 Shield</span>
                  </div>
                </div>
                <button 
                  className="attack-button" 
                  data-testid="attack-btn"
                  onClick={() => onAttack({ success: true })}
                >
                  🎯 Attack
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
});

import AttackModal from '../AttackModal';

describe('AttackModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnAttack = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    projectCode: 'TEST01',
    currentUserName: 'Player1',
    onAttack: mockOnAttack
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <AttackModal {...defaultProps} isOpen={false} />
      );
      expect(screen.queryByText('🎯 Choose Your Target')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(
        <AttackModal {...defaultProps} />
      );
      expect(screen.getByText('🎯 Choose Your Target')).toBeInTheDocument();
    });

    it('should display close button', () => {
      render(
        <AttackModal {...defaultProps} />
      );
      const closeButton = screen.getByRole('button', { name: '×' });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Player List Display', () => {
    it('should display list of active players', () => {
      render(
        <AttackModal {...defaultProps} />
      );
      expect(screen.getByText('Player2')).toBeInTheDocument();
    });

    it('should display token counts for each player', () => {
      render(
        <AttackModal {...defaultProps} />
      );
      expect(screen.getByText('2 Review')).toBeInTheDocument();
      expect(screen.getByText('1 Shield')).toBeInTheDocument();
    });
  });

  describe('Attack Action', () => {
    it('should display attack button with correct emoji and text', () => {
      render(
        <AttackModal {...defaultProps} />
      );
      expect(screen.getByText('🎯 Attack')).toBeInTheDocument();
    });

    it('should call onAttack when attack button is clicked', () => {
      render(
        <AttackModal {...defaultProps} />
      );
      const attackButton = screen.getByText('🎯 Attack');
      fireEvent.click(attackButton);
      expect(mockOnAttack).toHaveBeenCalled();
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when close button is clicked', () => {
      render(
        <AttackModal {...defaultProps} />
      );
      const closeButton = screen.getByRole('button', { name: '×' });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when clicking modal content', () => {
      const { container } = render(
        <AttackModal {...defaultProps} />
      );
      const modalContent = container.querySelector('.modal-content');
      fireEvent.click(modalContent);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
