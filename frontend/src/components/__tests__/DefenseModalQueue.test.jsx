import React, { useState, useCallback } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useQueue } from '../../hooks/useQueue';

// Simplified DefenseModal for testing without Vite import.meta
function SimpleDefenseModal({ attackId, onDefend, onClose }) {
  console.log('[SimpleDefenseModal] Rendering with attackId:', attackId);
  
  if (!attackId) {
    console.log('[SimpleDefenseModal] No attackId, returning null');
    return null;
  }
  
  return (
    <div data-testid="pending-attack-modal">
      <div>Attack ID: {attackId}</div>
      <button onClick={() => onDefend({ success: true })} data-testid="defend-without-shield">
        Accept (No Shield)
      </button>
      <button onClick={() => onDefend({ success: true, useShield: true })} data-testid="defend-with-shield">
        Defend (Use Shield)
      </button>
      <button onClick={onClose} data-testid="close-button">
        Close
      </button>
    </div>
  );
}

// Test component that uses SimpleDefenseModal with useQueue
function DefenseModalQueueTest() {
  const attackQueue = useQueue();
  const [defendedAttacks, setDefendedAttacks] = useState([]);
  const [log, setLog] = useState([]);

  const handleDefend = useCallback((result) => {
    const currentAttack = attackQueue.peek();
    console.log('[handleDefend] Current attack before dequeue:', currentAttack);
    console.log('[handleDefend] Queue size before dequeue:', attackQueue.size());
    
    setDefendedAttacks(prev => [...prev, currentAttack]);
    setLog(prev => [...prev, `Defended: ${currentAttack}`]);
    
    // Simulate dequeue and show next
    attackQueue.dequeue();
    const nextAttack = attackQueue.peek();
    console.log('[handleDefend] Queue size after dequeue:', attackQueue.size());
    console.log('[handleDefend] Next attack after dequeue:', nextAttack);
    
    setLog(prev => [...prev, `Dequeued, next: ${nextAttack || 'none'}`]);
  }, [attackQueue]);

  const handleClose = useCallback(() => {
    const currentAttack = attackQueue.peek();
    setLog(prev => [...prev, `Closed without defending: ${currentAttack}`]);
    attackQueue.dequeue();
    console.log('[handleClose] After dequeue, next attack:', attackQueue.peek());
    setLog(prev => [...prev, `Dequeued (close), next: ${attackQueue.peek() || 'none'}`]);
  }, [attackQueue]);

  const handleAddAttack = (attackId) => {
    console.log('[handleAddAttack] Adding:', attackId, 'Current queue size:', attackQueue.size());
    attackQueue.enqueue(attackId);
    console.log('[handleAddAttack] After enqueue, queue size:', attackQueue.size(), 'peek:', attackQueue.peek());
    setLog(prev => [...prev, `Enqueued: ${attackId}`]);
  };

  return (
    <div>
      <button onClick={() => handleAddAttack('attack-1')} data-testid="add-attack-1">
        Add Attack 1
      </button>
      <button onClick={() => handleAddAttack('attack-2')} data-testid="add-attack-2">
        Add Attack 2
      </button>
      <button onClick={() => handleAddAttack('attack-3')} data-testid="add-attack-3">
        Add Attack 3
      </button>
      
      {console.log('[DefenseModalQueueTest] Rendering, peek:', attackQueue.peek(), 'size:', attackQueue.size())}
      
      <SimpleDefenseModal
        attackId={attackQueue.peek()}
        onDefend={handleDefend}
        onClose={handleClose}
      />
      
      <div data-testid="queue-size">Queue Size: {attackQueue.size()}</div>
      <div data-testid="queue-peek">Current Attack: {attackQueue.peek() || 'none'}</div>
      <div data-testid="defended-attacks">Defended: {defendedAttacks.join(', ') || 'none'}</div>
      
      <div data-testid="log">
        {log.map((entry, i) => <div key={i} data-testid={`log-${i}`}>{entry}</div>)}
      </div>
    </div>
  );
}

describe('DefenseModal with Attack Queue', () => {
  test('should display first attack', async () => {
    render(<DefenseModalQueueTest />);
    
    // Initially no modal
    expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: none');
    
    // Add first attack
    const addAttack1 = screen.getByTestId('add-attack-1');
    act(() => {
      fireEvent.click(addAttack1);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: attack-1');
    });
    
    // Modal should show
    expect(screen.getByTestId('pending-attack-modal')).toBeInTheDocument();
  });

  test('should queue second attack while first is showing', async () => {
    render(<DefenseModalQueueTest />);
    
    // Add first attack
    act(() => {
      fireEvent.click(screen.getByTestId('add-attack-1'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 1');
    });
    
    // Add second attack while first is showing
    act(() => {
      fireEvent.click(screen.getByTestId('add-attack-2'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 2');
    });
    
    // Still showing first attack
    expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: attack-1');
  });

  test('should show second attack after defending first', async () => {
    render(<DefenseModalQueueTest />);
    
    console.log('=== TEST: Two Attacks Sequential ===');
    
    // Add both attacks
    console.log('Step 1: Adding attack-1 and attack-2');
    act(() => {
      fireEvent.click(screen.getByTestId('add-attack-1'));
      fireEvent.click(screen.getByTestId('add-attack-2'));
    });
    
    console.log('Queue-size after adding:', screen.getByTestId('queue-size').textContent);
    console.log('Queue-peek after adding:', screen.getByTestId('queue-peek').textContent);
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 2');
    });
    
    // First attack showing
    console.log('Step 2: Verify first attack is showing');
    expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: attack-1');
    expect(screen.getByTestId('pending-attack-modal')).toHaveTextContent('Attack ID: attack-1');
    console.log('✓ First attack-1 modal is displayed');
    
    // Defend first attack (without shield)
    console.log('Step 3: Clicking defend on first attack');
    const defendWithoutShield = screen.getByTestId('defend-without-shield');
    act(() => {
      fireEvent.click(defendWithoutShield);
    });
    
    console.log('Queue-size after defending attack-1:', screen.getByTestId('queue-size').textContent);
    console.log('Queue-peek after defending attack-1:', screen.getByTestId('queue-peek').textContent);
    
    // After defending, should show second attack
    console.log('Step 4: Waiting for second attack to show');
    await waitFor(() => {
      console.log('Current peek:', screen.getByTestId('queue-peek').textContent);
      console.log('Current modal:', screen.getByTestId('pending-attack-modal')?.textContent || 'NO MODAL');
      expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: attack-2');
    });
    
    console.log('✓ Second attack-2 is now showing');
    expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 1');
    expect(screen.getByTestId('pending-attack-modal')).toHaveTextContent('Attack ID: attack-2');
    console.log('✓ Attack-2 modal confirmed');
  });

  test('should handle three attacks in sequence', async () => {
    render(<DefenseModalQueueTest />);
    
    // Add all three attacks
    act(() => {
      fireEvent.click(screen.getByTestId('add-attack-1'));
      fireEvent.click(screen.getByTestId('add-attack-2'));
      fireEvent.click(screen.getByTestId('add-attack-3'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 3');
    });
    
    // First attack
    expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: attack-1');
    
    // Defend first
    act(() => {
      fireEvent.click(screen.getByTestId('defend-without-shield'));
    });
    
    // Second attack should show
    await waitFor(() => {
      expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: attack-2');
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 2');
    });
    
    // Defend second
    act(() => {
      fireEvent.click(screen.getByTestId('defend-without-shield'));
    });
    
    //Third attack should show
    await waitFor(() => {
      expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: attack-3');
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 1');
    });
    
    // Defend third
    act(() => {
      fireEvent.click(screen.getByTestId('defend-without-shield'));
    });
    
    // Queue should be empty
    await waitFor(() => {
      expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: none');
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 0');
    });
  });

  test('should clear queue when all attacks are handled', async () => {
    render(<DefenseModalQueueTest />);
    
    // Add single attack
    act(() => {
      fireEvent.click(screen.getByTestId('add-attack-1'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 1');
    });
    
    // Defend the attack
    act(() => {
      fireEvent.click(screen.getByTestId('defend-without-shield'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-size')).toHaveTextContent('Queue Size: 0');
    });
    
    expect(screen.getByTestId('queue-peek')).toHaveTextContent('Current Attack: none');
  });
});
