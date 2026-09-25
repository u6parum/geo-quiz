import { useUnit } from 'effector-react';

import { Toast } from '@ui';

import { $toasts, toastDismissed, toastsPaused, toastsResumed } from '../model';

export const ToastHost: React.FC = () => {
  const { toasts, dismiss, pause, resume } = useUnit({
    toasts: $toasts,
    dismiss: toastDismissed,
    pause: toastsPaused,
    resume: toastsResumed,
  });

  return (
    <div
      aria-live="polite"
      onMouseEnter={pause}
      onMouseLeave={resume}
      className="fixed top-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} variant={toast.type} onClose={() => dismiss(toast.id)}>
          {toast.text}
        </Toast>
      ))}
    </div>
  );
};
