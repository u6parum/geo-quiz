import { useState } from 'react';
import { useGate, useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';
import { $myGames, MyGamesGate } from '@features/team';
import type { GamePhase } from '@shared/contracts';
import { Badge, Button, Card } from '@ui';

const STATUS_LABELS: Record<GamePhase, string> = {
  LOBBY: 'Лобби',
  MODERATION: 'Ожидание старта',
  ACTIVE: 'Активна',
  FINISHED: 'Завершена',
};

const STATUS_VARIANTS: Record<GamePhase, 'info' | 'warning' | 'success' | 'neutral'> = {
  LOBBY: 'info',
  MODERATION: 'warning',
  ACTIVE: 'success',
  FINISHED: 'neutral',
};

type Filter = 'ALL' | 'ACTIVE' | 'FINISHED';

export const MyGamesPage = () => {
  useGate(MyGamesGate);

  const games = useUnit($myGames);
  const navigate = useNavigate();

  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = games.filter((game) => {
    if (filter === 'ALL') {
      return true;
    }

    if (filter === 'ACTIVE') {
      return game.status === 'ACTIVE' || game.status === 'MODERATION';
    }

    if (filter === 'FINISHED') {
      return game.status === 'FINISHED';
    }

    return true;
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Мои игры</h1>

        {/* Фильтры */}
        <div className="flex gap-2 mb-4">
          {(['ALL', 'ACTIVE', 'FINISHED'] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)}>
              {f === 'ALL' && 'Все'}
              {f === 'ACTIVE' && 'Активные'}
              {f === 'FINISHED' && 'Завершённые'}
            </Button>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">
              {games.length === 0 ? 'Пока нет игр с вашей командой' : 'Нет игр с таким фильтром'}
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {filtered.map((game) => (
            <Card key={game.id}>
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-gray-400">#{game.id.slice(0, 8)}</span>
                    <Badge variant={STATUS_VARIANTS[game.status]}>{STATUS_LABELS[game.status]}</Badge>
                  </div>

                  <div className="text-sm text-gray-500">
                    Команда: <span className="font-medium">{game.teamName}</span>
                  </div>

                  {game.startedAt && (
                    <div className="text-xs text-gray-400 mt-1">
                      Начало: {new Date(game.startedAt).toLocaleString('ru-RU')}
                    </div>
                  )}

                  {game.finishedAt && (
                    <div className="text-xs text-gray-400">
                      Завершение: {new Date(game.finishedAt).toLocaleString('ru-RU')}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[130px]">
                  {game.status === 'ACTIVE' && (
                    <Button size="sm" onClick={() => navigate(`/game/${game.id}`)}>
                      Играть
                    </Button>
                  )}

                  {game.status === 'MODERATION' && (
                    <Button size="sm" onClick={() => navigate(`/game/${game.id}`)}>
                      Перейти
                    </Button>
                  )}

                  {game.status === 'FINISHED' && (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/game/${game.id}`)}>
                      Результаты
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
