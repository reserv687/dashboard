import { Schema, model, models } from 'mongoose';
import "./shipping.model"; // تأكد من تحميل نموذج الشحن

const orderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  options: {
    type: Map,
    of: {
      value: String,
      label: String,
      code: String,
      image: {
        url: String,
        alt: String
      }
    },
    default: {}
  },
  price: {
    type: Number,
    required: true
  },
  finalPrice: {
    type: Number,
    required: true
  }
});

const locationSchema = new Schema({
  latitude: Number,
  longitude: Number
});

const addressSchema = new Schema({
  type: {
    type: String,
    enum: ['saved', 'temporary'],
    required: true
  },
  addressId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer.addresses',
    required: function(this: any) {
      return this.type === 'saved';
    }
  },
  city: {
    type: String,
    required: function(this: any) {
      return this.type === 'temporary';
    }
  },
  area: {
    type: String,
    required: function(this: any) {
      return this.type === 'temporary';
    }
  },
  street: {
    type: String,
    required: function(this: any) {
      return this.type === 'temporary';
    }
  },
  building: {
    type: String,
    required: function(this: any) {
      return this.type === 'temporary';
    }
  },
  floor: String,
  apartment: String,
  landmark: String,
  location: locationSchema
});

const paymentSchema = new Schema({
  type: {
    type: String,
    enum: ['cod', 'card'],
    required: true
  },
  paymentMethodId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer.paymentMethods',
    required: function(this: any) {
      return this.type === 'card';
    }
  }
});

const recipientSchema = new Schema({
  isCustomer: {
    type: Boolean,
    required: true
  },
  name: {
    type: String,
    required: function(this: any) {
      return !this.isCustomer;
    }
  },
  phone: {
    type: String,
    required: function(this: any) {
      return !this.isCustomer;
    }
  }
});

const orderSchema = new Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },

  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function(items: any[]) {
        return items.length > 0;
      },
      message: 'يجب أن يحتوي الطلب على منتج واحد على الأقل'
    }
  },
  address: {
    type: addressSchema,
    required: true
  },
  payment: {
    type: paymentSchema,
    required: true
  },
  shippingMethodId: {
    type: Schema.Types.ObjectId,
    ref: 'Shipping', // تحديث اسم المرجع ليطابق اسم الموديل
    required: true
  },
  recipient: {
    type: recipientSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    }
  }],
  paymentStatusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  }
});

orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (!this.statusHistory || this.statusHistory.length === 0) {
    this.statusHistory = [{
      status: this.status,
      timestamp: new Date(),
      note: 'تم إنشاء الطلب'
    }] as any;
  }
  next();
});

const Order = models.Order || model('Order', orderSchema);

export default Order;
