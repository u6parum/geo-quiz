import { type FC } from 'react';
import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';
import { $user, logout } from '@features/auth';
import { Button, Card } from '@ui';
import { $myTeams } from '@features/team';

export const DashboardPage: FC = () => {
  const { user, myTeams } = useUnit({ user: $user, myTeams: $myTeams });
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen  p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Личный кабинет</h1>
          <Button variant="secondary" onClick={handleLogout}>
            Выйти
          </Button>
        </div>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Профиль</h2>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">ФИО:</span> <span className="font-medium">{user?.fullName}</span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span> <span className="font-medium">{user?.email}</span>
            </div>
            <div>
              <span className="text-gray-500">Телефон:</span> <span className="font-medium">{user?.phone}</span>
            </div>
            <div>
              <span className="text-gray-500">Роль:</span>{' '}
              <span className="font-medium">{user?.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}</span>
            </div>
          </div>
        </Card>

        {myTeams.length > 0 && (
          <Card className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Мои команды</h2>
            <div className="space-y-3">
              {myTeams.map((team) => (
                <div key={team.id} className="flex justify-between items-center border rounded-lg p-3">
                  <div>
                    <div className="font-medium">{team.name}</div>
                    {team.isCaptain && <span className="text-xs text-green-600">Капитан</span>}
                  </div>

                  {(team.isCaptain || user?.role === 'ADMIN') && (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/teams/${team.id}/manage`)}>
                      Управление
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-6 grid grid-cols-4 gap-4">
          <Button size="sm" onClick={() => navigate('/my-requests')}>
            Мои запросы
          </Button>
          {myTeams.some((t) => t.isCaptain) && (
            <Button size="sm" onClick={() => navigate('/teams/requests')}>
              Запросы в команды
            </Button>
          )}
          <Button size="sm" onClick={() => navigate('/teams')}>
            Все команды
          </Button>
          <Button size="sm" onClick={() => navigate('/games')}>
            Мои игры
          </Button>
          {user?.role === 'USER' && (
            <Button size="sm" onClick={() => navigate('/application')}>
              Моя заявка
            </Button>
          )}
        </div>

        {user?.role === 'ADMIN' && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Button onClick={() => navigate('/admin/applications')}>Заявки команд</Button>
            <Button onClick={() => navigate('/admin/games')}>Игры</Button>
          </div>
        )}
      </div>
    </div>
  );
};
