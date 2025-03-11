'use client';

import { useLoadingIndicator } from '@/hooks/use-loading-indicator';
import { motion, AnimatePresence } from 'framer-motion';

export function LoadingBar() {
  const { isLoading } = useLoadingIndicator();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"
        >
          <motion.div
            className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-white/20 to-transparent"
            animate={{ x: ['100%', '-100%'] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
