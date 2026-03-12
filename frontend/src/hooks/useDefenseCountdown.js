import {useEffect, useRef, useState} from "react";

export function useDefenseCountdown(attackId, onTimeout, durationSeconds = 15) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!attackId) return;

    setTimeLeft(durationSeconds);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeoutRef.current?.();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attackId, durationSeconds]);

  return timeLeft;
}
