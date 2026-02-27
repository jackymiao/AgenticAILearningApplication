import {renderHook, act} from "@testing-library/react";
import {useQueue} from "../useQueue";

describe("useQueue", () => {
  test("should initialize empty queue", () => {
    const {result} = renderHook(() => useQueue());
    expect(result.current.isEmpty()).toBe(true);
    expect(result.current.size()).toBe(0);
    expect(result.current.peek()).toBe(null);
  });

  test("should enqueue items", () => {
    const {result} = renderHook(() => useQueue());

    act(() => {
      result.current.enqueue("attack1");
    });

    expect(result.current.size()).toBe(1);
    expect(result.current.peek()).toBe("attack1");
  });

  test("should enqueue multiple items in order", () => {
    const {result} = renderHook(() => useQueue());

    act(() => {
      result.current.enqueue("attack1");
      result.current.enqueue("attack2");
      result.current.enqueue("attack3");
    });

    expect(result.current.size()).toBe(3);
    expect(result.current.peek()).toBe("attack1");
    expect(result.current.queue).toEqual(["attack1", "attack2", "attack3"]);
  });

  test("should dequeue items in FIFO order", async () => {
    const {result} = renderHook(() => useQueue());

    await act(async () => {
      result.current.enqueue("attack1");
      result.current.enqueue("attack2");
      result.current.enqueue("attack3");
    });

    expect(result.current.size()).toBe(3);

    await act(async () => {
      const first = result.current.peek();
      expect(first).toBe("attack1");
      result.current.dequeue();
    });

    expect(result.current.size()).toBe(2);
    expect(result.current.peek()).toBe("attack2");

    await act(async () => {
      result.current.dequeue();
    });

    expect(result.current.size()).toBe(1);
    expect(result.current.peek()).toBe("attack3");

    await act(async () => {
      result.current.dequeue();
    });

    expect(result.current.isEmpty()).toBe(true);
  });

  test("should handle dequeuing empty queue", () => {
    const {result} = renderHook(() => useQueue());

    act(() => {
      result.current.dequeue();
      expect(result.current.isEmpty()).toBe(true);
    });
  });

  test("should clear queue", () => {
    const {result} = renderHook(() => useQueue());

    act(() => {
      result.current.enqueue("attack1");
      result.current.enqueue("attack2");
    });

    expect(result.current.size()).toBe(2);

    act(() => {
      result.current.clear();
    });

    expect(result.current.isEmpty()).toBe(true);
    expect(result.current.size()).toBe(0);
  });

  test("should handle rapid enqueue/dequeue operations", async () => {
    const {result} = renderHook(() => useQueue());

    await act(async () => {
      result.current.enqueue("attack1");
      result.current.enqueue("attack2");
    });

    expect(result.current.queue).toEqual(["attack1", "attack2"]);

    await act(async () => {
      result.current.dequeue();
    });

    expect(result.current.queue).toEqual(["attack2"]);

    await act(async () => {
      result.current.enqueue("attack3");
    });

    expect(result.current.queue).toEqual(["attack2", "attack3"]);
    expect(result.current.peek()).toBe("attack2");
  });
});
