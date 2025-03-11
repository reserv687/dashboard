'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'default' | 'lg';
  fullScreen?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Loading({
  size = 'default',
  fullScreen = false,
  fullWidth = false,
  className,
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const containerClasses = cn(
    'flex items-center justify-center',
    fullWidth && 'w-full',
    fullScreen && 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
    className
  );

  return (
    <div className={containerClasses}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
    </div>
  );
}
