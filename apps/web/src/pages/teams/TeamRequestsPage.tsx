import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import {
  $myTeams,
  $teamRequestsMap,
  $teamRequestsLoading,
  loadMyTeams,
  loadTeamRequests,
  approveRequest,
  rejectRequest,
} from '@features/team';
import { Button, Card } from '@ui';

export const TeamRequestsPage = () => {
  const myTeams = useUnit($myTeams);
  const requestsMap = useUnit($teamRequestsMap);
  const isLoading = useUnit($teamRequestsLoading);

  // Команды, где я капитан
  const captainTeams = myTeams.filter((t) => t.isCaptain);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    loadMyTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamRequests(selectedTeamId);
    }
  }, [selectedTeamId]);

  // Автовыбор первой команды
  useEffect(() => {
    if (!selectedTeamId && captainTeams.length > 0) {
      setSelectedTeamId(captainTeams[0].id);
    }
  }, [captainTeams]);

  if (captainTeams.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Запросы на вступление</h1>
        <Card>
          <p className="text-gray-500 text-center py-8">Вы не капитан ни одной команды</p>
        </Card>
      </div>
    );
  }

  const requests = selectedTeamId ? (requestsMap[selectedTeamId] ?? []) : [];

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Запросы на вступление</h1>

        {/* Выбор команды */}
        {captainTeams.length > 1 && (
          <div className="mb-4 flex gap-2">
            {captainTeams.map((team) => (
              <Button
                key={team.id}
                size="sm"
                variant={selectedTeamId === team.id ? 'primary' : 'secondary'}
                onClick={() => setSelectedTeamId(team.id)}
              >
                {team.name}
              </Button>
            ))}
          </div>
        )}

        {isLoading && requests.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">Загрузка...</p>
          </Card>
        )}

        {!isLoading && requests.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">Нет активных запросов</p>
          </Card>
        )}

        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <div className="font-semibold">{request.user?.fullName ?? 'Пользователь'}</div>
                  {request.user?.email && <div className="text-sm text-gray-500">{request.user.email}</div>}
                  <div className="text-xs text-gray-400 mt-1">
                    Подал: {new Date(request.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      approveRequest({
                        teamId: request.teamId,
                        requestId: request.id,
                      })
                    }
                  >
                    Одобрить
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      rejectRequest({
                        teamId: request.teamId,
                        requestId: request.id,
                      })
                    }
                  >
                    Отклонить
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
