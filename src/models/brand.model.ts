import { Document, Schema, model, models } from 'mongoose';

// واجهة العلامة التجارية
export interface IBrand extends Document {
  name: string;
  slug: string;
  description?: string;
  logo: {
    url: string;
    alt?: string;
  };
  website?: string;
  countries: string[];
  status: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// دالة تحويل النص إلى slug
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0621-\u064A\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// مخطط العلامة التجارية
const brandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: [true, 'الاسم مطلوب'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logo: {
      url: {
        type: String,
        required: [true, 'صورة الشعار مطلوبة'],
      },
      alt: {
        type: String,
        default: function(this: any) {
          return this.name || ''; // استخدام اسم العلامة التجارية كنص بديل افتراضي
        },
      },
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // اختياري
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'رابط الموقع غير صالح. يجب أن يكون رابطاً صحيحاً (مثال: https://example.com)',
      },
    },
    countries: {
      type: [String],
      required: [true, 'يجب اختيار بلد واحد على الأقل'],
      validate: {
        validator: function(v: string[]) {
          return v.length > 0;
        },
        message: 'يجب اختيار بلد واحد على الأقل',
      },
    },
    status: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// إنشاء الـ slug قبل الحفظ
brandSchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    const baseSlug = createSlug(this.name);
    let slug = baseSlug;
    let counter = 1;
    
    // التحقق من تكرار الـ slug
    const Brand = this.constructor as any;
    while (await Brand.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
    
    // تحديث النص البديل إذا لم يتم تحديده
    if (!this.logo.alt) {
      this.logo.alt = this.name;
    }
  }
  next();
});

const Brand = models.Brand || model('Brand', brandSchema);

export { Brand };
export default Brand;
