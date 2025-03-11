// بسم الله الرحمن الرحيم
// والصلاة والسلام على رسول الله

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Review from '@/models/review.model';
import Customer from '@/models/customer.model';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/check-employee';
import { Types } from 'mongoose';
import AuditLog from '@/models/audit-log.model';

// دالة التحقق من الصلاحيات
import { Session } from 'next-auth';

async function checkPermission(action: 'view' | 'reply' | 'delete') {
  const session: Session | null = await getServerSession(authOptions) as Session | null;
  if (!session?.user) return false;
  return hasPermission(
    { permissions: session.user.permissions || [] },
    `reviews.${action}`
  );
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Fetching reviews...');
    await connectToDatabase();
    const session: Session | null = await getServerSession(authOptions) as Session | null;
    if (!session?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (
      !hasPermission(
        { permissions: session.user.permissions || [] },
        'reviews.view'
      )
    )
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    console.log('👤 User ID:', userId);

    const query =
      userId && Types.ObjectId.isValid(userId)
        ? { user: new Types.ObjectId(userId) }
        : {};
    console.log('🔍 Query:', query);

    const reviews = await Review.find(query)
      .populate('product', 'name slug images')
      .populate('order', 'orderNumber')
      .populate({ path: 'user', model: Customer, select: 'name email avatar' })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${reviews.length} reviews`);

    const formattedReviews = reviews.map(r => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      pros: r.pros || [],
      cons: r.cons || [],
      images: Array.isArray(r.images) ? r.images : [],
      status: r.status,
      createdAt: r.createdAt,
      user: r.user
        ? {
            id: r.user._id,
            name: r.user.name,
            email: r.user.email,
            avatar: r.user.avatar
          }
        : null,
      product: r.product
        ? { name: r.product.name, slug: r.product.slug, images: r.product.images }
        : null,
      order: r.order ? { orderNumber: r.order.orderNumber } : null
    }));

    console.log('✅ Successfully formatted reviews');
    return NextResponse.json(formattedReviews);
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب التقييمات' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const session: Session | null = await getServerSession(authOptions) as Session | null;
    if (!session?.user)
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (!(await checkPermission('reply')))
      return NextResponse.json(
        { error: 'ليس لديك صلاحية الرد على المراجعات' },
        { status: 403 }
      );

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id || !Types.ObjectId.isValid(id))
      return NextResponse.json(
        { error: 'معرف المراجعة غير صالح' },
        { status: 400 }
      );

    const { status } = await req.json();
    if (!['approved', 'rejected'].includes(status))
      return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });

    const oldReview = await Review.findById(id).lean();
    if (!oldReview)
      return NextResponse.json({ error: 'المراجعة غير موجودة' }, { status: 404 });

    const review = await Review.findByIdAndUpdate(
      new Types.ObjectId(id),
      { status },
      { new: true }
    );

    // تسجيل عملية تحديث حالة المراجعة
    await AuditLog.create({
      employeeId: session.user.id,
      actionType: 'review.update',
      targetId: id,
      targetModel: 'Review',
      changes: { status: { oldValue: (oldReview as any).status, newValue: status } },
      metadata: { reviewId: id, productId: (oldReview as any)?.product, userId: (oldReview as any)?.user },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
      status: 'success'
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث المراجعة' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const session: Session | null = await getServerSession(authOptions) as Session | null;
    if (!session?.user)
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (!(await checkPermission('delete')))
      return NextResponse.json(
        { error: 'ليس لديك صلاحية حذف المراجعات' },
        { status: 403 }
      );

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ error: 'معرف المراجعة مطلوب' }, { status: 400 });

    const review = await Review.findById(id);
    if (!review)
      return NextResponse.json({ error: 'المراجعة غير موجودة' }, { status: 404 });

    await Review.findByIdAndDelete(id);

    // تسجيل عملية حذف المراجعة
    await AuditLog.create({
      employeeId: session.user.id,
      actionType: 'review.delete',
      targetId: id,
      targetModel: 'Review',
      changes: { oldValue: review.toObject() },
      metadata: {
        reviewId: id,
        productId: review.product,
        userId: review.user,
        rating: review.rating
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
      status: 'success'
    });

    return NextResponse.json({ message: 'تم حذف المراجعة بنجاح' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف المراجعة' },
      { status: 500 }
    );
  }
}
