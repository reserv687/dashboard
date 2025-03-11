import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Shipping from '@/models/shipping.model';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import AuditLog from '@/models/audit-log.model';

// دالة مساعدة لإنشاء سجل التدقيق
const createAudit = async ({
  session,
  actionType,
  targetId,
  targetModel,
  changes,
  metadata,
  req
}: {
  session: any;
  actionType: string;
  targetId: any;
  targetModel: string;
  changes: any;
  metadata: any;
  req: Request | NextRequest;
}) => {
  await AuditLog.create({
    employeeId: session.user.id,
    actionType,
    targetId,
    targetModel,
    changes,
    metadata,
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent'),
    status: 'success'
  });
};

// جلب جميع طرق الشحن أو طريقة شحن محددة
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { pathname } = new URL(req.url);
    const segments = pathname.split('/');
    const id = segments[segments.length - 1];
    if (id && id !== 'shipping') {
      const shippingMethod = await Shipping.findById(id);
      if (!shippingMethod)
        return NextResponse.json({ error: 'طريقة الشحن غير موجودة' }, { status: 404 });
      return NextResponse.json(shippingMethod);
    }
    const shippingMethods = await Shipping.find().sort({ createdAt: -1 });
    return NextResponse.json(shippingMethods);
  } catch (error) {
    console.error('Error fetching shipping methods:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب طرق الشحن' }, { status: 500 });
  }
}

// إضافة طريقة شحن جديدة
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();
    const data = await req.json();
    const shippingMethod = await new Shipping(data).save();
    await createAudit({
      session,
      actionType: 'shipping.create',
      targetId: shippingMethod._id,
      targetModel: 'Shipping',
      changes: { newValue: shippingMethod.toObject() },
      metadata: { shippingName: shippingMethod.name },
      req
    });
    return NextResponse.json(shippingMethod, { status: 201 });
  } catch (error: any) {
    console.error('Error creating shipping method:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء إضافة طريقة الشحن' },
      { status: 400 }
    );
  }
}

// تحديث طريقة شحن موجودة
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();
    const { id, ...updateData } = await req.json();
    if (!id)
      return NextResponse.json({ error: 'معرف طريقة الشحن مطلوب' }, { status: 400 });
    const oldShippingMethod = await Shipping.findById(id).lean() as Record<string, any>;
    if (!oldShippingMethod)
      return NextResponse.json({ error: 'طريقة الشحن غير موجودة' }, { status: 404 });
    const shippingMethod = await Shipping.findByIdAndUpdate(id, updateData, { new: true }) as Record<string, any>;
    const changes: any = {};
    Object.keys(updateData).forEach(field => {
      if (oldShippingMethod[field] !== shippingMethod[field])
        changes[field] = { oldValue: oldShippingMethod[field], newValue: shippingMethod[field] };
    });
    await createAudit({
      session,
      actionType: 'shipping.update',
      targetId: id,
      targetModel: 'Shipping',
      changes,
      metadata: { shippingName: shippingMethod.name, changedFields: Object.keys(updateData) },
      req
    });
    if (!shippingMethod)
      return NextResponse.json({ error: 'طريقة الشحن غير موجودة' }, { status: 404 });
    return NextResponse.json(shippingMethod);
  } catch (error: any) {
    console.error('Error updating shipping method:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء تحديث طريقة الشحن' },
      { status: 400 }
    );
  }
}

// حذف طريقة شحن
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    await connectToDatabase();
    const { id } = await req.json();
    const shippingMethod = await Shipping.findById(id);
    if (!shippingMethod)
      return NextResponse.json({ error: 'طريقة الشحن غير موجودة' }, { status: 404 });
    const deletedMethod = await Shipping.findByIdAndDelete(id);
    await createAudit({
      session,
      actionType: 'shipping.delete',
      targetId: id,
      targetModel: 'Shipping',
      changes: { oldValue: shippingMethod.toObject() },
      metadata: { shippingName: shippingMethod.name },
      req
    });
    if (!deletedMethod)
      return NextResponse.json({ error: 'طريقة الشحن غير موجودة' }, { status: 404 });
    return NextResponse.json({ message: 'تم حذف طريقة الشحن بنجاح' });
  } catch (error: any) {
    console.error('Error deleting shipping method:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء حذف طريقة الشحن' },
      { status: 400 }
    );
  }
}
