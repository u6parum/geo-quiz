import { not } from 'patronum';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { teamApplicationApi, type TeamApplication } from './api';

export const $myApplication = createStore<TeamApplication | null>(null);
export const $applications = createStore<TeamApplication[]>([]);

export const submitApplication = createEvent<{
  teamName: string;
  landmarkName: string;
  description: string;
  hints: { group: number; text: string }[];
}>();
export const loadMyApplication = createEvent();
export const loadApplications = createEvent();
export const approveApplication = createEvent<string>();
export const rejectApplication = createEvent<string>();

export const submitFx = createEffect(teamApplicationApi.submit);
export const getMyFx = createEffect(teamApplicationApi.getMy);
export const getAllFx = createEffect(teamApplicationApi.getAll);
export const approveFx = createEffect(teamApplicationApi.approve);
export const rejectFx = createEffect(teamApplicationApi.reject);

$myApplication.on(submitFx.doneData, (_, app) => app).on(getMyFx.doneData, (_, app) => app);
$applications.on(getAllFx.doneData, (_, apps) => apps);

sample({ clock: submitApplication, target: submitFx });
sample({ clock: approveApplication, target: approveFx });
sample({ clock: rejectApplication, target: rejectFx });

sample({
  clock: loadApplications,
  filter: not(getAllFx.pending),
  target: getAllFx,
});

sample({
  clock: loadMyApplication,
  filter: not(getMyFx.pending),
  target: getMyFx,
});

sample({
  clock: [approveFx.done, rejectFx.done],
  target: loadApplications,
});
