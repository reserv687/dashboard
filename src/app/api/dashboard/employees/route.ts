import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Employee from '@/models/employee.model';
import bcryptjs from 'bcryptjs';
import { unstable_getServerSession as getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/check-employee';
import mongoose from 'mongoose';
import AuditLog from '@/models/audit-log.model';
import { uploadToCloudinary } from '@/lib/cloudinary';

// دالة الرد على الأخطاء
const respondError = (msg: string, status = 403) =>
  NextResponse.json({ error: msg }, { status });

// التأكد من الاتصال بقاعدة البيانات
async function ensureDB() {
  if (!mongoose.connections[0].readyState) {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('يجب تعريف متغير البيئة MONGODB_URI');
    await mongoose.connect(MONGODB_URI);
  }
}

// الحصول على الجلسة أو رمي خطأ
async function ensureSession() {
  const session = (await getServerSession(authOptions)) as { user?: { id: string, permissions?: string[] } } | null;
  if (!session?.user) throw new Error('غير مصرح لك بالوصول');
  return session;
}

// التحقق من الصلاحيات (مع السماح للمستخدم بتعديل بياناته الشخصية)
async function checkUserPermission(action: 'view' | 'create' | 'edit' | 'delete', userId?: string) {
  const session = await ensureSession();
  if (action === 'edit' && userId && session.user!.id === userId) return true;
  return hasPermission({ permissions: session.user!.permissions || [] }, `employees.${action}`);
}

// تحميل الصورة إلى Cloudinary
async function uploadImage(file: File): Promise<string | null> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return await uploadToCloudinary(buffer, 'employees');
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

// استخراج عنوان الـ IP من الهيدر
function extractIp(req: Request | NextRequest) {
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || (req as any).ip || '127.0.0.1';
}

// دالة إنشاء سجل التدقيق (Audit Log)
async function createAuditLog(
  sessionId: string,
  actionType: string,
  targetId: any,
  targetModel: string,
  changes: any,
  req: Request | NextRequest,
  extraMetadata = {}
) {
  await AuditLog.create({
    employeeId: sessionId,
    actionType,
    targetId,
    targetModel,
    changes,
    metadata: extraMetadata,
    ipAddress: extractIp(req),
    userAgent: req.headers.get('user-agent'),
    status: 'success'
  });
}

/* ==================== GET ==================== */
export async function GET(req: NextRequest) {
  try {
    const session = await ensureSession();
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const isSelf = id && id === session.user!.id;

    if (!isSelf && !(await checkUserPermission('view')))
      return respondError('ليس لديك صلاحية عرض الموظفين', 403);

    const firstAdmin = await Employee.findOne({ isFirstAdmin: true }).select('_id name jobTitle').lean() as { _id: any, name: string, jobTitle: string } | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query: any = id ? { _id: id } : {};
    if (!id) {
      const exclude = firstAdmin && firstAdmin._id.toString() !== session.user!.id
        ? [session.user!.id, firstAdmin._id]
        : [session.user!.id];
      query._id = { $nin: exclude };
    }

    const currentUser = await Employee.findById(session.user!.id).select('permissions');
    if (!currentUser?.permissions?.includes('ALL') && !id)
      query.permissions = { $nin: ['ALL'] };

    if (search) {
      const excludeIds = query._id?.$nin || [];
      query = {
        $and: [
          { _id: { $nin: excludeIds } },
          { $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .select('-password')
      .sort({ [sortField]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formatted = employees.map(emp => ({
      id: String(emp._id),
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      jobTitle: emp.jobTitle || '',
      gender: emp.gender || '',
      permissions: emp.permissions || [],
      isActive: emp.isActive ?? true,
      avatar: emp.avatar || '',
      isFirstAdmin: emp.isFirstAdmin || false,
      createdAt: emp.createdAt ?? new Date(),
      updatedAt: emp.updatedAt ?? new Date()
    }));

    return NextResponse.json({
      firstAdmin: firstAdmin
        ? { id: firstAdmin._id.toString(), name: firstAdmin.name, jobTitle: firstAdmin.jobTitle, isFirstAdmin: true }
        : null,
      employees: formatted,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error: any) {
    console.error('خطأ في جلب قائمة الموظفين:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب قائمة الموظفين' }, { status: 500 });
  }
}

/* ==================== POST ==================== */
export async function POST(req: Request) {
  try {
    if (!(await checkUserPermission('create')))
      return NextResponse.json({ error: 'ليس لديك صلاحية إضافة موظفين' }, { status: 403 });

    const formData = await req.formData();
    const avatarFile = formData.get('avatar') as File;
    const avatar = avatarFile ? await uploadImage(avatarFile) : undefined;

    const employeeData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      phone: formData.get('phone'),
      jobTitle: formData.get('jobTitle'),
      gender: formData.get('gender'),
      permissions: formData.getAll('permissions[]'),
      isActive: formData.get('isActive') === 'true',
      avatar
    };

    console.log('Creating employee:', { ...employeeData, password: '[HIDDEN]' });
    await connectToDatabase();
    const employee = await Employee.create(employeeData);
    const session = await ensureSession();

    await createAuditLog(
      session.user!.id,
      'employee.create',
      employee._id,
      'Employee',
      {
        email: { oldValue: null, newValue: employeeData.email, field: 'email' },
        phone: { oldValue: null, newValue: employeeData.phone, field: 'phone' },
        name: { oldValue: null, newValue: employeeData.name, field: 'name' },
        jobTitle: { oldValue: null, newValue: employeeData.jobTitle, field: 'jobTitle' },
        gender: { oldValue: null, newValue: employeeData.gender, field: 'gender' },
        isActive: { oldValue: null, newValue: employeeData.isActive, field: 'isActive' },
        permissions: { oldValue: null, newValue: employeeData.permissions, field: 'permissions' }
      },
      req
    );

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء إنشاء الموظف' }, { status: 400 });
  }
}

interface EmployeeDoc {
  _id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle?: string;
  gender?: string;
  permissions?: string[];
  isActive?: boolean;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

/* ==================== PUT ==================== */
export async function PUT(req: NextRequest) {
  try {
    const session = await ensureSession();
    await ensureDB();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return respondError('معرف الموظف مطلوب', 400);

    const existing = await Employee.findById(id).lean().exec() as unknown as EmployeeDoc;
    if (!existing) return respondError('الموظف غير موجود', 404);

    const target = await Employee.findById(id);
    const firstAdmin = await Employee.findOne().sort({ createdAt: 1 }).select('_id');
    if (target?.permissions?.includes('ALL') && session.user!.id !== firstAdmin?._id.toString())
      return respondError('فقط المدير العام يمكنه تعديل بيانات المدراء', 403);
    if (target?.isFirstAdmin && session.user!.id !== target._id.toString())
      return respondError('فقط المدير العام يمكنه تعديل بياناته', 403);
    if (session.user!.id !== id && !(await checkUserPermission('edit', id)))
      return NextResponse.json({ error: 'ليس لديك صلاحية التعديل' }, { status: 403 });

    const formData = await req.formData();
    const updateData: any = {};
    for (const [key, value] of Array.from(formData.entries())) {
      if (key === 'avatar' && value instanceof File) {
        const avatarUrl = await uploadImage(value);
        if (avatarUrl) updateData.avatar = avatarUrl;
      } else if (key === 'password' && value) {
        updateData.password = await bcryptjs.hash(value.toString(), 10);
      } else if (key === 'permissions[]') {
        updateData.permissions = updateData.permissions || [];
        updateData.permissions.push(value);
      } else if (key === 'isActive') {
        updateData.isActive = value === 'true';
      } else {
        updateData[key] = value;
      }
    }

    const updated = await Employee.findByIdAndUpdate(
      id, 
      { $set: updateData }, 
      { new: true }
    ).lean().exec() as unknown as EmployeeDoc;
    if (!updated) return respondError('فشل تحديث بيانات الموظف', 400);

    const changes: any = {};
    Object.keys(updateData).forEach(k => {
      if (k === 'password') return;
      if (JSON.stringify((existing as any)[k]) !== JSON.stringify((updated as any)[k]))
        changes[k] = { oldValue: (existing as any)[k], newValue: (updated as any)[k] };
    });

    await createAuditLog(
      session.user!.id,
      'employee.update',
      id,
      'Employee',
      {
        ...changes,
        employeeEmail: { oldValue: existing.email, newValue: updated.email },
        employeePhone: { oldValue: existing.phone, newValue: updated.phone },
        updatedFields: { oldValue: [], newValue: Object.keys(changes) }
      },
      req
    );

    return NextResponse.json({ message: 'تم تحديث بيانات الموظف بنجاح', employee: updated });
  } catch (error: any) {
    console.error('PUT Error:', error);
    const session = await getServerSession(authOptions) as { user?: { id: string } } | null;
    if (session?.user) {
      await AuditLog.create({
        employeeId: session.user.id,
        actionType: 'employee.update',
        targetModel: 'Employee',
        status: 'failure',
        errorMessage: error.message || 'حدث خطأ أثناء تحديث بيانات الموظف',
        ipAddress: extractIp(req),
        userAgent: req.headers.get('user-agent')
      });
    }
    return respondError(error.message || 'حدث خطأ أثناء تحديث بيانات الموظف', 500);
  }
}

/* ==================== DELETE ==================== */
export async function DELETE(req: NextRequest) {
  try {
    const session = await ensureSession();
    await ensureDB();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return respondError('معرف الموظف مطلوب', 400);

    const target = await Employee.findById(id);
    if (!target) return respondError('الموظف غير موجود', 404);

    const firstAdmin = await Employee.findOne().sort({ createdAt: 1 }).select('_id');
    if (
      firstAdmin?._id.toString() === id ||
      target.isFirstAdmin ||
      target.permissions?.includes('ALL') ||
      session.user?.id === id
    )
      return respondError('لا يمكن حذف هذا الموظف', 403);

    if (!(await checkUserPermission('delete', id)))
      return respondError('ليس لديك صلاحية حذف الموظفين', 403);

    await Employee.findByIdAndDelete(id);
    return NextResponse.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (error: any) {
    console.error('DELETE Error:', error);
    return respondError(error.message || 'حدث خطأ في حذف الموظف', 500);
  }
}