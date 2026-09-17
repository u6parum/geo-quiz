import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { $myRequests, $myRequestsLoading, loadMyRequests, cancelJoin } from '@features/team';
import type { JoinRequestStatus } from '@features/team';
import { Badge, Button, Card } from '@ui';
import { Link } from 'react-router-dom';

const STATUS_LABELS: Record<JoinRequestStatus, string> = {
  PENDING: 'На рассмотрении',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
};

const STATUS_VARIANTS: Record<JoinRequestStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export const MyRequestsPage = () => {
  const requests = useUnit($myRequests);
  const isLoading = useUnit($myRequestsLoading);

  useEffect(() => {
    loadMyRequests();
  }, []);

  const pending = requests.filter((r) => r.status === 'PENDING');
  const processed = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Мои запросы</h1>

        {isLoading && requests.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">Загрузка...</p>
          </Card>
        )}

        {!isLoading && requests.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">У вас пока нет запросов на вступление</p>
              <Link to="/teams" className="text-blue-600 hover:underline text-sm">
                Посмотреть все команды →
              </Link>
            </div>
          </Card>
        )}

        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3 text-yellow-700">Активные</h2>
            <div className="space-y-4">
              {pending.map((request) => (
                <Card key={request.id}>
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{request.team?.name ?? 'Команда'}</h3>
                        <Badge variant={STATUS_VARIANTS[request.status]}>{STATUS_LABELS[request.status]}</Badge>
                      </div>
                      <div className="text-xs text-gray-400">
                        Подано: {new Date(request.createdAt).toLocaleString('ru-RU')}
                      </div>
                    </div>

                    <Button size="sm" variant="secondary" onClick={() => cancelJoin(request.teamId)}>
                      Отменить
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {processed.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 text-gray-600">История</h2>
            <div className="space-y-3">
              {processed.map((request) => (
                <Card key={request.id} className="opacity-75">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{request.team?.name ?? 'Команда'}</h3>
                        <Badge variant={STATUS_VARIANTS[request.status]}>{STATUS_LABELS[request.status]}</Badge>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
