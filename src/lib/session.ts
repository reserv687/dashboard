import { getServerSession as nextAuthGetServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';

export async function validateAdminSession(requiredPermission?: string) {
  try {
    const session = await nextAuthGetServerSession(authOptions);
    
    if (!session?.user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'غير مصرح لك بالوصول' },
          { status: 401 }
        )
      };
    }

    const userPermissions = session.user.permissions || [];
    
    // Always allow users with ALL permission
    if (userPermissions.includes('ALL')) {
      return {
        success: true,
        session
      };
    }

    // If specific permission is required, check for it
    if (requiredPermission && !userPermissions.includes(requiredPermission)) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'ليس لديك الصلاحية للقيام بهذا الإجراء' },
          { status: 403 }
        )
      };
    }

    return {
      success: true,
      session
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'حدث خطأ في التحقق من الصلاحيات' },
        { status: 500 }
      )
    };
  }
}
