import { Schema, model, models } from 'mongoose';
import type { IProduct } from '@/types/product';
import QRCode from 'qrcode';

const schemaDefaults = {
  str: { type: String },
  reqStr: { type: String, required: true },
  num: { type: Number },
  reqNum: { type: Number, required: true },
  bool: { type: Boolean, default: false },
  opts: { _id: false }
};

const imageFields = {
  url: schemaDefaults.reqStr,
  alt: schemaDefaults.reqStr
};

const schemas = {
  image: new Schema(imageFields, schemaDefaults.opts),
  
  attribute: new Schema({
    name: schemaDefaults.reqStr,
    type: { ...schemaDefaults.str, enum: ['color', 'custom'], default: 'custom' },
    values: [{
      label: schemaDefaults.reqStr,
      code: schemaDefaults.str
    }],
    isRequired: schemaDefaults.bool
  }, schemaDefaults.opts),
  
  variant: new Schema({
    combination: { type: Map, of: String },
    price: schemaDefaults.reqNum,
    stock: schemaDefaults.reqNum,
    sku: schemaDefaults.str,
    barcode: schemaDefaults.str,
    image: {
      url: schemaDefaults.str,
      alt: schemaDefaults.str
    },
    isActive: { ...schemaDefaults.bool, default: true }
  }, schemaDefaults.opts),
  
  technicalSpecs: new Schema({
    dimensions: {
      type: {
        length: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        unit: { type: String, enum: ['cm', 'mm', 'm', 'inch'], default: 'cm' }
      },
      required: false
    },
    weight: {
      type: {
        value: { type: Number, default: 0 },
        unit: { type: String, enum: ['kg', 'g', 'lb', 'oz'], default: 'kg' }
      },
      required: false
    },
    specifications: {
      type: Map,
      of: String,
      default: {}
    }
  }, schemaDefaults.opts)
};

const productSchema = new Schema<IProduct>({
  name: { ...schemaDefaults.str, required: true },  // Keep name required
  description: { ...schemaDefaults.str, required: true },  // Keep description required
  price: schemaDefaults.reqNum,
  finalPrice: schemaDefaults.num,
  stock: { type: Number, default: 0 },
  slug: { ...schemaDefaults.str, required: true },  // Keep slug required
  status: { ...schemaDefaults.str, enum: ['draft', 'published', 'archived'], default: 'draft' },
  countryOfOrigin: { type: String },  // Make optional
  brand: { 
    type: Schema.Types.ObjectId, 
    ref: 'Brand',
    required: false // Make brand optional
  },
  category: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category',
    required: false // Keep category optional
  },
  images: [schemas.image],
  attributes: [schemas.attribute],
  variants: [schemas.variant],
  technicalSpecs: new Schema({
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      unit: { type: String, enum: ['cm', 'mm', 'm', 'inch'], default: 'cm' }
    },
    weight: {
      value: { type: Number, default: 0 },
      unit: { type: String, enum: ['kg', 'g', 'lb', 'oz'], default: 'kg' }
    },
    specifications: { type: Map, of: String, default: {} }
  }, { _id: false }),
  customContent: [{
    _id: false, // إضافة هذا لمنع إنشاء _id لكل عنصر
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true }
  }],
  discount: new Schema({
    isActive: { type: Boolean, default: false },
    type: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },
    value: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date
  }, { _id: false }),
  userId: { type: String, required: true },
  isFeatured: schemaDefaults.bool,
  featuredBadgeText: schemaDefaults.str,
  featuredBadgeColor: schemaDefaults.str,
  featuredStartDate: Date,
  featuredEndDate: Date,
  sku: { 
    type: String, 
    unique: true, 
    sparse: true,
    index: true 
  },
  serialNumber: { 
    type: String, 
    unique: true, 
    index: true 
  },
  qrCode: { 
    type: String 
  },
  customFields: [{
    label: { type: String, required: true },
    value: { type: String, required: true }
  }]
}, { timestamps: true });

productSchema.methods.calculateFinalPrice = function() {
  if (!this.discount?.isActive || !this.discount.type || !this.discount.value || !this.price) {
    return this.price;
  }

  if (this.discount.type === 'percentage') {
    const percentageValue = Math.min(Math.max(Number(this.discount.value), 0), 100);
    return this.price * (1 - percentageValue / 100);
  }
  
  const fixedValue = Math.max(Number(this.discount.value), 0);
  return Math.max(this.price - fixedValue, 0);
};

// دالة لإنشاء SKU فريد
async function generateSKU(doc: any): Promise<string> {
  const prefix = doc.name.substring(0, 2).toUpperCase();
  const categoryPrefix = doc.category ? 
    (await models.Category.findById(doc.category))?.name?.substring(0, 2).toUpperCase() || 'XX' : 
    'XX';
  const count = await models.Product.countDocuments();
  const number = (count + 1).toString().padStart(6, '0');
  return `${prefix}-${categoryPrefix}-${number}`;
}

// دالة لإنشاء رقم تسلسلي فريد
function generateSerialNumber(): string {
  return 'SN-' + Date.now().toString(36).toUpperCase() + 
         Math.random().toString(36).substring(2, 7).toUpperCase();
}

// دالة لإنشاء QR code
async function generateQRCode(sku: string, serialNumber: string): Promise<string> {
  try {
    const data = JSON.stringify({
      sku,
      serialNumber,
      timestamp: new Date().toISOString()
    });
    return await QRCode.toDataURL(data);
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

// middleware للتحقق وإنشاء الحقول الجديدة
productSchema.pre('save', async function(next) {
  try {
    if (!this.serialNumber) {
      // توليد رقم تسلسلي جديد إذا لم يكن موجوداً
      this.serialNumber = generateSerialNumber();
    }

    if (!this.sku) {
      // توليد SKU جديد إذا لم يتم توفيره
      this.sku = await generateSKU(this);
    }

    // توليد QR code جديد في كل مرة يتم فيها تغيير SKU أو Serial Number
    if (this.isNew || this.isModified('sku') || this.isModified('serialNumber')) {
      this.qrCode = await generateQRCode(this.sku, this.serialNumber);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

export default models.Product || model<IProduct>('Product', productSchema);
