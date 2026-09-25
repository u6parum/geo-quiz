import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { initAuth } from '@features/auth';
import { ToastHost } from '@features/notifications';

import { router } from './app/router';
import { ErrorBoundary } from './app/providers/ErrorBoundary';

export const App = () => {
  useEffect(() => {
    initAuth();
  }, []);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <ToastHost />
    </ErrorBoundary>
  );
};
