import { connectToDatabase } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import Hero from '@/models/hero.model';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/check-employee';
import AuditLog from '@/models/audit-log.model';

// دالة التحقق من المصادقة والصلاحيات
async function requireAuthPermission(
  req: NextRequest,
  action: 'view' | 'create' | 'edit' | 'delete',
  permError: string
) {
  const session: any = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!hasPermission({ permissions: session.user.permissions || [] }, `hero.${action}`))
    return NextResponse.json({ error: permError }, { status: 403 });
  return session;
}

// دالة تسجيل نشاط الموظف
async function createAudit(
  req: NextRequest,
  session: any,
  actionType: string,
  targetId: any,
  targetModel: string,
  changes: any,
  metadata: any
) {
  await AuditLog.create({
    employeeId: session.user.id,
    actionType,
    targetId,
    targetModel,
    changes,
    metadata,
    ipAddress: req.headers.get('x-forwarded-for') || req.ip,
    userAgent: req.headers.get('user-agent'),
    status: 'success'
  });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthPermission(req, 'view', 'ليس لديك صلاحية عرض الشرائح');
    if (auth instanceof NextResponse) return auth;
    await connectToDatabase();
    const slides = await Hero.find().sort({ order: 1 });
    return NextResponse.json({ slides });
  } catch (error) {
    console.error('Hero GET Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الشرائح' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthPermission(req, 'create', 'ليس لديك صلاحية إضافة الشرائح');
    if (session instanceof NextResponse) return session;
    await connectToDatabase();

    const formData = await req.formData();
    const image = formData.get('image') as File;
    let imageData = null;
    if (image) {
      try {
        const buffer = Buffer.from(await image.arrayBuffer());
        const imageUrl = await uploadToCloudinary(buffer, 'hero');
        imageData = { url: imageUrl, alt: (formData.get('title') as string) || image.name };
      } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json({ error: 'فشل في رفع الصورة' }, { status: 500 });
      }
    }
    const slideData = {
      title: formData.get('title'),
      subtitle: formData.get('subtitle'),
      buttonText: formData.get('buttonText'),
      buttonLink: formData.get('buttonLink'),
      isActive: formData.get('isActive') === 'true',
      order: parseInt(formData.get('order') as string) || 0,
      image: imageData
    };
    if (!slideData.title || !imageData)
      return NextResponse.json({ error: 'العنوان والصورة مطلوبان' }, { status: 400 });
    const newSlide = await Hero.create(slideData);
    await createAudit(
      req,
      session,
      'hero.create',
      newSlide._id,
      'Hero',
      { newValue: slideData },
      { slideTitle: slideData.title, order: slideData.order }
    );
    revalidatePath('/dashboard/hero');
    return NextResponse.json(newSlide, { status: 201 });
  } catch (error) {
    console.error('Hero POST Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الشريحة' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuthPermission(req, 'edit', 'ليس لديك صلاحية تعديل الشرائح');
    if (session instanceof NextResponse) return session;
    await connectToDatabase();

    const slideId = req.headers.get('x-hero-id');
    if (!slideId) return NextResponse.json({ error: 'معرف الشريحة مطلوب' }, { status: 400 });
    const oldSlide = await Hero.findById(slideId).lean();
    if (!oldSlide) return NextResponse.json({ error: 'الشريحة غير موجودة' }, { status: 404 });

    let updateData: any = {};
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const image = formData.get('image') as File;
      if (image) {
        try {
          const buffer = Buffer.from(await image.arrayBuffer());
          const imageUrl = await uploadToCloudinary(buffer, 'hero');
          updateData.image = { url: imageUrl, alt: (formData.get('title') as string) || image.name };
        } catch (error) {
          console.error('Error uploading image:', error);
          return NextResponse.json({ error: 'فشل في رفع الصورة' }, { status: 500 });
        }
      }
      updateData.title = formData.get('title');
      updateData.subtitle = formData.get('subtitle');
      updateData.buttonText = formData.get('buttonText');
      updateData.buttonLink = formData.get('buttonLink');
      updateData.isActive = formData.get('isActive') === 'true';
      updateData.order = parseInt(formData.get('order') as string) || 0;
    } else {
      updateData = await req.json();
      if (!Object.keys(updateData).length)
        return NextResponse.json({ error: 'لا توجد بيانات للتحديث' }, { status: 400 });
      if (updateData.title === '')
        return NextResponse.json({ error: 'عنوان الشريحة لا يمكن أن يكون فارغاً' }, { status: 400 });
    }
    const updatedSlide = await Hero.findByIdAndUpdate(
      slideId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
    if (!updatedSlide) return NextResponse.json({ error: 'الشريحة غير موجودة' }, { status: 404 });
    const changes = new Map();
    Object.keys(updateData).forEach(field => {
      if ((oldSlide as any)[field] !== (updatedSlide as any)[field])
        changes.set(field, { oldValue: (oldSlide as any)[field], newValue: (updatedSlide as any)[field] });
    });
    await createAudit(
      req,
      session,
      'hero.update',
      slideId,
      'Hero',
      changes,
      { slideTitle: Array.isArray(updatedSlide) ? updatedSlide[0].title : updatedSlide.title, changedFields: Object.keys(updateData) }
    );
    revalidatePath('/dashboard/hero');
    return NextResponse.json(updatedSlide);
  } catch (error) {
    console.error('Hero PATCH Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث الشريحة' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuthPermission(req, 'delete', 'ليس لديك صلاحية حذف الشرائح');
    if (session instanceof NextResponse) return session;
    await connectToDatabase();

    const slideId = req.headers.get('x-hero-id');
    if (!slideId) return NextResponse.json({ error: 'معرف الشريحة مطلوب' }, { status: 400 });
    const deletedSlide = await Hero.findByIdAndDelete(slideId);
    if (!deletedSlide)
      return NextResponse.json({ error: 'الشريحة غير موجودة' }, { status: 404 });
    await createAudit(
      req,
      session,
      'hero.delete',
      slideId,
      'Hero',
      new Map([['oldValue', deletedSlide.toObject()]]),
      { slideTitle: deletedSlide.title, order: deletedSlide.order }
    );
    revalidatePath('/dashboard/hero');
    return NextResponse.json({ message: 'تم حذف الشريحة بنجاح' });
  } catch (error) {
    console.error('Hero DELETE Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف الشريحة' }, { status: 500 });
  }
}
