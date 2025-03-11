'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/use-permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/auth');
      return;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.replace('/dashboard');
    }
  }, [session, status, requiredPermission, router, hasPermission]);

  if (status === 'loading') {
    return <div>جاري التحميل...</div>;
  }

  if (!session) {
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  return <>{children}</>;
}
