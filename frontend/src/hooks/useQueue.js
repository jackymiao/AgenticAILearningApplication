import {useReducer, useCallback} from "react";

/**
 * Queue reducer to handle all queue operations atomically
 * This ensures state updates are batched correctly in tests and in React
 */
function queueReducer(state, action) {
  switch (action.type) {
    case "ENQUEUE":
      return [...state, action.payload];
    case "DEQUEUE":
      return state.length > 0 ? state.slice(1) : state;
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

/**
 * Custom hook for managing a FIFO queue of items
 * Useful for handling sequential events like incoming attacks
 */
export function useQueue(initialQueue = []) {
  const [queue, dispatch] = useReducer(queueReducer, initialQueue);

  // Add item to end of queue
  const enqueue = useCallback((item) => {
    dispatch({type: "ENQUEUE", payload: item});
  }, []);

  // Remove first item from queue
  // Note: Use peek() first to get the item value, then call dequeue() to remove it
  const dequeue = useCallback(() => {
    dispatch({type: "DEQUEUE"});
  }, []);

  // Get first item without removing (peek)
  const peek = useCallback(() => {
    return queue.length > 0 ? queue[0] : null;
  }, [queue]);

  // Check if queue is empty
  const isEmpty = useCallback(() => {
    return queue.length === 0;
  }, [queue]);

  // Get queue size
  const size = useCallback(() => {
    return queue.length;
  }, [queue]);

  // Clear entire queue
  const clear = useCallback(() => {
    dispatch({type: "CLEAR"});
  }, []);

  return {
    queue,
    enqueue,
    dequeue,
    peek,
    isEmpty,
    size,
    clear,
  };
}
