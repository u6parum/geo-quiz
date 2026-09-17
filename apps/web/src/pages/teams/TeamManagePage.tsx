import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';
import { useAuth } from '@features/auth';
import { $myTeams, $teamById, $myTeamsLoading, loadMyTeams, loadTeamById, ChangeCaptainPanel } from '@features/team';
import { Button, Card } from '@ui';

export const TeamManagePage = () => {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const { isLoading, myTeams, teamById } = useUnit({
    isLoading: $myTeamsLoading,
    myTeams: $myTeams,
    teamById: $teamById,
  });
  const user = useAuth();
  const navigate = useNavigate();

  const isAdmin = user.role === 'ADMIN';

  // Ищем команду: сначала в моих, потом в загруженных по id
  const team = myTeams.find((t) => t.id === teamId) ?? teamById[teamId];

  useEffect(() => {
    if (!teamId) {
      return;
    }

    // Админ грузит команду по id, если её нет в myTeams
    if (isAdmin && !myTeams.some((t) => t.id === teamId)) {
      loadTeamById(teamId);
    }

    // Капитан грузит свои команды
    if (!isAdmin && myTeams.length === 0) {
      loadMyTeams();
    }
  }, [teamId, isAdmin]);

  // Редирект, если капитан потерял права (не админ)
  useEffect(() => {
    if (!isAdmin && team && !team.isCaptain) {
      navigate('/dashboard', { replace: true });
    }
  }, [team?.isCaptain, isAdmin, navigate]);

  if (isLoading || (isAdmin && !team)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="text-center">
          <p className="text-gray-500 mb-4">Команда не найдена</p>
          <Button onClick={() => navigate('/dashboard')}>На главную</Button>
        </Card>
      </div>
    );
  }

  // Не капитан и не админ — редирект
  if (!isAdmin && !team.isCaptain) {
    return null;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Управление командой «{team.name}»</h1>

        <ChangeCaptainPanel teamId={team.id} currentCaptainId={team.captainId} />
      </div>
    </div>
  );
};
