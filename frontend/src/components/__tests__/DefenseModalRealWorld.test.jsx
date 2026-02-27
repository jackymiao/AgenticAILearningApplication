import React, { useState, useCallback, useRef, useEffect } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useQueue } from '../../hooks/useQueue';

// Simplified DefenseModal that mimics the real one
function DefenseModal({ attackId, onDefend, onClose }) {
  console.log('[DefenseModal] Rendering with attackId:', attackId);
  
  if (!attackId) {
    console.log('[DefenseModal] No attackId, returning null (modal hidden)');
    return null;
  }
  
  return (
    <div data-testid="defense-modal">
      <div data-testid="attack-id">Attack: {attackId}</div>
      <button onClick={() => onDefend({ success: true })} data-testid="defend-btn">
        Defend
      </button>
      <button onClick={onClose} data-testid="close-btn">
        Close
      </button>
    </div>
  );
}

// Simulate WebSocket behavior with ref-based callbacks (like real useWebSocket hook)
function useSimulatedWebSocket(onAttackReceived) {
  const onAttackReceivedRef = useRef(onAttackReceived);
  
  useEffect(() => {
    onAttackReceivedRef.current = onAttackReceived;
  }, [onAttackReceived]);
  
  const simulateAttack = useCallback((attackId) => {
    console.log('[WebSocket] Simulating incoming attack:', attackId);
    if (onAttackReceivedRef.current) {
      onAttackReceivedRef.current(attackId);
    }
  }, []);
  
  return { simulateAttack };
}

// Component that mimics ProjectPage behavior
function ProjectPageSimulation() {
  const incomingAttackQueue = useQueue();
  const [defendedAttacks, setDefendedAttacks] = useState([]);
  
  console.log('[ProjectPage] Rendering - queue peek:', incomingAttackQueue.peek(), 'size:', incomingAttackQueue.size());
  
  // WebSocket callback with useCallback (like in real ProjectPage)
  const handleOnAttackReceived = useCallback((attackId) => {
    console.log('[ProjectPage.handleOnAttackReceived] Incoming attack:', attackId);
    console.log('[ProjectPage.handleOnAttackReceived] Queue BEFORE enqueue - peek:', incomingAttackQueue.peek(), 'size:', incomingAttackQueue.size());
    
    incomingAttackQueue.enqueue(attackId);
    
    console.log('[ProjectPage.handleOnAttackReceived] Queue AFTER enqueue - peek:', incomingAttackQueue.peek(), 'size:', incomingAttackQueue.size());
  }, [incomingAttackQueue]);
  
  const { simulateAttack } = useSimulatedWebSocket(handleOnAttackReceived);
  
  const handleDefenseResponse = useCallback(async (result) => {
    console.log('[ProjectPage.handleDefenseResponse] Defending attack');
    console.log('[ProjectPage.handleDefenseResponse] Queue BEFORE dequeue - peek:', incomingAttackQueue.peek(), 'size:', incomingAttackQueue.size());
    
    const defendedAttackId = incomingAttackQueue.peek();
    setDefendedAttacks(prev => [...prev, defendedAttackId]);
    
    incomingAttackQueue.dequeue();
    
    console.log('[ProjectPage.handleDefenseResponse] Queue AFTER dequeue - peek:', incomingAttackQueue.peek(), 'size:', incomingAttackQueue.size());
  }, [incomingAttackQueue]);
  
  const handleDefenseClose = useCallback(() => {
    console.log('[ProjectPage.handleDefenseClose] Closing modal');
    incomingAttackQueue.dequeue();
  }, [incomingAttackQueue]);
  
  return (
    <div>
      <button 
        onClick={() => simulateAttack('attack-1')} 
        data-testid="trigger-attack-1"
      >
        Trigger Attack 1
      </button>
      <button 
        onClick={() => simulateAttack('attack-2')} 
        data-testid="trigger-attack-2"
      >
        Trigger Attack 2
      </button>
      <button 
        onClick={() => simulateAttack('attack-3')} 
        data-testid="trigger-attack-3"
      >
        Trigger Attack 3
      </button>
      
      <div data-testid="queue-info">
        Queue size: {incomingAttackQueue.size()}, 
        Current: {incomingAttackQueue.peek() || 'none'}
      </div>
      
      <div data-testid="defended-list">
        Defended: {defendedAttacks.join(', ') || 'none'}
      </div>
      
      <DefenseModal
        attackId={incomingAttackQueue.peek()}
        onDefend={handleDefenseResponse}
        onClose={handleDefenseClose}
      />
    </div>
  );
}

describe('DefenseModal Real World Scenario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show second modal after defending first attack', async () => {
    console.log('\n=== TEST START: Two Sequential Attacks ===\n');
    
    render(<ProjectPageSimulation />);
    
    // Initially no modal
    expect(screen.queryByTestId('defense-modal')).not.toBeInTheDocument();
    console.log('✓ Step 1: No modal initially');
    
    // Trigger first attack
    console.log('\n--- Triggering Attack 1 ---');
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-attack-1'));
    });
    
    // Wait for modal to appear with attack-1
    await waitFor(() => {
      expect(screen.getByTestId('defense-modal')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('attack-id')).toHaveTextContent('Attack: attack-1');
    expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 1');
    console.log('✓ Step 2: Attack-1 modal showing, queue size = 1');
    
    // Trigger second attack while first is showing
    console.log('\n--- Triggering Attack 2 (while attack-1 modal is open) ---');
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-attack-2'));
    });
    
    // Queue should now have 2 attacks
    await waitFor(() => {
      expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 2');
    });
    
    // Modal should STILL show attack-1 (first in queue)
    expect(screen.getByTestId('attack-id')).toHaveTextContent('Attack: attack-1');
    console.log('✓ Step 3: Attack-2 queued, queue size = 2, still showing attack-1');
    
    // Defend the first attack
    console.log('\n--- Defending Attack 1 ---');
    act(() => {
      fireEvent.click(screen.getByTestId('defend-btn'));
    });
    
    // CRITICAL: Modal should now show attack-2
    console.log('\n--- Waiting for Attack 2 modal to appear ---');
    await waitFor(() => {
      const modal = screen.getByTestId('defense-modal');
      const attackIdElement = screen.getByTestId('attack-id');
      console.log('Current modal attack-id text:', attackIdElement.textContent);
      expect(attackIdElement).toHaveTextContent('Attack: attack-2');
    }, { timeout: 3000 });
    
    expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 1');
    expect(screen.getByTestId('defended-list')).toHaveTextContent('Defended: attack-1');
    console.log('✓ Step 4: Attack-2 modal now showing, queue size = 1');
    
    // Defend the second attack
    console.log('\n--- Defending Attack 2 ---');
    act(() => {
      fireEvent.click(screen.getByTestId('defend-btn'));
    });
    
    // Modal should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('defense-modal')).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 0');
    expect(screen.getByTestId('defended-list')).toHaveTextContent('Defended: attack-1, attack-2');
    console.log('✓ Step 5: All attacks defended, queue empty, modal hidden');
    
    console.log('\n=== TEST PASSED ===\n');
  });

  test('should handle three rapid attacks sequentially', async () => {
    console.log('\n=== TEST START: Three Rapid Attacks ===\n');
    
    render(<ProjectPageSimulation />);
    
    // Trigger all three attacks rapidly
    console.log('--- Triggering 3 attacks rapidly ---');
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-attack-1'));
      fireEvent.click(screen.getByTestId('trigger-attack-2'));
      fireEvent.click(screen.getByTestId('trigger-attack-3'));
    });
    
    // All three should be queued
    await waitFor(() => {
      expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 3');
    });
    
    expect(screen.getByTestId('attack-id')).toHaveTextContent('Attack: attack-1');
    console.log('✓ All 3 attacks queued, showing attack-1');
    
    // Defend attack 1
    console.log('\n--- Defending Attack 1 ---');
    act(() => {
      fireEvent.click(screen.getByTestId('defend-btn'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('attack-id')).toHaveTextContent('Attack: attack-2');
      expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 2');
    });
    console.log('✓ Attack-2 now showing, queue size = 2');
    
    // Defend attack 2
    console.log('\n--- Defending Attack 2 ---');
    act(() => {
      fireEvent.click(screen.getByTestId('defend-btn'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('attack-id')).toHaveTextContent('Attack: attack-3');
      expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 1');
    });
    console.log('✓ Attack-3 now showing, queue size = 1');
    
    // Defend attack 3
    console.log('\n--- Defending Attack 3 ---');
    act(() => {
      fireEvent.click(screen.getByTestId('defend-btn'));
    });
    
    await waitFor(() => {
      expect(screen.queryByTestId('defense-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 0');
    });
    
    expect(screen.getByTestId('defended-list')).toHaveTextContent('Defended: attack-1, attack-2, attack-3');
    console.log('✓ All 3 attacks defended, queue empty');
    
    console.log('\n=== TEST PASSED ===\n');
  });

  test('should handle close without defending and show next attack', async () => {
    console.log('\n=== TEST START: Close Without Defending ===\n');
    
    render(<ProjectPageSimulation />);
    
    // Trigger two attacks
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-attack-1'));
      fireEvent.click(screen.getByTestId('trigger-attack-2'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 2');
    });
    
    // Close first attack without defending
    console.log('--- Closing attack-1 without defending ---');
    act(() => {
      fireEvent.click(screen.getByTestId('close-btn'));
    });
    
    // Should show attack-2
    await waitFor(() => {
      expect(screen.getByTestId('attack-id')).toHaveTextContent('Attack: attack-2');
      expect(screen.getByTestId('queue-info')).toHaveTextContent('Queue size: 1');
    });
    
    console.log('✓ Attack-2 shows after closing attack-1');
    console.log('\n=== TEST PASSED ===\n');
  });
});
