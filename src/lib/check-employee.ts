import { type IEmployee } from '@/types/employee';

// التحقق من وجود الموظف في جانب العميل
export function isEmployee(obj: any): obj is IEmployee {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    Array.isArray(obj.permissions)
  );
}

// التحقق من صلاحية الوصول إلى قسم معين
export function hasPermission(employee: { permissions: string[] } | null, permission: string): boolean {
  if (!employee || !employee.permissions) return false;
  
  // إذا كان مدير
  if (employee.permissions.includes('ALL')) {
    return true;
  }

  // التحقق من الصلاحية المحددة
  return employee.permissions.includes(permission);
}

// الحصول على قائمة الأقسام المسموح بها للموظف
export function getAllowedSections(permissions: string[] = []) {
  if (!permissions || permissions.length === 0) return [];

  // إذا كان المستخدم مدير
  if (permissions.includes('ALL')) {
    return [
      'statistics',
      'products',
      'brands',
      'categories',
      'orders',
      'customers',
      'reviews',
      'hero',
      'settings',
      'employees',
      'shipping'
    ];
  }

  // تحويل الصلاحيات إلى أقسام
  const sections = new Set(
    permissions
      .filter(perm => perm.includes('.view')) // نأخذ فقط صلاحيات العرض
      .map(perm => perm.split('.')[0]) // نأخذ اسم القسم فقط
  );

  return Array.from(sections);
}
