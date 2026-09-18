import type { Store } from 'effector';
import { useUnit } from 'effector-react';

import type { LeaderboardEntry } from '@shared/contracts';

interface LeaderboardProps {
  $leaderboard: Store<LeaderboardEntry[]>;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ $leaderboard }) => {
  const leaderboard = useUnit($leaderboard);

  return (
    <div className="rounded-xl p-4 border">
      <h3 className="font-semibold text-lg mb-3">🏆 Турнирная таблица</h3>
      <div className="space-y-2">
        {leaderboard.map((entry: LeaderboardEntry) => (
          <div key={entry.teamId} className="flex justify-between items-center p-2 rounded ">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-500">#{entry.rank}</span>
              <span>{entry.teamName}</span>
            </div>
            <span className="font-mono font-bold">{entry.score}</span>
          </div>
        ))}
        {leaderboard.length === 0 && <div className="text-sm text-gray-400">Нет данных</div>}
      </div>
    </div>
  );
};
