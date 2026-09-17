import { useMemo } from 'react';
import { useUnit } from 'effector-react';
import { $myTeams } from '@features/team';
import { Link } from 'react-router-dom';

export const MyGamesPage = () => {
  const myTeams = useUnit($myTeams);

  const myGames = useMemo(() => {
    const allGames = myTeams.flatMap((team) =>
      team.games.map((game) => ({
        ...game,
        teamId: team.id,
        teamName: team.name,
      })),
    );

    // Сортируем по дате
    return allGames.toSorted((a, b) => {
      const dateA = new Date(a.startedAt ?? 0);
      const dateB = new Date(b.startedAt ?? 0);

      return dateB.getTime() - dateA.getTime();
    });
  }, [myTeams]);

  return (
    <ul>
      {myGames.map((game) => (
        <li key={game.id}>
          <Link to={`/game/${game.id}`}>{game.id}</Link>
        </li>
      ))}
    </ul>
  );
};
