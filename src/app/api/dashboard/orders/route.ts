import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/order.model';
import Product from '@/models/product.model';
import { hasPermission } from '@/lib/check-employee';
import AuditLog from '@/models/audit-log.model';

const validStatuses = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'] as const;
const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'] as const;

const respondError = (msg: string, status = 400) =>
  NextResponse.json({ error: msg }, { status });

import { Session } from 'next-auth';

const checkPerm = async (action: 'view' | 'create' | 'edit' | 'delete') => {
  const session = await getServerSession(authOptions) as Session;
  if (!session?.user) return false;
  return hasPermission({ permissions: session.user.permissions || [] }, `orders.${action}`);
};

export async function GET(request: NextRequest) {
  try {
    if (!(await checkPerm('view')))
      return respondError('ليس لديك صلاحية عرض الطلبات', 403);
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');

    if (orderNumber) {
      // 1. أولاً، نجلب الطلب بدون populate للمنتجات
      const order = await Order.findOne({ orderNumber })
        .populate('customerId')
        .populate('shippingMethodId')
        .lean();

      if (!order) return respondError('Order not found', 404);

      // 2. نجلب المنتجات بشكل منفصل مع كل المعلومات المطلوبة
      const productIds = (order as any).items.map((item: any) => item.productId);
      const products = await Product.find({ _id: { $in: productIds } })
        .select('name description images price stock status variants')
        .lean();

      // 3. نقوم بتنسيق الطلب مع معلومات المنتجات المحدثة
      const formattedOrder = {
        ...order,
        items: (order as any).items.map((item: any) => {
          const productData = products.find((p: any) => p._id.toString() === item.productId.toString());
          const variant = productData?.variants?.find((v: { combination?: Record<string, string> }) => {
            const combination = Object.entries(v.combination || {});
            const itemOptions = Object.entries(item.options || {});
            return combination.every(([key, value]) => {
              const itemOption = itemOptions.find(([k]) => k === key);
              return itemOption && itemOption[1] === value;
            });
          });
          
          return {
            ...item,
            productData: productData ? {
              id: productData._id,
              name: productData.name,
              description: productData.description,
              images: productData.images || [],
              price: item.price,
              finalPrice: item.finalPrice,

              stock: variant ? variant.stock : productData.stock,
              status: productData.status
            } : {
              name: 'المنتج غير متوفر',
              stock: 0
            }
          };
        }),
        address: {
          ...(order as any).address,
          ...((order as any).address?.type === 'saved' && (order as any).address?.addressId &&
              (order as any).customerId?.addresses?.find((a: { _id: { toString: () => string } }) => a._id.toString() === (order as any).address.addressId.toString()))
        },
        payment: {
...(order as any).payment,
          paymentMethodDetails: (order as any).payment?.type === 'card' && (order as any).payment?.paymentMethodId &&
(order as any).customerId?.paymentMethods?.find((p: { _id: { toString: () => string } }) => p._id.toString() === (order as any).payment?.paymentMethodId?.toString()) || null
        },
        customer: {
          ...(order as any).customerId,
          paymentMethods: (order as any).customerId?.paymentMethods || []
        },
        shippingMethod: (order as any).shippingMethodId,
        subtotal: (order as any).items.reduce((sum: number, item: any) => sum + (item.quantity * (item.finalPrice || 0)), 0),
        shippingFee: (order as any).shippingMethodId?.baseCost || 0
      };

      // إضافة معلومات البطاقة إذا كانت طريقة الدفع بطاقة
      if (formattedOrder.payment.type === 'card' && formattedOrder.payment.paymentMethodDetails) {
        formattedOrder.payment = {
          ...formattedOrder.payment,
          cardInfo: {
            type: formattedOrder.payment.paymentMethodDetails.cardType,
            lastFourDigits: formattedOrder.payment.paymentMethodDetails.lastFourDigits,
            expiryDate: formattedOrder.payment.paymentMethodDetails.expiryDate,
            cardholderName: formattedOrder.payment.paymentMethodDetails.title
          }
        };
      }

const formattedOrderWithTotal = {
  ...formattedOrder,
  total: formattedOrder.subtotal + formattedOrder.shippingFee
};
return NextResponse.json(formattedOrderWithTotal);

    }

    // عرض قائمة الطلبات مع الترقيم
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const query: any = {};
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'name phone email')
        .populate('items.productId', 'name price')
        .lean(),
      Order.countDocuments(query)
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return respondError('Internal Server Error', 500);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await checkPerm('edit')))
      return respondError('ليس لديك صلاحية تعديل الطلبات', 403);
      
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    if (!orderNumber) return respondError("رقم الطلب مطلوب", 400);

    const { status, paymentStatus, note } = await request.json();
    if (status && !validStatuses.includes(status))
      return respondError("حالة الطلب غير صالحة", 400);
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus))
      return respondError("حالة الدفع غير صالحة", 400);
    if (!status && !paymentStatus)
      return respondError("يجب تحديد حالة الطلب أو حالة الدفع", 400);

    await connectToDatabase();
    const session = await getServerSession(authOptions) as Session;
    const employeeId = session?.user?.id;
    const currentOrder = await Order.findOne({ orderNumber }).lean();

    if (!currentOrder || Array.isArray(currentOrder)) return respondError("الطلب غير موجود", 404);

    const updateQuery: any = {
      $set: {
        updatedAt: new Date(),
        lastUpdatedBy: employeeId,
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus })
      }
    };
    if (status || paymentStatus) {
      updateQuery.$push = {
        ...(status && { statusHistory: { status, timestamp: new Date(), note: note || undefined, updatedBy: employeeId } }),
        ...(paymentStatus && { paymentStatusHistory: { status: paymentStatus, timestamp: new Date(), note: note || undefined, updatedBy: employeeId } })
      };
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { orderNumber },
      updateQuery,
      {
        new: true,
        populate: [
          { path: 'customerId', select: 'name phone email' },
          { path: 'items.productId', select: 'name images price slug' }
        ]
      }
    ).lean();

    if (!updatedOrder) {
      return respondError("فشل تحديث الطلب", 500);
    }

    await AuditLog.create({
      employeeId,
      actionType: 'order.update',
      targetId: (updatedOrder as any)._id,
      targetModel: 'Order',
      changes: {
        ...(status && { status: { oldValue: currentOrder.status, newValue: status } }),
        ...(paymentStatus && { paymentStatus: { oldValue: currentOrder.paymentStatus, newValue: paymentStatus } })
      },
      metadata: { orderNumber, customerId: currentOrder.customerId, note: note || undefined },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent'),
      status: 'success'
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return respondError("حدث خطأ أثناء تحديث الطلب", 500);
  }
}
