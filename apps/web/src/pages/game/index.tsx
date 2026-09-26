import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useMyTeam } from '@features/team';
import { useGameSync } from '@features/real-time';

import { Timer } from '@widgets/timer';
import { TeamPanel } from '@widgets/team-panel';
import { QuestionPanel } from '@widgets/question-panel';
import { Leaderboard } from '@widgets/leaderboard';

import { Badge, Button, Card } from '@ui';

export const GamePage: React.FC = () => {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const { id: teamId, name: teamName, isLoading: myTeamsLoading } = useMyTeam(gameId);

  const { room, socket } = useGameSync({ teamId, gameId });

  const [config, phase, subPhase, currentTeam, leaderboard, connectionError, isConnected, fatalError] = useUnit([
    room.$config,
    room.$phase,
    room.$subPhase,
    room.$currentTeam,
    room.$leaderboard,
    room.$connectionError,
    socket.$isConnected,
    socket.$fatalError,
  ]);

  const navigate = useNavigate();

  // Присоединяемся к игре
  useEffect(() => {
    if (gameId && teamId) {
      socket.connectRequested();
    }

    return socket.disconnectRequested;
  }, [gameId, teamId]);

  if (fatalError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600">Не удалось подключиться</h2>
          <p className="text-gray-600 mt-2">{fatalError}</p>
          <Button onClick={() => navigate('/games')} className="mt-4">
            К моим играм
          </Button>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600">Ошибка подключения</h2>
          <p className="text-gray-600 mt-2">{connectionError}</p>
          <p className="text-gray-500 mt-4">Команда уже в игре. Закройте другую вкладку и обновите страницу.</p>
        </div>
      </div>
    );
  }

  // === Состояние 1: команды ещё загружаются ===
  if (myTeamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  // === Состояние 2: команда не участвует в игре ===
  if (!teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <h2 className="text-xl font-bold mb-3">Ваша команда не участвует в этой игре</h2>
          <p className="text-gray-600 mb-6">Обратитесь к администратору или проверьте список своих игр.</p>
          <Button onClick={() => navigate('/games')}>К моим играм</Button>
        </Card>
      </div>
    );
  }

  // === Состояние 3: соединение устанавливается ===
  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Подключение к игре...</div>
      </div>
    );
  }

  // === Состояние 4: игра ещё не началась ===
  if (phase === 'LOBBY' || phase === 'MODERATION') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <h2 className="text-xl font-bold mb-3">Игра ещё не началась</h2>
          <p className="text-gray-600 mb-6">
            Ожидайте, пока администратор запустит игру. Страница обновится автоматически.
          </p>

          <div className="flex flex-col items-center gap-2">
            <Badge variant={isConnected ? 'success' : 'error'}>
              {isConnected ? 'Подключено к серверу' : 'Нет соединения'}
            </Badge>
            <span className="text-sm text-gray-400">Команда: {teamName}</span>
          </div>
        </Card>
      </div>
    );
  }

  // === Состояние 5: игра завершена ===
  if (phase === 'FINISHED') {
    // Лидерборд приходит через GAME_ENDED и обновляет room.$leaderboard
    const finalLeaderboard = leaderboard;

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <h2 className="text-2xl font-bold mb-2">Игра завершена!</h2>
            <p className="text-gray-500 mb-6">Финальная турнирная таблица</p>

            {finalLeaderboard.length === 0 ? (
              <p className="text-gray-400 py-8">Загрузка результатов...</p>
            ) : (
              <div className="space-y-2">
                {finalLeaderboard.map((entry) => (
                  <div
                    key={entry.teamId}
                    className={`flex justify-between items-center p-3 rounded-lg border ${
                      entry.teamId === teamId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400">#{entry.rank}</span>
                      <span className="font-medium">{entry.teamName}</span>
                    </div>
                    <span className="font-mono font-bold">{entry.score}</span>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={() => navigate('/games')} className="mt-6">
              К моим играм
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // === Состояние 6: игра активна, но команда ещё не подгрузилась ===
  if (!currentTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка команды...</div>
      </div>
    );
  }

  const guessingSessions = currentTeam.getAllGuessingSessions();
  const isQuestionWindow = subPhase === 'between_1_and_2' || subPhase === 'between_2_and_3';

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Шапка */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Geo-Quiz: {currentTeam.teamName}</h1>
          <Badge variant={isConnected ? 'success' : 'error'}>{isConnected ? '🟢 Онлайн' : '🔴 Офлайн'}</Badge>
        </div>
        <Timer $elapsedSeconds={room.$elapsedSeconds} durationSeconds={config.durationSeconds} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Игровое поле */}
        <div className="col-span-2">
          <div className="grid grid-cols-1 gap-4">
            {guessingSessions.map((session) => (
              <TeamPanel
                key={session.targetTeamId}
                teamId={session.targetTeamId}
                teamName={session.targetTeamName}
                $revealedHints={session.$revealedHints}
                $isCompleted={session.$isCompleted}
                $earnedScore={session.$earnedScore}
                $scoreBreakdown={session.$scoreBreakdown}
                $guessHistory={session.$guessHistory}
                submitGuess={session.submitGuess}
              />
            ))}
          </div>

          {/* Вопросы */}
          <QuestionPanel
            $incomingQuestions={currentTeam.$incomingQuestions}
            $questionsRemaining={currentTeam.$questionsRemaining}
            $outgoingQuestions={currentTeam.$outgoingQuestions}
            $teams={room.$teams.map((teams) => teams.map((t) => ({ id: t.teamId, name: t.teamName })))}
            askQuestion={(params) => {
              currentTeam.askQuestion({
                toTeamId: params.toTeamId,
                text: params.text,
              });
            }}
            answerQuestion={(params) => {
              currentTeam.answerQuestion({
                questionId: params.questionId,
                answer: params.answer,
              });
            }}
            isQuestionWindow={isQuestionWindow}
          />
        </div>

        {/* Сайдбар: лидерборд */}
        <div>
          <Leaderboard $leaderboard={room.$leaderboard} />
        </div>
      </div>
    </div>
  );
};
