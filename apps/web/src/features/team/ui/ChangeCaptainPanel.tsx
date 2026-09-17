import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { $teamMembers, loadTeamMembers, changeCaptain } from '@features/team';
import { Badge, Button, Card } from '@ui';

interface Props {
  teamId: string;
  currentCaptainId: string;
}

export const ChangeCaptainPanel = ({ teamId, currentCaptainId }: Props) => {
  const membersMap = useUnit($teamMembers);
  const members = membersMap[teamId] ?? [];

  useEffect(() => {
    loadTeamMembers(teamId);
  }, [teamId]);

  const handleChange = (newCaptainId: string) => {
    if (newCaptainId === currentCaptainId) {
      return;
    }
    
    changeCaptain({ teamId, newCaptainId });
  };

  return (
    <Card>
      <h3 className="font-semibold mb-4">Участники команды</h3>

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">Загрузка...</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium">{member.fullName}</div>
                <div className="text-sm text-gray-500">{member.email}</div>
              </div>

              <div className="flex items-center gap-2">
                {member.isCaptain ? (
                  <Badge variant="success">Капитан</Badge>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handleChange(member.userId)}>
                    Сделать капитаном
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
