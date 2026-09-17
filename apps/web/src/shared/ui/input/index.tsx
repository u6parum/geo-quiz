import { forwardRef } from 'react';
import cn from 'classnames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'rounded-lg border px-3 py-2 outline-none transition-colors',
        'focus:ring-2 focus:ring-blue-500',
        error ? 'border-red-500' : 'border-gray-300',
        className,
      )}
      {...props}
    />
    {error && <span className="text-sm text-red-500">{error}</span>}
  </div>
));

Input.displayName = 'Input';
