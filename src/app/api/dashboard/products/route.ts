import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Product from '@/models/product.model';
import { connectToDatabase } from '@/lib/db';
import slugify from 'slugify';
import { hasPermission } from '@/lib/check-employee';
import AuditLog from '@/models/audit-log.model';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { getImageUrl } from '@/lib/image-loader';

// تحويل النص العربي إلى slug آمن
function createSafeSlug(text: string): string {
  const arabicToLatin: Record<string, string> = {
    'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a',
    'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'th', 'ر': 'r',
    'ز': 'z', 'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd', 'ط': 't',
    'ظ': 'z', 'ع': 'a', 'غ': 'gh',
    'ف': 'f', 'ق': 'q', 'ك': 'k',
    'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y',
    'ئ': 'e', 'ء': 'a', 'ؤ': 'o',
    'ة': 'h', 'ى': 'a'
  };
  const latinText = text.replace(/[\u0600-\u06FF]/g, char => arabicToLatin[char] || char);
  return slugify(latinText, { lower: true, strict: true, trim: true });
}

// التحقق من صلاحيات المستخدم
async function checkPermission(action: 'view' | 'create' | 'edit' | 'delete') {
  const session: any = await getServerSession(authOptions);
  if (!session?.user) return false;
  return hasPermission({ permissions: session.user.permissions || [] }, `products.${action}`);
}

// حساب السعر النهائي للمنتج
function calculateFinalPrice(price: number, discount?: { isActive?: boolean; type?: 'fixed' | 'percentage'; value?: number }) {
  if (!discount?.isActive || !discount.type || !discount.value || !price) return price;
  if (discount.type === 'percentage') {
    const percentage = Math.min(Math.max(Number(discount.value), 0), 100);
    return price * (1 - percentage / 100);
  }
  return Math.max(price - Math.max(Number(discount.value), 0), 0);
}

// دالة موحدة لتسجيل العمليات (audit logging)
async function logAudit(req: NextRequest, session: any, data: {
  actionType: string;
  targetId?: string | null;
  targetModel: string;
  changes?: any;
  metadata?: any;
  status: 'success' | 'failure';
  errorMessage?: string;
}) {
  try {
    // Only create audit log if we have a valid targetId
    if (data.status === 'success' && !data.targetId) {
      console.warn('Audit log skipped: No targetId provided for success status');
      return;
    }

    await AuditLog.create({
      employeeId: session?.user?.id,
      actionType: data.actionType,
      // Only include targetId for success cases
      ...(data.status === 'success' ? { targetId: data.targetId } : {}),
      targetModel: data.targetModel,
      changes: data.changes || {},
      metadata: data.metadata || {},
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
      status: data.status,
      errorMessage: data.errorMessage
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to prevent affecting main operation
  }
}

// GET - قراءة المنتجات
export async function GET(req: NextRequest) {
  try {
    if (!(await checkPermission('view')))
      return NextResponse.json({ error: 'ليس لديك صلاحية عرض المنتجات' }, { status: 403 });
      
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const productId = searchParams.get('id');
    const skip = (page - 1) * limit;

    const transformProduct = (product: any) => ({
      ...product,
      images: product.images?.map((img: any) => ({
        ...img,
        url: getImageUrl(img.url)
      })),
      finalPrice: calculateFinalPrice(product.price, product.discount)
    });

    // إذا تم تحديد معرف منتج معين، نقوم بجلب تفاصيله الكاملة
    if (productId) {
      const product = await Product.findById(productId)
        .populate('category', 'name')
        .populate('brand', 'name')
        .lean();

      if (!product) {
        return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
      }

      return NextResponse.json({
        product: transformProduct(product)
      });
    }
    
    // في حالة عدم تحديد معرف، نجلب قائمة المنتجات
    const totalCount = await Product.countDocuments();
    const products = await Product.find()
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const transformedProducts = products.map(transformProduct);
    
    return NextResponse.json({
      products: transformedProducts,
      pagination: { 
        total: totalCount, 
        page, 
        limit, 
        pages: Math.ceil(totalCount / limit) 
      }
    });
  } catch (error: any) {
    console.error('خطأ في جلب المنتجات:', error);
    return new NextResponse(error.message || 'حدث خطأ أثناء جلب المنتجات', { status: 500 });
  }
}

// POST - إضافة منتج جديد
interface Session {
  user?: {
    id: string;
    permissions: string[];
  };
}

export async function POST(req: NextRequest) {
  const session: Session | null = await getServerSession(authOptions) as Session | null;
  try {
    if (!(await checkPermission('create')))
      return NextResponse.json({ error: 'ليس لديك صلاحية إضافة منتجات' }, { status: 403 });
      
    await connectToDatabase();
    const body = await req.json();
    
    console.log('Received product data:', body);

    // استخراج البيانات من الكائن الرئيسي أو من حقل status
    const productInfo = body.status || body;

    // التحقق من البيانات المطلوبة
    if (!productInfo.name || !productInfo.description) {
      return NextResponse.json({ 
        error: 'الاسم والوصف مطلوبان' 
      }, { status: 400 });
    }

    // تجهيز بيانات المنتج
    interface Dimensions {
      length: number;
      width: number;
      height: number;
      unit: string;
    }

    interface Weight {
      value: number;
      unit: string;
    }

    interface TechnicalSpecs {
      dimensions: Dimensions;
      weight: Weight;
      specifications: Record<string, any>;
    }

    interface Discount {
      isActive: boolean;
      type: 'percentage' | 'fixed';
      value: number;
      startDate?: Date;
      endDate?: Date;
    }

    interface CustomField {
      label: string;
      value: string;
      [key: string]: any;
    }

    interface CustomContent {
      title: string;
      content: string;
      [key: string]: any;
    }

    interface ProductData {
      name: string;
      description: string;
      price: number;
      stock: number;
      slug: string;
      status: string;
      brand: string | null;
      category: string | null;
      countryOfOrigin: string | null;
      userId: string | undefined;
      customFields: CustomField[];
      images: any[];
      technicalSpecs: TechnicalSpecs;
      discount: Discount;
      customContent: CustomContent[];
      attributes: any[];
      variants: any[];
      returnPolicy: {
        replacementPeriod: number;
        refundPeriod: number;
      };
      isFeatured: boolean;
    }

    const productData: ProductData = {
      name: productInfo.name.trim(),
      description: productInfo.description.trim(),
      price: Number(productInfo.price) || 0,
      stock: Number(productInfo.stock || 0),
      slug: createSafeSlug(productInfo.name),
      status: productInfo.status || 'draft',
      brand: productInfo.brand || null,
      category: productInfo.category || null,
      countryOfOrigin: productInfo.countryOfOrigin || null,
      userId: session?.user?.id,
      customFields: Array.isArray(productInfo.customFields)
        ? productInfo.customFields.filter((f: any) => f && f.label && f.value)
        : [],
      images: productInfo.images || [],
      technicalSpecs: {
        dimensions: {
          length: Number(productInfo.technicalSpecs?.dimensions?.length || 0),
          width: Number(productInfo.technicalSpecs?.dimensions?.width || 0),
          height: Number(productInfo.technicalSpecs?.dimensions?.height || 0),
          unit: productInfo.technicalSpecs?.dimensions?.unit || 'cm'
        },
        weight: {
          value: Number(productInfo.technicalSpecs?.weight?.value || 0),
          unit: productInfo.technicalSpecs?.weight?.unit || 'kg'
        },
        specifications: productInfo.technicalSpecs?.specifications || {}
      },
      discount: productInfo.discount || {
        isActive: false,
        type: 'percentage',
        value: 0
      },
      customContent: Array.isArray(productInfo.customContent)
        ? productInfo.customContent.map((item: any) => ({
            title: item.title?.trim() || '',
            content: item.content?.trim() || ''
          }))
        : [],
      attributes: productInfo.attributes || [],
      variants: productInfo.variants || [],
      returnPolicy: {
        replacementPeriod: Number(productInfo.returnPolicy?.replacementPeriod),
        refundPeriod: Number(productInfo.returnPolicy?.refundPeriod)
      },
      isFeatured: Boolean(productInfo.isFeatured), // تأكد من تحويل القيمة إلى boolean
    };

    console.log('Product featured status:', productData.isFeatured); // تتبع حالة المنتج المميز

    // التحقق من صحة قيم سياسة الإرجاع
    if (typeof productData.returnPolicy.replacementPeriod !== 'number' || 
        typeof productData.returnPolicy.refundPeriod !== 'number') {
      return NextResponse.json({ 
        error: 'قيم مدد الاسترجاع والاستبدال غير صحيحة' 
      }, { status: 400 });
    }

    console.log('Technical Specs being saved:', productData.technicalSpecs);
    console.log('Custom content before save:', productData.customContent);
    console.log('Prepared product data:', productData);
    console.log('Return policy data before save:', productData.returnPolicy);

    // Validate images before saving
    if (productData.images?.length) {
      // Filter out any invalid image URLs
      productData.images = productData.images.filter(img => {
        try {
          new URL(img.url);
          return true;
        } catch {
          console.warn('Invalid image URL detected:', img.url);
          return false;
        }
      });
    }

    // إنشاء المنتج
    const product = new Product(productData);
    await product.save();

    // جلب المنتج مع البيانات المرتبطة وتحويل الصور
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .lean();

    // Transform image URLs to ensure they're properly formatted
    if (populatedProduct?.images?.length) {
      populatedProduct.images = populatedProduct.images.map(img => ({
        ...img,
        url: img.url.startsWith('http') ? img.url : `https://${img.url}`
      }));
    }

    return NextResponse.json({ 
      success: true,
      product: populatedProduct 
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    // تحسين رسالة الخطأ
    const errorMessage = error.code === 11000 ? 
      'هذا المنتج موجود مسبقاً' : 
      error.message || 'حدث خطأ أثناء إنشاء المنتج';

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

// PUT - تحديث منتج
export async function PUT(req: NextRequest) {
  const session: Session | null = await getServerSession(authOptions) as Session | null;
  if (!(await checkPermission('edit')))
    return NextResponse.json({ error: 'ليس لديك صلاحية تعديل المنتجات' }, { status: 403 });
    
  try {
    await connectToDatabase();
    const data = await req.json();
    const productId = data._id;
    const existingProduct = await Product.findById(productId);
    if (!existingProduct)
      return NextResponse.json({ message: 'المنتج غير موجود' }, { status: 404 });
      
    if (data.name && data.name !== existingProduct.name) {
      const newSlug = createSafeSlug(data.name);
      const slugExists = await Product.findOne({ slug: newSlug, _id: { $ne: productId } });
      data.slug = slugExists ? `${newSlug}-${Math.floor(Math.random() * 10000)}` : newSlug;
    }
    if (!data.category || data.category === 'none') delete data.category;
    
    if (data.technicalSpecs) {
      data.technicalSpecs = {
        dimensions: {
          length: Number(data.technicalSpecs.dimensions?.length || 0),
          width: Number(data.technicalSpecs.dimensions?.width || 0),
          height: Number(data.technicalSpecs.dimensions?.height || 0),
          unit: data.technicalSpecs.dimensions?.unit || 'cm'
        },
        weight: {
          value: Number(data.technicalSpecs.weight?.value || 0),
          unit: data.technicalSpecs.weight?.unit || 'kg'
        },
        specifications: data.technicalSpecs.specifications || {}
      };
      console.log('Updated technical specs:', data.technicalSpecs);
    }
    if (data.discount) {
      data.discount = {
        isActive: Boolean(data.discount.isActive),
        type: data.discount.type || 'percentage',
        value: Number(data.discount.value || 0),
        startDate: data.discount.startDate ? new Date(data.discount.startDate) : undefined,
        endDate: data.discount.endDate ? new Date(data.discount.endDate) : undefined
      };
    }
    
    // معالجة الصور الجديدة إن وجدت
    if (data.images && Array.isArray(data.images)) {
      const processedImages = await Promise.all(
        data.images.map(async (img: { url: string; alt: string; data?: string }) => {
          if (img.data) {
            try {
              const base64Data = img.data.split(';base64,').pop();
              if (base64Data) {
                const buffer = Buffer.from(base64Data, 'base64');
                const cloudinaryUrl = await uploadToCloudinary(buffer, 'products');
                return { url: cloudinaryUrl, alt: img.alt };
              }
            } catch (error) {
              console.error('Error uploading image to Cloudinary:', error);
            }
          }
          return img;
        })
      );
      data.images = processedImages.filter(img => img.url);
    }

    if (data.sku) {
      // التحقق من عدم تكرار SKU
      const skuExists = await Product.findOne({ 
        sku: data.sku, 
        _id: { $ne: productId } 
      });
      if (skuExists) {
        return NextResponse.json({ 
          error: 'SKU مستخدم بالفعل' 
        }, { status: 400 });
      }
    }

    // إضافة معالجة الحقول المخصصة
    if (data.customFields) {
      interface CustomField {
        label: string;
        value: string;
        [key: string]: any;
      }

      data.customFields = Array.isArray(data.customFields)
        ? (data.customFields as CustomField[]).filter((field: CustomField) => field.label && field.value)
        : [];
    }

    if (data.customContent) {
      data.customContent = Array.isArray(data.customContent)
        ? data.customContent.map((item: any) => ({
            title: item.title?.trim() || '',
            content: item.content?.trim() || ''
          }))
        : [];
      console.log('Updating custom content:', data.customContent);
    }

    if (data.status && !['draft', 'published', 'archived'].includes(data.status)) {
      return NextResponse.json({ error: 'قيمة الحالة غير صالحة. القيم المسموح بها هي: draft, published, archived' }, { status: 400 });
    }

    if (data.returnPolicy) {
      // التأكد من أن القيم رقمية
      const replacementPeriod = Number(data.returnPolicy.replacementPeriod);
      const refundPeriod = Number(data.returnPolicy.refundPeriod);

      if (isNaN(replacementPeriod) || isNaN(refundPeriod)) {
        return NextResponse.json({ 
          error: 'قيم مدد الاسترجاع والاستبدال غير صحيحة' 
        }, { status: 400 });
      }

      data.returnPolicy = {
        replacementPeriod,
        refundPeriod
      };

      console.log('Updating return policy with values:', data.returnPolicy);
    }

    // Validate and transform images
    if (data.images?.length) {
      data.images = data.images.filter(img => {
        try {
          new URL(img.url);
          return true;
        } catch {
          console.warn('Invalid image URL detected:', img.url);
          return false;
        }
      }).map(img => ({
        ...img,
        url: img.url.startsWith('http') ? img.url : `https://${img.url}`
      }));
    }

    // تحديث حالة المنتج المميز
    if ('isFeatured' in data) {
      data.isFeatured = Boolean(data.isFeatured);
      console.log('Updating featured status:', data.isFeatured);
    }

    const existingData = await Product.findById(productId).lean();
    const updatedProduct = await Product.findByIdAndUpdate(productId, { $set: data }, { 
      new: true, 
      runValidators: true,
      timestamps: true // تحديث timestamps
    })
      .populate('category', '_id name')
      .lean();
      
    const changes: any = {};
    Object.keys(data).forEach(key => {
      if (
        existingData &&
        updatedProduct &&
        key in existingData &&
        key in updatedProduct &&
        JSON.stringify((existingData as any)[key]) !== JSON.stringify((updatedProduct as any)[key])
      ) {
        changes[key] = { oldValue: (existingData as any)[key], newValue: (updatedProduct as any)[key] };
      }
    });
    
    await logAudit(req, session, {
      actionType: 'product.update',
      targetId: productId,
      targetModel: 'Product',
      changes,
      metadata: {
        productName: updatedProduct && !Array.isArray(updatedProduct) ? updatedProduct.name : 'N/A',
        category: updatedProduct && !Array.isArray(updatedProduct) ? updatedProduct.category : 'N/A',
        brand: updatedProduct && !Array.isArray(updatedProduct) ? updatedProduct.brand : 'N/A',
        updatedFields: Object.keys(changes)
      },
      status: 'success'
    });
    
    if (!updatedProduct)
      return NextResponse.json({ message: 'فشل تحديث المنتج' }, { status: 400 });
      
    return NextResponse.json({
          ...updatedProduct,
          sku: (updatedProduct as any).sku,
          serialNumber: (updatedProduct as any).serialNumber,
          qrCode: (updatedProduct as any).qrCode,
          images: updatedProduct?.images?.map(img => ({
            ...img,
            url: img.url.startsWith('http') ? img.url : `https://${img.url}`
          }))
    });
  } catch (error: any) {
    console.error('PUT /api/dashboard/products - Error:', error);
    if ((session as Session)?.user)
      await logAudit(req, session, {
        actionType: 'product.update',
        targetModel: 'Product',
        status: 'failure',
        errorMessage: error.message
      });
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تحديث المنتج' }, { status: 500 });
  }
}

// DELETE - حذف منتج
export async function DELETE(req: NextRequest) {
  const session: Session | null = await getServerSession(authOptions) as Session | null;
  if (!(await checkPermission('delete')))
    return NextResponse.json({ error: 'ليس لديك صلاحية حذف المنتجات' }, { status: 403 });
    
  try {
    await connectToDatabase();
    const { _id: productId } = await req.json();
    const product = await Product.findById(productId);
    if (!product)
      return NextResponse.json({ message: 'المنتج غير موجود' }, { status: 404 });
      
    const productData = await Product.findById(productId).lean();
    await Product.findByIdAndDelete(productId);
    
    await logAudit(req, session, {
      actionType: 'product.delete',
      targetId: productId,
      targetModel: 'Product',
      changes: { oldValue: productData },
      metadata: {
        productName: !Array.isArray(productData) ? productData?.name : 'N/A',
        category: !Array.isArray(productData) ? productData?.category : 'N/A',
        brand: !Array.isArray(productData) ? productData?.brand : 'N/A'
      },
      status: 'success'
    });
    return NextResponse.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (error: any) {
    console.error('DELETE /api/dashboard/products - Error:', error);
    if (session?.user)
      await logAudit(req, session, {
        actionType: 'product.delete',
        targetModel: 'Product',
        status: 'failure',
        errorMessage: error.message
      });
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف المنتج' }, { status: 500 });
  }
}
