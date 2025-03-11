import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken as getNextAuthToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // استثناء API routes من التحقق
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // التحقق من حالة المستخدم في صفحات تسجيل الدخول
  if (request.nextUrl.pathname.startsWith('/auth')) {
    const token = await getNextAuthToken({ req: request });
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  const token = await getNextAuthToken({ req: request });
  
  if (!token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // استخراج القسم من URL
  const path = request.nextUrl.pathname;
  const section = path.split('/')[2]; // مثال: /dashboard/products -> products

  if (section) {
    const permissions = token.permissions as string[];
    const viewPermission = `${section}.view`;
    
    // السماح إذا كان مدير أو لديه صلاحية العرض المناسبة
    if (!permissions.includes('ALL') && !permissions.includes(viewPermission)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/auth'
  ]
};
