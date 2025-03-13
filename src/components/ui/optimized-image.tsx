'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { customImageLoader } from '@/lib/image-loader';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width = 300,
  height = 300,
  className,
  priority = false
}: OptimizedImageProps) {
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={cn("overflow-hidden relative", className)}>
      {!error ? (
        <Image
          loader={customImageLoader}
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className={cn(
            'duration-700 ease-in-out',
            isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'
          )}
          onLoadingComplete={() => setLoading(false)}
          onError={() => setError(true)}
          unoptimized={process.env.NODE_ENV === 'development'}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          خطأ في تحميل الصورة
        </div>
      )}
    </div>
  );
}
