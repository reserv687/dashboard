import mongoose from 'mongoose';
import { isValidPhoneNumber } from 'libphonenumber-js';

const addressSchema = new mongoose.Schema({
  title: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  area: { type: String, default: null },
  building: { type: String, default: null },
  floor: { type: String, default: null },
  apartment: { type: String, default: null },
  landmark: { type: String, default: null },
  location: {
    type: {
      lat: { type: Number },
      lng: { type: Number }
    },
    _id: false,
    default: null
  },
  isDefault: { type: Boolean, default: false }
}, {
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      // تجميع العنوان الكامل
      ret.fullAddress = [
        ret.street,
        ret.area,
        ret.building && `مبنى ${ret.building}`,
        ret.floor && `طابق ${ret.floor}`,
        ret.apartment && `شقة ${ret.apartment}`,
        ret.landmark && `(${ret.landmark})`,
        ret.city
      ].filter(Boolean).join('، ');
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      // تجميع العنوان الكامل
      ret.fullAddress = [
        ret.street,
        ret.area,
        ret.building && `مبنى ${ret.building}`,
        ret.floor && `طابق ${ret.floor}`,
        ret.apartment && `شقة ${ret.apartment}`,
        ret.landmark && `(${ret.landmark})`,
        ret.city
      ].filter(Boolean).join('، ');
      return ret;
    }
  }
});

const paymentMethodSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  cardNumber: { type: String, required: true },
  lastFourDigits: { type: String, required: true },
  expiryDate: { type: String, required: true },
  cardType: { type: String, required: true }, // VISA, MASTERCARD, etc.
  isDefault: { type: Boolean, default: false }
}, {
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

const customerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 3,
  },
  phone: { 
    type: String,
    unique: true,
    sparse: true,
    validate: {
      validator: function(v: string) {
        return !v || isValidPhoneNumber(v);
      },
      message: (props: { value: string }) => `${props.value} رقم هاتف غير صالح`
    }
  },
  email: { 
    type: String,
    unique: true,
    sparse: true,
    validate: {
      validator: function(v: string) {
        return !v || /\S+@\S+\.\S+/.test(v);
      },
      message: (props: { value: string }) => `${props.value} بريد إلكتروني غير صالح`
    }
  },
  password: { 
    type: String, 
    required: true,
    minlength: 8,
    select: false,
  },
  avatar: String,
  gender: { 
    type: String, 
    enum: ['MALE', 'FEMALE'],
    required: true,
  },
  dateOfBirth: { 
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || (v <= new Date() && v >= new Date('1900-01-01'));
      },
      message: 'تاريخ الميلاد غير صالح'
    }
  },
  addresses: [addressSchema],
  paymentMethods: [paymentMethodSchema],
  favoriteProducts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
  }],
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isBlocked: { 
    type: Boolean, 
    default: false,
    required: true,
    index: true // إضافة فهرس للبحث السريع
  },
  blockReason: { 
    type: String,
    default: null
  },
  blockedAt: { 
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  }
});

// التأكد من وجود طريقة اتصال واحدة على الأقل
customerSchema.pre('save', function(next) {
  if (!this.phone && !this.email) {
    next(new Error('يجب توفير رقم الهاتف أو البريد الإلكتروني'));
  }
  next();
});

// إضافة middleware لتتبع التحديثات
customerSchema.pre('updateOne', function() {
  console.log('Pre updateOne:', this.getUpdate());
});

customerSchema.post('updateOne', function(result) {
  console.log('Post updateOne result:', result);
});

// إنشاء الفهرس
customerSchema.index({ phone: 1, email: 1 });

// حذف النموذج القديم إذا كان موجوداً
try {
  mongoose.deleteModel('Customer');
} catch {
  // Model doesn't exist, silently continue
}

// إعادة تسجيل النموذج
const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
