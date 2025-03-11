import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Brand from '@/models/brand.model';
import AuditLog from '@/models/audit-log.model';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { hasPermission } from '@/lib/check-employee';

// دالة لاستخراج بيانات العميل (IP والمتصفح)
const getMeta = (req: NextRequest) => ({
  ipAddress: req.headers.get('x-forwarded-for') || req.ip,
  userAgent: req.headers.get('user-agent')
});

// دالة للتحقق من الجلسة والصلاحيات
async function requireAuth(
  req: NextRequest,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<{ session: { user: { permissions: string[]; id: string } }; error?: string; status?: number } | { error: string; status: number }> {
  const session = (await getServerSession(authOptions)) as { user?: { permissions: string[]; id: string } } | null;
  if (!session?.user) {
    return { error: 'غير مصرح لك بإجراء هذه العملية', status: 401 };
  }
  const permission = `brands.${action}`;
  if (!hasPermission({ permissions: session.user.permissions || [] }, permission)) {
    const msg =
      action === 'view'
        ? 'ليس لديك صلاحية عرض العلامات التجارية'
        : action === 'create'
        ? 'ليس لديك صلاحية إضافة علامات تجارية'
        : action === 'edit'
        ? 'ليس لديك صلاحية تعديل العلامات التجارية'
        : 'ليس لديك صلاحية حذف العلامات التجارية';
    return { error: msg, status: 403 };
  }
  return { session: { user: session.user } };
}

// دالة لتسجيل الأنشطة (Audit Log)
async function logAudit(
  req: NextRequest,
  session: { user: { id: string } },
  data: {
    actionType: string;
    targetId?: any;
    targetModel: string;
    changes?: any;
    metadata?: any;
    status: 'success' | 'failure';
    errorMessage?: string;
  }
) {
  await AuditLog.create({
    employeeId: session.user.id,
    actionType: data.actionType,
    targetId: data.targetId,
    targetModel: data.targetModel,
    changes: data.changes,
    metadata: data.metadata,
    ipAddress: getMeta(req).ipAddress,
    userAgent: getMeta(req).userAgent,
    status: data.status,
    errorMessage: data.errorMessage
  });
}

// جلب العلامات التجارية
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, 'view');
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    await connectToDatabase();
    const brands = await Brand.find().sort({ order: 1, createdAt: -1 });
    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب العلامات التجارية' }, { status: 500 });
  }
}

// إضافة علامة تجارية جديدة
export async function POST(req: NextRequest) {
  const result = await requireAuth(req, 'create');
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { session } = result;
  try {
    await connectToDatabase();
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const website = formData.get('website') as string;
    const countries = JSON.parse(formData.get('countries') as string || '[]');
    const logo = formData.get('logo') as File;
    const statusField = formData.get('status') as string;
    const brandData: any = {
      name,
      description,
      website,
      countries,
      status: statusField === 'active'
    };
    if (logo) {
      try {
        const buffer = Buffer.from(await logo.arrayBuffer());
        brandData.logo = { url: await uploadToCloudinary(buffer, 'brands') };
      } catch (uploadError) {
        console.error('Error uploading logo:', uploadError);
        return NextResponse.json({ error: 'فشل في رفع الشعار' }, { status: 500 });
      }
    }
    const newBrand = await Brand.create(brandData);
    await logAudit(req, session!, {
      actionType: 'brand.create',
      targetId: newBrand._id,
      targetModel: 'Brand',
      changes: { newValue: brandData },
      metadata: { brandName: brandData.name },
      status: 'success'
    });
    return NextResponse.json(newBrand, { status: 201 });
  } catch (err: any) {
    console.error('Error creating brand:', err);
    const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء العلامة التجارية';
    if (session) await logAudit(req, session, { actionType: 'brand.create', targetModel: 'Brand', status: 'failure', errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// تحديث علامة تجارية
export async function PUT(req: NextRequest) {
  const result = await requireAuth(req, 'edit');
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { session } = result;
  try {
    await connectToDatabase();
    const contentType = req.headers.get('content-type');
    let data: any;
    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const id = formData.get('id');
      data = { id };
      const logo = formData.get('logo');
      if (logo && logo instanceof File) {
        const buffer = Buffer.from(await logo.arrayBuffer());
        data.logo = { 
          url: await uploadToCloudinary(buffer, 'brands'), 
          alt: logo.name 
        };
      }
    } else {
      data = await req.json();
    }
    const { id, ...updateData } = data;
    const existingBrand = await Brand.findById(id).lean() as Record<string, any>;
    if (!existingBrand) return NextResponse.json({ error: 'العلامة التجارية غير موجودة' }, { status: 404 });
    const brand = Object.keys(updateData).length === 1 && 'status' in updateData
      ? await Brand.findByIdAndUpdate(id, { status: updateData.status }, { new: true }).lean()
      : await Brand.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).lean() as Record<string, any>;
    const changes: Record<string, { oldValue: any; newValue: any }> = {};
    Object.keys(updateData).forEach(key => {
      if (JSON.stringify(existingBrand[key]) !== JSON.stringify((brand as any)[key])) {
        changes[key] = { oldValue: existingBrand[key], newValue: (brand as any)[key] };
      }
    });
    await logAudit(req, session!, {
      actionType: 'brand.update',
      targetId: id,
      targetModel: 'Brand',
      changes,
      metadata: { brandName: (brand as { name?: string })?.name || existingBrand.name, updatedFields: Object.keys(changes) },
      status: 'success'
    });
    revalidatePath('/dashboard/brands');
    return NextResponse.json(brand);
  } catch (err: any) {
    console.error('Error updating brand:', err);
    if (session) {
      await logAudit(req, session, {
        actionType: 'brand.update',
        targetModel: 'Brand',
        status: 'failure',
        errorMessage: err.message || 'حدث خطأ أثناء تحديث العلامة التجارية'
      });
    }
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map((e: any) => e.message);
      return NextResponse.json({ error: 'خطأ في البيانات المدخلة', details: validationErrors }, { status: 400 });
    }
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث العلامة التجارية' }, { status: 500 });
  }
}

// حذف علامة تجارية
export async function DELETE(req: NextRequest) {
  const result = await requireAuth(req, 'delete');
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { session } = result;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'معرف العلامة التجارية مطلوب' }, { status: 400 });
    await connectToDatabase();
    const brand = await Brand.findById(id);
    if (!brand) return NextResponse.json({ error: 'العلامة التجارية غير موجودة' }, { status: 404 });
    await Brand.findByIdAndDelete(id);
    await logAudit(req, session!, {
      actionType: 'brand.delete',
      targetId: id,
      targetModel: 'Brand',
      changes: { oldValue: brand.toObject() },
      metadata: { brandName: brand.name },
      status: 'success'
    });
    revalidatePath('/dashboard/brands');
    return NextResponse.json({ message: 'تم حذف العلامة التجارية بنجاح' });
  } catch (err) {
    console.error('Error deleting brand:', err);
    if (session) {
      await logAudit(req, session, {
        actionType: 'brand.delete',
        targetModel: 'Brand',
        status: 'failure',
        errorMessage: err instanceof Error ? err.message : 'حدث خطأ أثناء حذف العلامة التجارية'
      });
    }
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف العلامة التجارية' }, { status: 500 });
  }
}
