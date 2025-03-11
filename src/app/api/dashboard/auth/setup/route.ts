import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import Employee from '@/models/employee.model';
import { PERMISSIONS } from '@/types/employee';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    // التحقق من وجود موظفين
    const employeesCount = await Employee.countDocuments();
    if (employeesCount > 0) {
      return NextResponse.json(
        { error: 'تم إعداد النظام مسبقاً' },
        { status: 400 }
      );
    }

    // استخراج البيانات من النموذج
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const password = formData.get('password') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const gender = formData.get('gender') as string;
    const avatar = formData.get('avatar') as File | null;

    // طباعة البيانات المستلمة
    console.log('Received form data:', {
      name,
      email,
      phone,
      jobTitle,
      gender,
      password: password?.length,
      hasAvatar: !!avatar
    });

    // التحقق من وجود البيانات المطلوبة
    if (!name || !email || !phone || !password || !jobTitle || !gender) {
      console.error('Missing required fields:', {
        name: !!name,
        email: !!email,
        phone: !!phone,
        password: !!password,
        jobTitle: !!jobTitle,
        gender: !!gender
      });
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcryptjs.hash(password, 12);
    console.log('Password info:', {
      originalLength: password.length,
      hashedLength: hashedPassword.length
    });
    console.log('Hashed password during setup:', hashedPassword);

    // معالجة الصورة إذا وجدت
    let avatarUrl = '';
    if (avatar) {
      try {
        const buffer = Buffer.from(await avatar.arrayBuffer());
        avatarUrl = (await uploadToCloudinary(buffer, 'employees')) || '';
      } catch (error) {
        console.error('Error uploading avatar:', error);
        return NextResponse.json({ error: 'فشل في رفع الصورة' }, { status: 500 });
      }
    }

    // إنشاء المسؤول الأول
    const employeeData = {
      name,
      email,
      phone,
      password: hashedPassword,
      jobTitle,
      gender,
      permissions: [PERMISSIONS.ALL],
      isActive: true,
      avatar: avatarUrl
    };

    // طباعة البيانات قبل الإنشاء
    console.log('Creating employee with data:', employeeData);

    const adminEmployee = await Employee.create(employeeData);

    // إنشاء الاستجابة مع headers خاصة
    const response = NextResponse.json({
      message: 'تم إنشاء حساب المسؤول بنجاح',
      employee: {
        id: adminEmployee._id,
        name: adminEmployee.name,
        email: adminEmployee.email,
        phone: adminEmployee.phone,
        jobTitle: adminEmployee.jobTitle,
        gender: adminEmployee.gender,
        permissions: adminEmployee.permissions,
        avatar: adminEmployee.avatar
      },
    });

    // إضافة headers لمنع التخزين المؤقت
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error in setup:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إعداد النظام' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();

    // التحقق من وجود موظفين
    const employeesCount = await Employee.countDocuments();
    
    return NextResponse.json({
      isSetup: employeesCount > 0,
      employeesCount
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في التحقق من حالة النظام' },
      { status: 500 }
    );
  }
}
