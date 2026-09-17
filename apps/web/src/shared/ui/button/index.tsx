import cn from 'classnames';

import styles from './styles.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className, children, ...props }) => (
  <button
    className={cn(
      'rounded-lg font-medium transition-colors disabled:opacity-50',
      variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
      variant === 'secondary' && 'bg-gray-200 text-gray-800 hover:bg-gray-300',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
      size === 'sm' && 'px-3 py-1.5 text-sm',
      size === 'md' && 'px-4 py-2',
      size === 'lg' && 'px-6 py-3 text-lg',
      styles.button,
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
