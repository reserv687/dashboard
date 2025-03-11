import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/use-permissions';

interface Permission {
  name: string;
  label: string;
}

interface ProtectedContentProps {
  children: ReactNode;
  requiredPermissions: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function ProtectedContent({
  children,
  requiredPermissions,
  requireAll = true,
  fallback = null,
}: ProtectedContentProps) {
  const { data: session } = useSession();
  const { hasAllPermissions, hasAnyPermission } = usePermissions();

  if (!session) {
    return fallback;
  }

  const hasAccess = requireAll
    ? hasAllPermissions(requiredPermissions.map(p => p.name) as any)
    : hasAnyPermission(requiredPermissions.map(p => p.name) as any);

  if (!hasAccess) {
    return fallback;
  }

  return <>{children}</>;
}
