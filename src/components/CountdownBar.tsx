import { useState, useEffect } from 'react';
import './CountdownBar.css';

interface CountdownBarProps {
  timerEnd: number | null | undefined;
}

export default function CountdownBar({ timerEnd }: CountdownBarProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!timerEnd) {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [timerEnd]);

  if (!timerEnd || secondsLeft <= 0) return null;

  const totalDuration = 30; // max display reference
  const pct = Math.min(100, (secondsLeft / totalDuration) * 100);
  const urgent = secondsLeft <= 5;

  return (
    <div className={`countdown-bar ${urgent ? 'urgent' : ''}`}>
      <div className="countdown-fill" style={{ width: `${pct}%` }} />
      <span className="countdown-text">{secondsLeft}s</span>
    </div>
  );
}
