import clsx from 'clsx';

type SkeletonProps = {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
};

const roundedClasses = { sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', full: 'rounded-full' };

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  return (
    <div
      className={clsx('animate-pulse bg-brand-200', roundedClasses[rounded], className)}
      aria-hidden="true"
    />
  );
}