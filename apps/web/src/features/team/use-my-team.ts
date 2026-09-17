import { useEffect, useMemo } from 'react';
import { useUnit } from 'effector-react';
import { $myTeams, $myTeamsLoading, loadMyTeams } from './model';

export const useMyTeam = (gameId: string) => {
  const {
    myTeams,
    isLoading,
    loadMyTeams: loadMyTeamsEvent,
  } = useUnit({
    loadMyTeams,
    myTeams: $myTeams,
    isLoading: $myTeamsLoading,
  });

  useEffect(() => {
    if (myTeams.length === 0) {
      loadMyTeamsEvent();
    }
  }, []);

  const teamForGame = useMemo(() => {
    console.log('memo');

    return myTeams.find((team) => team.games.some((g) => g.id === gameId));
  }, [myTeams]);

  return { id: teamForGame?.id ?? '', name: teamForGame?.name ?? '', isLoading };
};
