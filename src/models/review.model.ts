import { Document, Schema, model, models } from 'mongoose';

// واجهة التقييم
export interface IReview extends Document {
  user: Schema.Types.ObjectId;
  product: Schema.Types.ObjectId;
  order: Schema.Types.ObjectId;
  rating: number;
  comment?: string;
  images?: Array<{
    url: string;
    alt: string;
  }>;
  pros?: string[];
  cons?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

// مخطط التقييم
const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'المستخدم مطلوب'],
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'المنتج مطلوب'],
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    rating: {
      type: Number,
      required: [true, 'التقييم مطلوب'],
      min: [1, 'التقييم يجب أن يكون بين 1 و 5'],
      max: [5, 'التقييم يجب أن يكون بين 1 و 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'التعليق يجب أن لا يتجاوز 1000 حرف'],
    },
    images: [{
      url: {
        type: String,
        required: true,
      },
      alt: {
        type: String,
        default: '',
      },
    }],
    pros: [{
      type: String,
      trim: true,
      maxlength: [200, 'المميزات يجب أن لا تتجاوز 200 حرف'],
    }],
    cons: [{
      type: String,
      trim: true,
      maxlength: [200, 'العيوب يجب أن لا تتجاوز 200 حرف'],
    }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// إضافة مؤشرات للبحث السريع
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ user: 1, status: 1 });
reviewSchema.index({ order: 1 });

// دالة للتحقق من أن المستخدم قد اشترى المنتج فعلاً
reviewSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Order = models.Order;
      const order = await Order.findOne({
        _id: this.order,
        customerId: this.user,
        'items.productId': this.product,
        status: 'DELIVERED',
      });

      if (!order) {
        throw new Error('لا يمكنك تقييم منتج لم تشتريه');
      }

      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

// التحقق من عدم وجود تقييم سابق لنفس المنتج
reviewSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Review = models.Review;
      const existingReview = await Review.findOne({
        user: this.user,
        product: this.product,
      });

      if (existingReview) {
        throw new Error('لا يمكنك تقييم نفس المنتج مرتين');
      }

      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

const Review = models.Review || model<IReview>('Review', reviewSchema);

export default Review;
