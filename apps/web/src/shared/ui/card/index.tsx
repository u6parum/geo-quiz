import cn from 'classnames';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('rounded-2xl border border-gray-200 p-6', className)}>{children}</div>
);
