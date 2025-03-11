import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Customer from '@/models/customer.model';
import Order from '@/models/order.model';
import AuditLog from '@/models/audit-log.model';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/check-employee';
import { Types, SortOrder } from 'mongoose';

const formatCustomerData = (customer: any) => {
  if (!customer) return null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const avatar = customer.avatar || '';
  const formattedUrl =
    avatar.startsWith('http') || avatar.startsWith('/')
      ? avatar
      : `${baseUrl.replace(/\/$/, '')}/${avatar}`;
  return { ...customer, avatar: avatar ? { url: formattedUrl, alt: customer.name } : null };
};

const formatOrders = (orders: any[]) =>
  orders.map(order => {
    const totalAmount = order.items?.reduce(
      (sum: number, item: any) => sum + ((item.finalPrice || 0) * (item.quantity || 0)),
      0
    ) || 0;
    return {
      _id: String(order._id),
      orderNumber: order.orderNumber,
      totalAmount,
      status: order.status || 'pending',
      createdAt: order.createdAt.toISOString()
    };
  });

const checkPermission = async (action: 'view' | 'create' | 'edit' | 'delete'): Promise<boolean> => {
  const session = await getServerSession(authOptions) as any;
  if (!session?.user) {
    throw new Error('غير مصرح لك بإجراء هذه العملية');
  }
  return hasPermission({ permissions: session.user.permissions || [] }, `customers.${action}`);
};

export async function GET(req: NextRequest) {
  try {
    if (!(await checkPermission('view')))
      return NextResponse.json({ error: 'ليس لديك صلاحية عرض العملاء' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const verifiedStatus = searchParams.get('verifiedStatus') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    await connectToDatabase();

    if (id) {
      const customer = await Customer.findById(id)
        .select('name email phone avatar isEmailVerified isPhoneVerified addresses paymentMethods createdAt')
        .lean();
      if (!customer)
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      const orders = await Order.find({ customerId: customer._id })
        .select('orderNumber items status createdAt')
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json({ ...formatCustomerData(customer), orders: formatOrders(orders) });
    }

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (verifiedStatus !== 'all') {
      if (verifiedStatus === 'verified') {
        query.$and = [{ isEmailVerified: true }, { isPhoneVerified: true }];
      } else {
        query.$or = [{ isEmailVerified: false }, { isPhoneVerified: false }];
      }
    }
    const skip = (page - 1) * limit;
    const sort: { [key: string]: SortOrder } = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .select('name email phone avatar createdAt isEmailVerified isPhoneVerified')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query)
    ]);

    const customerIds = customers.map(c => c._id);
    const orderCounts = await Order.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } }
    ]);

    const orderCountMap = new Map(orderCounts.map(o => [String(o._id), o.count]));
    const customersWithFormattedData = customers.map(cust => ({
      ...formatCustomerData(cust),
      orders: orderCountMap.get(String(cust._id)) || 0
    }));
    return NextResponse.json({
      customers: customersWithFormattedData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await checkPermission('delete')))
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف العملاء' }, { status: 403 });
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id || !Types.ObjectId.isValid(id))
      return NextResponse.json({ error: 'معرف العميل غير صالح' }, { status: 400 });

    await connectToDatabase();
    const customer = await Customer.findById(id).lean();
    if (!customer)
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    await Customer.findByIdAndDelete(id);
    
    const session = await getServerSession(authOptions) as any;
    await AuditLog.create({
      employeeId: session?.user.id,
      actionType: 'customer.delete',
      targetId: id,
      targetModel: 'Customer',
      changes: { oldValue: customer },
      metadata: { customerId: id, customerEmail: customer.email, customerPhone: customer.phone },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
      status: 'success'
    });
    return NextResponse.json({ message: 'تم حذف العميل بنجاح' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف العميل' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await checkPermission('edit')))
      return NextResponse.json({ error: 'ليس لديك صلاحية تعديل العملاء' }, { status: 403 });
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');
    if (!id || !Types.ObjectId.isValid(id))
      return NextResponse.json({ error: 'معرف العميل غير صالح' }, { status: 400 });
    
    await connectToDatabase();
    const session = await getServerSession(authOptions) as any;
    if (action === 'block' || action === 'unblock') {
      const data = action === 'block' ? await req.json() : {};
      const updateData =
        action === 'block'
          ? { isBlocked: true, blockReason: data.reason, blockedAt: new Date() }
          : { isBlocked: false, blockReason: null, blockedAt: null };

      const oldCustomer = await Customer.findById(id).lean();
      if (!oldCustomer)
        return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
      
      const updatedCustomer = await Customer.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .select('name email phone avatar isEmailVerified isPhoneVerified addresses paymentMethods isBlocked blockReason blockedAt createdAt')
        .lean();
      if (!updatedCustomer)
        return NextResponse.json({ error: 'العميل غير موجود بعد التحديث' }, { status: 404 });
      
      await AuditLog.create({
        employeeId: session?.user.id,
        actionType: 'customer.update',
        targetId: id,
        targetModel: 'Customer',
        changes: {
          isBlocked: { oldValue: oldCustomer.isBlocked, newValue: updateData.isBlocked },
          blockReason: { oldValue: oldCustomer.blockReason, newValue: updateData.blockReason }
        },
        metadata: { customerId: id, customerEmail: oldCustomer.email, customerPhone: oldCustomer.phone, action },
        ipAddress: req.headers.get('x-forwarded-for') || req.ip,
        userAgent: req.headers.get('user-agent'),
        status: 'success'
      });
      const orders = await Order.find({ customerId: updatedCustomer._id })
        .select('orderNumber items status createdAt')
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json({
        success: true,
        message: action === 'block' ? 'تم حظر العميل بنجاح' : 'تم إلغاء حظر العميل بنجاح',
        customer: { ...formatCustomerData(updatedCustomer), orders: formatOrders(orders) }
      });
    }
    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث بيانات العميل' }, { status: 500 });
  }
}
