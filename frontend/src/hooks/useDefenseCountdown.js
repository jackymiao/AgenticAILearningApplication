import {useEffect, useRef, useState} from "react";

export function useDefenseCountdown(attackId, onTimeout, durationSeconds = 15) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const onTimeoutRef = useRef(onTimeout);
  const timeoutFiredRef = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!attackId) {
      timeoutFiredRef.current = false;
      setTimeLeft(durationSeconds);
      return;
    }

    timeoutFiredRef.current = false;
    const deadline = Date.now() + durationSeconds * 1000;

    const updateCountdown = () => {
      const remainingMs = deadline - Date.now();
      const nextTimeLeft = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft((current) =>
        current === nextTimeLeft ? current : nextTimeLeft,
      );

      if (remainingMs <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        onTimeoutRef.current?.();
      }
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 250);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", updateCountdown);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", updateCountdown);
    }

    return () => {
      clearInterval(timer);

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", updateCountdown);
      }

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", updateCountdown);
      }
    };
  }, [attackId, durationSeconds]);

  return timeLeft;
}
