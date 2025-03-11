import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import AuditLog from '@/models/audit-log.model';

export const dynamic = 'force-dynamic'; // فرض أن هذه API ديناميكية دائمًا

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول' }, { status: 401 });
    }

    const { queryParams, page, limit } = parseParams(req.nextUrl.searchParams);
    await connectToDatabase();

    const logs = await AuditLog.find(queryParams)
      .populate({ path: 'employeeId', select: 'name email jobTitle avatar phone permissions isActive gender' })
      .populate({ path: 'targetId', refPath: 'targetModel', select: 'name title email phone jobTitle isActive status' } as any)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedLogs = logs.map(formatLog);
    const total = await AuditLog.countDocuments(queryParams);

    return NextResponse.json({
      logs: formattedLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب السجلات' }, { status: 500 });
  }
}

function parseParams(params: URLSearchParams) {
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '10');
  const search = params.get('search') || '';
  const targetModel = params.get('targetModel');
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const status = params.get('status');
  const actionType = params.get('actionType');

  const query: any = {};
  if (targetModel && targetModel !== 'all') query.targetModel = targetModel;
  if (search) {
    query.$or = [
      { 'employeeId.name': { $regex: search, $options: 'i' } },
      { 'employeeId.email': { $regex: search, $options: 'i' } },
      { actionType: { $regex: search, $options: 'i' } }
    ];
  }
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  if (status) query.status = status;
  if (actionType) query.actionType = actionType;

  return { queryParams: query, page, limit };
}

function formatLog(log: any) {
  return {
    ...log,
    changes: log.changes
      ? Object.fromEntries(
          Object.entries(log.changes)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => [
              key,
              {
                field: getFieldDisplayName(key),
                oldValue: formatValueForDisplay(typeof value === 'object' ? (value as { oldValue?: any })?.oldValue : undefined, key, log.targetModel),
                newValue: formatValueForDisplay(typeof value === 'object' ? (value as { newValue?: any })?.newValue : undefined, key, log.targetModel)
              }
            ])
        )
      : {}
  };
}

function getFieldDisplayName(field: string): string {
  const fieldMap: Record<string, string> = {
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    jobTitle: 'المسمى الوظيفي',
    gender: 'الجنس',
    permissions: 'الصلاحيات',
    isActive: 'الحالة',
    password: 'كلمة المرور',
    avatar: 'الصورة الشخصية',
    title: 'العنوان',
    description: 'الوصف',
    price: 'السعر',
    status: 'الحالة',
    category: 'التصنيف',
    brand: 'العلامة التجارية',
    stock: 'المخزون',
    images: 'الصور'
  };
  return fieldMap[field] || field;
}

function formatValueForDisplay(value: any, field: string, targetModel: string): string {
  if (value === null || value === undefined) return 'غير محدد';
  if (value === '') return 'فارغ';

  try {
    switch (`${targetModel}.${field}`) {
      case 'Employee.gender':
        return value === 'MALE' ? 'ذكر' : 'أنثى';
      case 'Employee.isActive':
      case 'Product.isActive':
      case 'Category.isActive':
        return value ? 'نشط' : 'غير نشط';
      case 'Product.price':
        return typeof value === 'number' ? `${value} ر.س` : value;
      case 'Order.status':
        return getOrderStatus(value);
      case 'Employee.permissions':
        return Array.isArray(value) ? formatPermissions(value) : String(value);
      default:
        if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
        if (Array.isArray(value)) return value.length > 0 ? value.join('، ') : 'لا يوجد';
        if (typeof value === 'object' && value !== null)
          return value.name || value.title || JSON.stringify(value);
        return String(value);
    }
  } catch (error) {
    console.error('Error formatting value:', error);
    return 'قيمة غير صالحة';
  }
}

function formatPermissions(permissions: string[]): string {
  const permissionMap: Record<string, string> = {
    PRODUCTS_VIEW: 'عرض المنتجات',
    PRODUCTS_CREATE: 'إضافة منتجات',
    PRODUCTS_EDIT: 'تعديل المنتجات',
    PRODUCTS_DELETE: 'حذف المنتجات'
  };
  return permissions.map(p => permissionMap[p] || p).join('، ');
}

function getOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'قيد الانتظار',
    PROCESSING: 'قيد المعالجة',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغي',
    DELIVERED: 'تم التوصيل',
    SHIPPING: 'قيد الشحن'
  };
  return statusMap[status] || status;
}
