import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { $applications, loadApplications, approveApplication, rejectApplication } from '@features/team-application';
import { Badge, Button, Card } from '@ui';

export const AdminApplicationsPage = () => {
  const applications = useUnit($applications);

  useEffect(() => {
    loadApplications();
  }, []);

  const pending = applications.filter((a) => a.status === 'PENDING');
  const processed = applications.filter((a) => a.status !== 'PENDING');

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Заявки команд</h1>
          <div className="text-sm text-gray-500">
            Всего: {applications.length} · На рассмотрении: {pending.length}
          </div>
        </div>

        {applications.length === 0 && (
          <Card>
            <p className="text-gray-500 text-center py-8">Пока нет ни одной заявки</p>
          </Card>
        )}

        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3 text-yellow-700">Ожидают рассмотрения</h2>
            <div className="space-y-4">
              {pending.map((app) => (
                <Card key={app.id}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{app.teamName}</h3>
                        <Badge variant="warning">Ожидает</Badge>
                      </div>

                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-gray-500">Достопримечательность:</span>{' '}
                          <span className="font-medium">{app.landmarkName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Описание:</span> <span>{app.description}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Подана:</span>{' '}
                          {new Date(app.createdAt).toLocaleString('ru-RU')}
                        </div>
                      </div>

                      <details className="mt-3">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                          Показать подсказки ({app.hints.length})
                        </summary>
                        <div className="mt-2 space-y-1 pl-4">
                          {[1, 2, 3].map((group) => {
                            const groupHints = app.hints.filter((h) => h.group === group);
                            if (groupHints.length === 0) return null;

                            return (
                              <div key={group} className="text-sm">
                                <div className="font-medium text-gray-600">Группа {group}:</div>
                                {groupHints.map((h, i) => (
                                  <div key={i} className="pl-3 text-gray-700">
                                    • {h.text}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[120px]">
                      <Button size="sm" onClick={() => approveApplication(app.id)}>
                        Одобрить
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => rejectApplication(app.id)}>
                        Отклонить
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {processed.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 text-gray-600">Обработанные</h2>
            <div className="space-y-3">
              {processed.map((app) => (
                <Card key={app.id} className="opacity-75">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{app.teamName}</h3>
                        {app.status === 'APPROVED' && <Badge variant="success">Одобрена</Badge>}
                        {app.status === 'REJECTED' && <Badge variant="error">Отклонена</Badge>}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">{app.landmarkName}</div>
                    </div>
                    <div className="text-xs text-gray-400">{new Date(app.createdAt).toLocaleDateString('ru-RU')}</div>
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
