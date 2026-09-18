import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';
import { useAdminSync } from '@features/real-time';
import { Leaderboard } from '@widgets/leaderboard';
import { Badge, Button, Card } from '@ui';

const SUB_PHASE_LABELS: Record<string, string> = {
  before_hints_1: 'До 1-й группы подсказок',
  hints_1: 'Открыта 1-я группа',
  between_1_and_2: 'Окно вопросов 1',
  hints_2: 'Открыта 2-я группа',
  between_2_and_3: 'Окно вопросов 2',
  hints_3: 'Открыта 3-я группа',
  final_guessing: 'Финальное угадывание',
};

export const GameMonitorPage = () => {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const { room, socket } = useAdminSync({ gameId });

  const [phase, subPhase, elapsed, leaderboard, config, isConnected] = useUnit([
    room.$phase,
    room.$subPhase,
    room.$elapsedSeconds,
    room.$leaderboard,
    room.$config,
    socket.$isConnected,
  ]);

  useEffect(() => {
    socket.connectRequested();
    return socket.disconnectRequested;
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Подключение к игре...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Мониторинг игры</h1>
            <span className="font-mono text-xs text-gray-400">#{gameId?.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? 'success' : 'error'}>{isConnected ? 'Онлайн' : 'Офлайн'}</Badge>
            <Button variant="secondary" onClick={() => navigate('/admin/games')}>
              Назад
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="text-sm text-gray-500 mb-1">Фаза</div>
            <div className="font-semibold">
              {phase === 'ACTIVE' && (SUB_PHASE_LABELS[subPhase] ?? subPhase)}
              {phase === 'MODERATION' && 'Ожидание старта'}
              {phase === 'LOBBY' && 'Лобби'}
              {phase === 'FINISHED' && 'Завершена'}
            </div>
          </Card>

          <Card>
            <div className="text-sm text-gray-500 mb-1">Время</div>
            <div className="font-mono text-lg">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </div>
          </Card>

          <Card>
            <div className="text-sm text-gray-500 mb-1">Команд</div>
            <div className="font-semibold text-lg">{leaderboard.length}</div>
          </Card>
        </div>

        <Leaderboard $leaderboard={room.$leaderboard} />
      </div>
    </div>
  );
};
