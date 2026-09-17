import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';
import { $teams, loadTeams } from '@features/team';
import { createFx } from '@features/game';
import { Card, Button, Input } from '@ui';

export const AdminCreateGamePage = () => {
  const teams = useUnit($teams);
  const navigate = useNavigate();

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  // Проверяем, что все выбранные команды имеют загадку
  const selectedTeamsWithLandmarks = useMemo(() => {
    return selectedTeamIds.every((id) => {
      const team = teams.find((t) => t.id === id);
      return team && team.landmarks.length > 0;
    });
  }, [selectedTeamIds, teams]);

  const canSubmit = selectedTeamIds.length >= 2 && durationMinutes >= 1 && selectedTeamsWithLandmarks;

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError('');

    if (selectedTeamIds.length < 2) {
      return setError('Выберите минимум 2 команды');
    }

    if (!selectedTeamsWithLandmarks) {
      return setError('У всех выбранных команд должна быть одобренная загадка');
    }

    try {
      const totalSeconds = durationMinutes * 60;

      await createFx({
        durationSeconds: totalSeconds,
        hintsSchedule: [0, Math.floor(totalSeconds / 3), Math.floor((totalSeconds * 2) / 3)],
        questionWindows: [0, Math.floor(totalSeconds / 2), Math.floor((totalSeconds * 4) / 5)],
        teamIds: selectedTeamIds,
      });

      navigate('/admin/games');
    } catch (err: any) {
      setError(err.message ?? 'Ошибка создания игры');
    }
  };

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Создать игру</h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-600">{error}</div>}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Длительность (минуты)"
              type="number"
              min={1}
              max={60}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              required
            />

            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <div className="font-medium mb-1">Расписание (рассчитается автоматически)</div>
              <div>
                Подсказки: 0 сек · {Math.floor((durationMinutes * 60) / 3)} сек ·{' '}
                {Math.floor((durationMinutes * 60 * 2) / 3)} сек
              </div>
              <div>
                Окна вопросов: 0 сек · {Math.floor((durationMinutes * 60) / 2)} сек ·{' '}
                {Math.floor((durationMinutes * 60 * 4) / 5)} сек
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Команды-участники</h3>
                <span className="text-sm text-gray-500">Выбрано: {selectedTeamIds.length}</span>
              </div>

              {teams.length === 0 ? (
                <p className="text-sm text-gray-500">Нет одобренных команд. Одобрите заявки в разделе «Заявки».</p>
              ) : (
                <div className="space-y-2">
                  {teams.map((team) => {
                    console.log('Team', team);

                    const hasLandmark = team.landmarks.length > 0;
                    const isSelected = selectedTeamIds.includes(team.id);

                    return (
                      <label
                        key={team.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                          !hasLandmark
                            ? 'cursor-not-allowed opacity-50'
                            : isSelected
                              ? 'cursor-pointer border-blue-500 bg-blue-50'
                              : 'cursor-pointer hover:'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTeam(team.id)}
                          disabled={!hasLandmark}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{team.name}</div>
                          <div className="text-sm text-gray-500">
                            {hasLandmark ? `Загадка: ${team.landmarks[0].name}` : 'Нет одобренной загадки'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/games')} className="flex-1">
                Отмена
              </Button>
              <Button type="submit" disabled={!canSubmit} className="flex-1">
                Создать игру
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
