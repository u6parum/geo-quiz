import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import {
  $allTeams,
  $allTeamsLoading,
  $myTeams,
  $myRequests,
  loadAllTeams,
  loadMyTeams,
  loadMyRequests,
  requestJoin,
  cancelJoin,
} from '@features/team';
import { $user } from '@features/auth';
import { Badge, Button, Card } from '@ui';
import { Link } from 'react-router-dom';

export const AllTeamsPage = () => {
  const user = useUnit($user);
  const teams = useUnit($allTeams);
  const isLoading = useUnit($allTeamsLoading);
  const myTeams = useUnit($myTeams);
  const myRequests = useUnit($myRequests);

  useEffect(() => {
    loadAllTeams();
    loadMyTeams();
    loadMyRequests();
  }, []);

  const myTeamIds = new Set(myTeams.map((t) => t.id));

  const getRequestForTeam = (teamId: string) => myRequests.find((r) => r.teamId === teamId && r.status === 'PENDING');

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Все команды</h1>

        {isLoading && teams.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">Загрузка...</p>
          </Card>
        )}

        {!isLoading && teams.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">Пока нет ни одной команды</p>
          </Card>
        )}

        <div className="space-y-4">
          {teams.map((team) => {
            const isMember = myTeamIds.has(team.id);
            const pendingRequest = getRequestForTeam(team.id);

            return (
              <Card key={team.id}>
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{team.name}</h3>
                      {isMember && <Badge variant="success">Вы в команде</Badge>}
                    </div>

                    <div className="text-sm text-gray-500">Участников: {team.membersCount}</div>

                    {team.landmarkName && (
                      <div className="text-sm text-gray-500 mt-1">Загадка: {team.landmarkName}</div>
                    )}
                  </div>

                  <div>
                    {(user?.id === team.captainId || user?.role === 'ADMIN') && (
                      <Link className="text-sm text-blue-600" to={`/teams/${team.id}/manage`}>
                        Управление
                      </Link>
                    )}
                  </div>

                  <div>
                    {isMember ? (
                      <span className="text-sm text-gray-400">Уже участник</span>
                    ) : pendingRequest ? (
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="warning">Запрос отправлен</Badge>
                        <Button size="sm" variant="secondary" onClick={() => cancelJoin(team.id)}>
                          Отменить
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => requestJoin(team.id)}>
                        Вступить
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
