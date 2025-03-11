'use client';

import { useLoadingIndicator } from '@/hooks/use-loading-indicator';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from './loading-spinner';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const { isLoading, stopLoading } = useLoadingIndicator();
  const pathname = usePathname();

  // إيقاف التحميل عند اكتمال تحميل الصفحة
  useEffect(() => {
    stopLoading();
  }, [pathname, stopLoading]);

  return (
    <div className="relative min-h-[50vh]">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <LoadingSpinner size="lg" />
          </motion.div>
        ) : (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
