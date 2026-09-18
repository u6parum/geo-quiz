import { useGate, useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';
import { $games, $gamesLoading, AdminGamesGate, startGame } from '@features/game';
import { Badge, Button, Card } from '@ui';

import type { GameStatus } from '@features/game';

const STATUS_LABELS: Record<GameStatus, string> = {
  LOBBY: 'Лобби',
  MODERATION: 'Модерация',
  ACTIVE: 'Активна',
  FINISHED: 'Завершена',
};

const STATUS_VARIANTS: Record<GameStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  LOBBY: 'info',
  MODERATION: 'warning',
  ACTIVE: 'success',
  FINISHED: 'neutral',
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} мин` : `${minutes} мин ${rest} сек`;
}

export const AdminGamesPage = () => {
  useGate(AdminGamesGate);

  const { games, isLoading } = useUnit({ games: $games, isLoading: $gamesLoading });

  const navigate = useNavigate();

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Игры</h1>
          <Button onClick={() => navigate('/admin/games/new')}>Создать игру</Button>
        </div>

        {isLoading && games.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">Загрузка...</p>
          </Card>
        )}

        {!isLoading && games.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Пока нет ни одной игры</p>
              <Button onClick={() => navigate('/admin/games/new')}>Создать первую игру</Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {games.map((game) => {
            const teamNames = game.teams.map((gt) => gt.team.name).join(', ');

            return (
              <Card key={game.id}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-gray-400">#{game.id.slice(0, 8)}</span>
                      <Badge variant={STATUS_VARIANTS[game.status]}>{STATUS_LABELS[game.status]}</Badge>
                    </div>

                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-gray-500">Команды:</span>{' '}
                        <span className="font-medium">{teamNames || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Длительность:</span> {formatDuration(game.durationSeconds)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Создана: {new Date(game.createdAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[130px]">
                    {game.status === 'MODERATION' && (
                      <Button size="sm" onClick={() => startGame(game.id)}>
                        Запустить
                      </Button>
                    )}

                    {game.status === 'ACTIVE' && (
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/games/${game.id}/monitor`)}>
                        Мониторинг
                      </Button>
                    )}

                    {game.status === 'FINISHED' && (
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/games/${game.id}`)}>
                        Результаты
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
