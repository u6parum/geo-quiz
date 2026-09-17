import { useMemo } from 'react';
import { useUnit } from 'effector-react';
import { $user } from './model';
import type { AuthUser } from './api';

export const useAuth = (): AuthUser => {
  const user = useUnit($user);

  return useMemo(() => {
    if (user) {
      return user;
    }

    return {
      id: '',
      email: '',
      fullName: '',
      phone: '',
      role: 'USER',
    };
  }, [user]);
};
