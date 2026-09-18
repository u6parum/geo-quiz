import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MyTeamApplicationPage, NewTeamApplicationPage } from '@pages/team-application';
import { RegisterPage, LoginPage } from '@pages/auth';
import { DashboardPage } from '@pages/dashboard';
import { AdminApplicationsPage, AdminGamesPage, AdminCreateGamePage, GameMonitorPage } from '@pages/admin';
import { RequireAuth, RequireAdmin, GuestOnly } from '@features/auth';
import { NotFoundPage, RouteErrorPage } from '@pages/errors';
import { GamePage } from '@pages/game';
import { MyGamesPage } from '@pages/my-games';
import { AllTeamsPage, MyRequestsPage, TeamRequestsPage, TeamManagePage } from '@pages/teams';

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/register', element: <RegisterPage /> },
          { path: '/login', element: <LoginPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/application', element: <MyTeamApplicationPage /> },
          { path: '/application/new', element: <NewTeamApplicationPage /> },
          { path: '/games', element: <MyGamesPage /> },
          { path: '/game/:gameId', element: <GamePage /> },
          { path: '/teams', element: <AllTeamsPage /> },
          { path: '/teams/requests', element: <TeamRequestsPage /> },
          { path: '/teams/:teamId/manage', element: <TeamManagePage /> },
          { path: '/my-requests', element: <MyRequestsPage /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          { path: '/admin/applications', element: <AdminApplicationsPage /> },
          { path: '/admin/games', element: <AdminGamesPage /> },
          { path: '/admin/games/new', element: <AdminCreateGamePage /> },
          { path: '/admin/games/:gameId/monitor', element: <GameMonitorPage /> },
        ],
      },
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
