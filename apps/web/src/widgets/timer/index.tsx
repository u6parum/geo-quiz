import { useUnit } from 'effector-react';
import type { Store } from 'effector';

interface TimerProps {
  $elapsedSeconds: Store<number>;
  durationSeconds: number;
}

/**
 * Таймер с индикацией времени игры
 */
export const Timer: React.FC<TimerProps> = ({
  $elapsedSeconds,
  durationSeconds,
}) => {
  const elapsed = useUnit($elapsedSeconds);

  const remaining = Math.max(0, durationSeconds - elapsed);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const isLow = remaining <= 10;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="text-center">
      <div
        className={`text-4xl font-bold font-mono ${isLow ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}
      >
        {formattedTime}
      </div>
      <div className="text-sm text-gray-500">осталось</div>
    </div>
  );
};
