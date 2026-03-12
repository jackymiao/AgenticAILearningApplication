import React, { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDefenseCountdown } from '../../hooks/useDefenseCountdown';

function CountdownHarness({ attackId, onTimeout, marker }) {
  const timeLeft = useDefenseCountdown(attackId, onTimeout, 15);

  return (
    <div>
      <div data-testid="marker">{marker}</div>
      <div data-testid="time-left">{timeLeft}</div>
    </div>
  );
}

function ParentRerenderHarness({ attackId }) {
  const [marker, setMarker] = useState('initial');
  const [timeouts, setTimeouts] = useState(0);

  return (
    <div>
      <button onClick={() => setMarker('rerendered')} data-testid="rerender-btn">
        Rerender
      </button>
      <div data-testid="timeout-count">{timeouts}</div>
      <CountdownHarness
        attackId={attackId}
        marker={marker}
        onTimeout={() => setTimeouts((prev) => prev + 1)}
      />
    </div>
  );
}

describe('DefenseModal countdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  it('continues counting down when parent passes a new onDefend callback', () => {
    render(<ParentRerenderHarness attackId="attack-123" />);

    expect(screen.getByTestId('time-left')).toHaveTextContent('15');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('time-left')).toHaveTextContent('14');

    act(() => {
      screen.getByTestId('rerender-btn').click();
    });

    expect(screen.getByTestId('marker')).toHaveTextContent('rerendered');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('time-left')).toHaveTextContent('13');
    expect(screen.getByTestId('timeout-count')).toHaveTextContent('0');
  });

  it('fires the timeout only once after the deadline passes', () => {
    render(<ParentRerenderHarness attackId="attack-123" />);

    act(() => {
      jest.advanceTimersByTime(16000);
    });

    expect(screen.getByTestId('time-left')).toHaveTextContent('0');
    expect(screen.getByTestId('timeout-count')).toHaveTextContent('1');

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('time-left')).toHaveTextContent('0');
    expect(screen.getByTestId('timeout-count')).toHaveTextContent('1');
  });
});