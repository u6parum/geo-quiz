import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';
import { $myApplication, loadMyApplication } from '@features/team-application';
import { Button, Card } from '@ui';

export const MyTeamApplicationPage = () => {
  const application = useUnit($myApplication);
  const navigate = useNavigate();

  useEffect(() => {
    loadMyApplication();
  }, []);

  if (!application) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Моя заявка</h1>
        <Card>
          <p className="text-gray-600 mb-4">У вас пока нет заявки.</p>
          <Button onClick={() => navigate('/application/new')}>Подать заявку</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Моя заявка</h1>
      <Card>
        <div className="space-y-3">
          <div>
            <span className="text-gray-500">Команда:</span> {application.teamName}
          </div>
          <div>
            <span className="text-gray-500">Достопримечательность:</span> {application.landmarkName}
          </div>
          <div>
            <span className="text-gray-500">Статус:</span>{' '}
            <span
              className={
                application.status === 'APPROVED'
                  ? 'text-green-600'
                  : application.status === 'REJECTED'
                    ? 'text-red-600'
                    : 'text-yellow-600'
              }
            >
              {application.status === 'PENDING' && 'На рассмотрении'}
              {application.status === 'APPROVED' && 'Одобрена'}
              {application.status === 'REJECTED' && 'Отклонена'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
