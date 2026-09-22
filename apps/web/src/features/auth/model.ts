import { createEffect, createEvent, createStore, sample } from 'effector';
import { not } from 'patronum';
import { authApi, type AuthUser } from './api';
import { $accessToken } from '@api/access-token';
import { scheduleRefresh, stopRefresh } from '@api/refresh-scheduler';
import { loadMyTeams, resetMyTeams } from '@features/team';

// ============ СОСТОЯНИЕ ============
export const $user = createStore<AuthUser | null>(null);
export const $isAuthLoading = createStore(true);
export const $authError = createStore<string | null>(null);

// ============ СОБЫТИЯ ============
export const register = createEvent<{
  email: string;
  fullName: string;
  phone: string;
  password: string;
}>();

export const login = createEvent<{
  email: string;
  password: string;
}>();

export const logout = createEvent();
export const initAuth = createEvent();

// ============ ЭФФЕКТЫ ============
export const registerFx = createEffect(authApi.register);
export const loginFx = createEffect(authApi.login);
export const meFx = createEffect(authApi.me);
export const logoutFx = createEffect(authApi.logout);
export const initAuthFx = createEffect(authApi.session);

// ============ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ ============
$user
  .on(registerFx.doneData, (_, data) => data.user)
  .on(loginFx.doneData, (_, data) => data.user)
  .on(meFx.doneData, (_, data) => data.user)
  .on(initAuthFx.doneData, (_, data) => data.user)
  .reset(logoutFx.done);

// ============ ACCESS-ТОКЕН ============
$accessToken
  .on(initAuthFx.doneData, (_, data) => data.accessToken)
  .on(registerFx.doneData, (_, data) => data.accessToken)
  .on(loginFx.doneData, (_, data) => data.accessToken)
  .reset(logoutFx.done);

// ============ ЗАГРУЗКА ============
$isAuthLoading.on(initAuthFx.finally, () => false);

// ============ ОШИБКИ ============
$authError
  .on(registerFx.failData, (_, error) => error.message)
  .on(loginFx.failData, (_, error) => error.message)
  .reset(registerFx, loginFx);

// ============ СВЯЗИ ============
sample({ clock: register, target: registerFx });
sample({ clock: login, target: loginFx });
sample({ clock: logout, target: logoutFx });
sample({ clock: initAuth, filter: not(initAuthFx.pending), target: initAuthFx });

// После успешной авторизации — грузим команды и запускаем refresh
sample({
  clock: [loginFx.done, registerFx.done, initAuthFx.done],
  filter: ({ result }) => !!result.user,
  target: [loadMyTeams, scheduleRefresh],
});

// При выходе — сбрасываем команды и останавливаем refresh
sample({
  clock: logoutFx.done,
  target: [resetMyTeams, stopRefresh],
});
