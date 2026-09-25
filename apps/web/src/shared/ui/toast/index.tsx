import cn from 'classnames';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

interface ToastProps {
  variant: ToastVariant;
  children: React.ReactNode;
  onClose?: () => void;
}

const variants: Record<ToastVariant, string> = {
  success: 'bg-green-50 border-green-300 text-green-900',
  info: 'bg-blue-50 border-blue-300 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-900',
  error: 'bg-red-50 border-red-300 text-red-900',
};

export const Toast: React.FC<ToastProps> = ({ variant, children, onClose }) => (
  <div
    role={variant === 'error' ? 'alert' : 'status'}
    onClick={onClose}
    className={cn(
      'toast-enter flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm shadow-lg',
      variants[variant],
    )}
  >
    <span>{children}</span>
    <button type="button" aria-label="Закрыть уведомление" className="leading-none opacity-50 hover:opacity-100">
      ×
    </button>
  </div>
);
