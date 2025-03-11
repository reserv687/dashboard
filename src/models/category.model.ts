import mongoose, { Document, model, models, Schema } from 'mongoose';

export interface ICategory extends Document {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  parentId?: mongoose.Types.ObjectId;
  isActive: boolean;
  children?: ICategory[];
  productsCount?: number;
  slug: string;
  path: string;
  level: number;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      lowercase: true
    },
    description: { 
      type: String,
      trim: true 
    },
    image: { 
      type: String 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    parentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Category',
      default: null
    },
    path: { 
      type: String,
      default: '' 
    },
    level: { 
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// الحقول الافتراضية للأطفال
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
  options: { sort: { name: 1 } }
});

// قبل الحفظ: تحديث المسار والمستوى
categorySchema.pre('save', async function(next) {
  try {
    if (this.isModified('parentId')) {
      if (this.parentId) {
        const parent = await this.model('Category').findById(this.parentId).lean().exec() as unknown as ICategory;
        if (parent) {
          if (parent._id.toString() === this._id.toString()) {
            throw new Error('لا يمكن جعل الفئة أباً لنفسها');
          }
          
          // التحقق من التسلسل الهرمي
          let currentParent = parent;
          while (currentParent.parentId) {
            if (currentParent.parentId.toString() === this._id.toString()) {
              throw new Error('لا يمكن إنشاء حلقة في التسلسل الهرمي للفئات');
            }
            const nextParent = await this.model('Category').findById(currentParent.parentId).lean();
            if (!nextParent) {
              break;
            }
            currentParent = nextParent as unknown as ICategory;
          }
          
          this.path = parent.path ? `${parent.path},${parent._id}` : parent._id.toString();
          this.level = parent.level + 1;
        }
      } else {
        this.path = '';
        this.level = 0;
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// حساب عدد المنتجات في الفئة
categorySchema.virtual('productsCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categoryId',
  count: true
});

const Category = models.Category || model('Category', categorySchema);

export { Category };
// ICategory is already exported in the interface declaration above
export default Category;
