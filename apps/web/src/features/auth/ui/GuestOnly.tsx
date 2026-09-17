import { Navigate, Outlet } from 'react-router-dom';
import { useUnit } from 'effector-react';
import { $user, $isAuthLoading } from '@features/auth';

export const GuestOnly: React.FC = () => {
  const { user, isAuthLoading } = useUnit({ user: $user, isAuthLoading: $isAuthLoading });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
