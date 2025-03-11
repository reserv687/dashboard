import { useSession } from 'next-auth/react';
import { Session, User } from 'next-auth';

interface CustomSession extends Session {
  user: User & { id: string; permissions?: string[] | undefined; };
}

export function usePermissions() {
  const { data: session } = useSession() as { data: CustomSession | null | undefined };
  const permissions = session?.user?.permissions || [];

  const hasPermission = (permission: string) => {
    if (!permissions.length) return false;
    
    // التحقق من صلاحية ALL
    if (permissions.includes('ALL')) return true;
    
    // التحقق من الصلاحية المحددة
    if (permissions.includes(permission)) return true;
    
    // إذا كان المطلوب هو إجراء محدد (create, edit, delete)
    // تحقق من أن المستخدم لديه على الأقل صلاحية العرض للقسم
    const section = permission.split('.')[0];
    if (permission.includes('.view')) {
      return permissions.includes(`${section}.view`);
    }
    
    return false;
  };

  const hasAnyPermission = (requiredPermissions: string[]) => {
    return requiredPermissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (requiredPermissions: string[]) => {
    return requiredPermissions.every(permission => hasPermission(permission));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: permissions.includes('ALL')
  };
}
