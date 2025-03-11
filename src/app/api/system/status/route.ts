import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Employee from '@/models/employee.model';

export async function GET() {
  try {
    await connectToDatabase();

    const employeesCount = await Employee.countDocuments();
    console.log('Current employees count:', employeesCount);
    
    const response = NextResponse.json({
      isSetup: employeesCount > 0,
      employeesCount,
      timestamp: Date.now() // إضافة timestamp للتأكد من تحديث البيانات
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      },
    });
    
    return response;
  } catch (error) {
    console.error('Error checking system status:', error);
    return NextResponse.json(
      { 
        error: 'حدث خطأ أثناء التحقق من حالة النظام',
        timestamp: Date.now()
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        }
      }
    );
  }
}

// تعطيل التخزين المؤقت على مستوى الصفحة
export const revalidate = 0;
