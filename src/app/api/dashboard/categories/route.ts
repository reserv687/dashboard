import { connectToDatabase } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Category } from '@/models/category.model';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Session } from 'next-auth';
import slugify from 'slugify';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';
import { hasPermission } from '@/lib/check-employee';
import AuditLog from '@/models/audit-log.model';

type Action = 'view' | 'create' | 'edit' | 'delete';

export type CategoryData = {
  name: string;
  description: string;
  parentId: string;
  isActive: boolean;
  slug: string;
  image?: string;
};

// دالة التحقق من الصلاحيات (باختصار)
const checkPermission = async (action: Action) => {
  const session = await getServerSession(authOptions) as Session;
  return session?.user && hasPermission({ permissions: session.user.permissions || [] }, `categories.${action}`);
};

const getSession = async () => {
  const session = await getServerSession(authOptions) as Session;
  if (!session?.user)
  if (!session?.user)
    throw NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  return session;
};

// دالة التحقق من الدائرية في العلاقة بين الفئات
const circularCheck = async (catId: string, newParent: string): Promise<boolean> => {
  let curr = newParent;
  const visited = new Set<string>();
  while (curr) {
    if (curr === catId || visited.has(curr)) return true;
    visited.add(curr);
    const parent = await Category.findById(curr);
    if (!parent || !parent.parentId) break;
    curr = parent.parentId.toString();
  }
  return false;
};

// دالة تجميع معرفات الفئات الفرعية بشكل متداخل
const getAllSubIds = async (parentId: string): Promise<string[]> => {
  const subs = await Category.find({ parentId });
  let ids = [parentId];
  for (const sub of subs) {
    ids = ids.concat(await getAllSubIds(sub._id.toString()));
  }
  return ids;
};

// GET - جلب الفئات
export async function GET(req: NextRequest) {
  try {
    if (!(await checkPermission('view')))
      return NextResponse.json({ error: 'ليس لديك صلاحية عرض الفئات' }, { status: 403 });
      
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'table';
    const page = parseInt(searchParams.get('page') || '1'),
          limit = parseInt(searchParams.get('limit') || '10'),
          skip = (page - 1) * limit;
          
    const total = await Category.countDocuments();
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'products',
          let: { cid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: '$category' }, { $toString: '$$cid' }] } } },
            { $count: 'count' }
          ],
          as: 'productsCount'
        }
      },
      {
        $lookup: {
          from: 'categories',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$parentId', '$$pid'] } } },
            { $count: 'count' }
          ],
          as: 'subCategoriesCount'
        }
      },
      {
        $addFields: {
          productsCount: { $ifNull: [{ $arrayElemAt: ['$productsCount.count', 0] }, 0] },
          subCategoriesCount: { $ifNull: [{ $arrayElemAt: ['$subCategoriesCount.count', 0] }, 0] },
          isMainCategory: { $eq: [{ $ifNull: ['$parentId', null] }, null] }
        }
      },
      { $sort: { isMainCategory: -1, createdAt: -1 } }
    ];
    if (view === 'table') pipeline.push({ $skip: skip }, { $limit: limit });
    
    const cats = await Category.aggregate(pipeline);
    const transform = cats.map(c => ({
      ...c,
      _id: c._id.toString(),
      parentId: c.parentId?.toString()
    }));
    
    return NextResponse.json(
      view === 'tree'
        ? { categories: transform, total }
        : { categories: transform, pagination: { total, page, limit, pages: Math.ceil(total / limit) } }
    );
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الفئات' }, { status: 500 });
  }
}

// POST - إضافة فئة جديدة
export async function POST(req: NextRequest) {
  try {
    if (!(await checkPermission('create')))
      return NextResponse.json({ error: 'ليس لديك صلاحية إضافة فئات' }, { status: 403 });
      
    const session = await getSession();
    await connectToDatabase();
    const form = await req.formData();
    const name = form.get('name') as string;
    if (!name)
      return NextResponse.json({ error: 'يجب إدخال اسم الفئة' }, { status: 400 });
      
    if (await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }))
      return NextResponse.json(
        { error: 'DUPLICATE_NAME', message: 'يوجد فئة بنفس الاسم بالفعل' },
        { status: 400 }
      );
      
    const catData: CategoryData = {
      name,
      description: form.get('description') as string,
      parentId: form.get('parentId') as string,
      isActive: form.get('isActive') === 'true',
      slug: slugify(name, { lower: true, strict: true, locale: 'ar' }),
      image: ''
    };
    const image = form.get('image') as File;
    if (image) {
      try {
        const buffer = Buffer.from(await image.arrayBuffer());
        catData.image = (await uploadToCloudinary(buffer, 'categories')) ?? undefined;
      } catch {
        return NextResponse.json({ error: 'فشل في رفع الصورة' }, { status: 500 });
      }
    }
    
    const newCat = await Category.create(catData);
    if (catData.parentId && catData.parentId !== 'none')
      await Category.findByIdAndUpdate(catData.parentId, { $push: { children: newCat._id } });
      
    await AuditLog.create({
      employeeId: session.user.id,
      actionType: 'category.create',
      targetId: newCat._id,
      targetModel: 'Category',
      changes: { newValue: catData },
      metadata: { categoryName: catData.name, isMainCategory: !catData.parentId || catData.parentId === 'none' },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
      status: 'success'
    });
    
    revalidatePath('/dashboard/categories');
    return NextResponse.json(newCat, { status: 201 });
  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الفئة' }, { status: 500 });
  }
}

// PATCH - تحديث فئة
export async function PATCH(req: NextRequest) {
  try {
    if (!(await checkPermission('edit')))
      return NextResponse.json({ error: 'ليس لديك صلاحية تعديل الفئات' }, { status: 403 });
      
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ error: 'معرف الفئة مطلوب' }, { status: 400 });
      
    await connectToDatabase();
    const data = await req.json();
    if (data.parentId && await circularCheck(id, data.parentId))
      return NextResponse.json({ error: 'لا يمكن جعل فئة فرعية أباً لفئة من فئاتها الأم' }, { status: 400 });
      
    const cat = await Category.findById(id);
    if (cat && cat.parentId !== data.parentId) {
      if (cat.parentId) await Category.findByIdAndUpdate(cat.parentId, { $pull: { children: cat._id } });
      if (data.parentId) await Category.findByIdAndUpdate(data.parentId, { $push: { children: cat._id } });
    }
    
    const oldCat = (await Category.findById(id).lean()) as Record<string, any>;
    if (!oldCat)
      return NextResponse.json({ error: 'الفئة غير موجودة' }, { status: 404 });
      
    const updatedCat = (await Category.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean()) as Record<string, any>;
    if (!updatedCat)
      return NextResponse.json({ error: 'فشل في تحديث الفئة' }, { status: 404 });
      
    const changes: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      if (oldCat[key] !== updatedCat[key])
        changes[key] = { oldValue: oldCat[key], newValue: updatedCat[key] };
    });
    
    await AuditLog.create({
      employeeId: session.user.id,
      actionType: 'category.update',
      targetId: id,
      targetModel: 'Category',
      changes,
      metadata: { categoryName: updatedCat.name, changedFields: Object.keys(data) },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
      status: 'success'
    });
    
    revalidatePath('/dashboard/categories');
    return NextResponse.json(updatedCat);
  } catch (error) {
    console.error('Error in PATCH:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث الفئة' }, { status: 500 });
  }
}

// DELETE - حذف فئة
export async function DELETE(req: NextRequest) {
  try {
    if (!(await checkPermission('delete')))
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف الفئات' }, { status: 403 });
      
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ error: 'معرف الفئة مطلوب' }, { status: 400 });
      
    await connectToDatabase();
    const cat = await Category.findById(id);
    if (!cat)
      return NextResponse.json({ error: `الفئة غير موجودة (ID: ${id})` }, { status: 404 });
      
    const idsToDel = await getAllSubIds(id);
    await Category.deleteMany({ _id: { $in: idsToDel } });
    if (cat.parentId)
      await Category.findByIdAndUpdate(cat.parentId, { $pull: { children: cat._id } });
      
    await AuditLog.create({
      employeeId: session.user.id,
      actionType: 'category.delete',
      targetId: id,
      targetModel: 'Category',
      changes: { oldValue: cat.toObject(), newValue: null, deletedSubcategories: { oldValue: null, newValue: idsToDel.length - 1 } },
      metadata: { categoryName: cat.name, totalDeleted: idsToDel.length },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
      status: 'success'
    });
    
    revalidatePath('/dashboard/categories');
    return NextResponse.json(
      { message: 'تم حذف الفئة والفئات الفرعية بنجاح', deletedCount: idsToDel.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف الفئة' }, { status: 500 });
  }
}
