import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { interval, not } from 'patronum';
import { teamApi } from './api';
import type { MyGame, MyTeam, TeamJoinRequest, TeamMemberInfo, TeamPublic, TeamWithLandmark } from './types';
import { createGate } from 'effector-react';
import { stringSorter } from '@utils/sorters';

// ============ Команды с достопримечательностями ============
export const $teams = createStore<TeamWithLandmark[]>([]);
export const $teamsLoading = createStore(false);

export const loadTeams = createEvent();

export const loadFx = createEffect(teamApi.list);

$teams.on(loadFx.doneData, (_, teams) => teams);
$teamsLoading.on(loadFx.pending, (_, pending) => pending);

sample({
  clock: loadTeams,
  filter: not(loadFx.pending),
  target: loadFx,
});

// ============ Мои команды ============
export const $myTeams = createStore<MyTeam[]>([]);
export const $myTeamsLoading = createStore(false);
export const $myTeamsError = createStore<string | null>(null);

export const loadMyTeams = createEvent();
export const resetMyTeams = createEvent();

export const loadMyTeamsFx = createEffect(teamApi.listMy);

$myTeams.on(loadMyTeamsFx.doneData, (_, teams) => teams).reset(resetMyTeams);

$myTeamsLoading.on(loadMyTeamsFx.pending, (_, pending) => pending);
$myTeamsError.on(loadMyTeamsFx.failData, (_, error) => error.message).reset(loadMyTeamsFx);

sample({
  clock: loadMyTeams,
  filter: not(loadMyTeamsFx.pending),
  target: loadMyTeamsFx,
});

// ============ Мои запросы на вступление ============
export const $myRequests = createStore<TeamJoinRequest[]>([]);
export const $myRequestsLoading = createStore(false);

export const loadMyRequests = createEvent();
export const requestJoin = createEvent<string>(); // teamId
export const cancelJoin = createEvent<string>(); // teamId

export const loadMyRequestsFx = createEffect(teamApi.listMyJoinRequests);
export const requestJoinFx = createEffect(teamApi.requestJoin);
export const cancelJoinFx = createEffect(teamApi.cancelJoin);

$myRequests.on(loadMyRequestsFx.doneData, (_, requests) => requests);
$myRequestsLoading.on(loadMyRequestsFx.pending, (_, pending) => pending);

sample({
  clock: loadMyRequests,
  filter: not(loadMyRequestsFx.pending),
  target: loadMyRequestsFx,
});

sample({
  clock: requestJoin,
  target: requestJoinFx,
});

sample({
  clock: cancelJoin,
  target: cancelJoinFx,
});

// После подачи/отмены — перезагружаем список
sample({
  clock: [requestJoinFx.done, cancelJoinFx.done],
  target: loadMyRequests,
});

// ============ Запросы команды (для капитана) ============
export const $teamRequestsMap = createStore<Record<string, TeamJoinRequest[]>>({});
export const $teamRequestsLoading = createStore(false);

export const loadTeamRequests = createEvent<string>();
export const approveRequest = createEvent<{ teamId: string; requestId: string }>();
export const rejectRequest = createEvent<{ teamId: string; requestId: string }>();

export const loadTeamRequestsFx = createEffect(teamApi.listTeamRequests);

export const approveRequestFx = createEffect(({ teamId, requestId }: { teamId: string; requestId: string }) =>
  teamApi.approveRequest(teamId, requestId),
);

export const rejectRequestFx = createEffect(({ teamId, requestId }: { teamId: string; requestId: string }) =>
  teamApi.rejectRequest(teamId, requestId),
);

sample({
  clock: loadTeamRequestsFx.done,
  source: $teamRequestsMap,
  fn: (map, { params: teamId, result }) => ({
    ...map,
    [teamId]: result,
  }),
  target: $teamRequestsMap,
});

sample({
  clock: loadTeamRequests,
  filter: not(loadTeamRequestsFx.pending),
  target: loadTeamRequestsFx,
});

sample({ clock: approveRequest, target: approveRequestFx });
sample({ clock: rejectRequest, target: rejectRequestFx });

// После одобрения/отклонения — перезагружаем запросы команды и мои команды
sample({
  clock: [approveRequestFx.done, rejectRequestFx.done],
  fn: ({ params }) => params.teamId,
  target: loadTeamRequests,
});

sample({
  clock: approveRequestFx.done,
  target: [loadMyTeams, loadMyRequests],
});

// Список всех команд (для всех авторизованных)

export const $allTeams = createStore<TeamPublic[]>([]);
export const $allTeamsLoading = createStore(false);

export const loadAllTeams = createEvent();

export const loadAllTeamsFx = createEffect(teamApi.listAll);

$allTeams.on(loadAllTeamsFx.doneData, (_, teams) => teams);
$allTeamsLoading.on(loadAllTeamsFx.pending, (_, pending) => pending);

sample({
  clock: loadAllTeams,
  filter: not(loadAllTeamsFx.pending),
  target: loadAllTeamsFx,
});

// ============ Участники команды ============
export const $teamMembers = createStore<Record<string, TeamMemberInfo[]>>({});
export const $teamMembersLoading = createStore(false);

export const loadTeamMembers = createEvent<string>();
export const changeCaptain = createEvent<{ teamId: string; newCaptainId: string }>();

export const loadTeamMembersFx = createEffect(teamApi.listMembers);

export const changeCaptainFx = createEffect(({ teamId, newCaptainId }: { teamId: string; newCaptainId: string }) =>
  teamApi.changeCaptain(teamId, newCaptainId),
);

sample({
  clock: loadTeamMembersFx.done,
  source: $teamMembers,
  fn: (map, { params: teamId, result }) => ({
    ...map,
    [teamId]: result,
  }),
  target: $teamMembers,
});

$teamMembersLoading.on(loadTeamMembersFx.pending, (_, pending) => pending);

sample({
  clock: loadTeamMembers,
  filter: not(loadTeamMembersFx.pending),
  target: loadTeamMembersFx,
});

sample({
  clock: changeCaptain,
  target: changeCaptainFx,
});

// После смены капитана — перезагружаем команды и участников
sample({
  clock: changeCaptainFx.done,
  fn: ({ params }) => params.teamId,
  target: [loadMyTeams, loadTeamMembers],
});

export const $teamById = createStore<Record<string, MyTeam>>({});

export const loadTeamById = createEvent<string>();

export const loadTeamByIdFx = createEffect(teamApi.getById);

sample({
  clock: loadTeamByIdFx.done,
  source: $teamById,
  fn: (map, { params: teamId, result }) => ({
    ...map,
    [teamId]: result,
  }),
  target: $teamById,
});

sample({
  clock: loadTeamById,
  filter: not(loadTeamByIdFx.pending),
  target: loadTeamByIdFx,
});

export const MyGamesGate = createGate('MyGamesGate');

// При открытии MyGames и срабатывании гейта, загружаем $myTeams, если они пустые
sample({
  clock: MyGamesGate.open,
  source: $myTeams,
  filter: (teams) => teams.length === 0,
  target: loadMyTeamsFx,
});

// Собираем все игры пользователя из его команд
export const $myGames = combine($myTeams, (teams) => {
  const games: MyGame[] = [];

  teams.forEach((team) => {
    team.games.forEach((game) => {
      games.push({
        id: game.id,
        status: game.status,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
        teamId: team.id,
        teamName: team.name,
      });
    });
  });

  // Сортируем по дате старта (свежие сверху)
  return games.sort(stringSorter('startedAt'));
});

const { tick: myGamesPollingTick } = interval({
  timeout: 5000,
  start: MyGamesGate.open,
  stop: MyGamesGate.close,
});

// На каждый тик — перезагружаем команды, если они есть
sample({
  clock: myGamesPollingTick,
  source: $myTeams,
  filter: (teams) => teams.length > 0,
  target: loadMyTeamsFx,
});

// При открытии Gate — загружаем команды, если стор пуст
sample({
  clock: MyGamesGate.open,
  source: $myTeams,
  filter: (teams) => teams.length === 0,
  target: loadMyTeamsFx,
});
