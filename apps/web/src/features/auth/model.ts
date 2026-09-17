import { not } from 'patronum';
import { createEvent, createEffect, createStore, sample } from 'effector';
import { $myTeams, loadMyTeams } from '@features/team';

import { authApi, type AuthUser, type LoginPayload, type RegisterPayload } from './api';

export const $user = createStore<AuthUser | null>(null);
export const $isAuthLoading = createStore(true);
export const $authError = createStore<string | null>(null);

export const registerFx = createEffect(authApi.register);
export const logoutFx = createEffect(authApi.logout);
export const loginFx = createEffect(authApi.login);
export const meFx = createEffect(authApi.me);

export const register = createEvent<RegisterPayload>();
export const login = createEvent<LoginPayload>();
export const logout = createEvent();
export const initAuth = createEvent(); // Инициализация: проверяем сессию при старте

$user
  .on(registerFx.doneData, (_, user) => user)
  .on(loginFx.doneData, (_, user) => user)
  .on(meFx.doneData, (_, user) => user)
  .reset(logoutFx.done);

$isAuthLoading.on(meFx.finally, () => false);

$authError
  .on(registerFx.failData, (_, error) => error.message)
  .on(loginFx.failData, (_, error) => error.message)
  .reset(registerFx, loginFx);

sample({ clock: login, target: loginFx });
sample({ clock: logout, target: logoutFx });
sample({ clock: register, target: registerFx });

sample({
  clock: initAuth,
  filter: not(meFx.pending),
  target: meFx,
});

/* Загрузка команд юзера */
sample({
  clock: [loginFx.done, meFx.done, registerFx.done],
  target: loadMyTeams,
});

sample({
  clock: logoutFx.done,
  fn: () => [],
  target: $myTeams,
});
