import { Schema, model, models } from 'mongoose';

const auditLogSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  actionType: {
    type: String,
    enum: [
      // Product related actions
      'product.create', 'product.update', 'product.delete', 'product.status.update',
      // Category related actions
      'category.create', 'category.update', 'category.delete', 'category.status.update',
      // Order related actions
      'order.create', 'order.update', 'order.delete',
      'order.status.update', 'order.payment.update', 'order.shipping.update',
      // User management actions
      'employee.create', 'employee.update', 'employee.delete', 'employee.status.update',
      'customer.create', 'customer.update', 'customer.delete', 'customer.status.update',
      // Brand related actions
      'brand.create', 'brand.update', 'brand.delete', 'brand.status.update',
      // Hero section actions
      'hero.create', 'hero.update', 'hero.delete',
      // Review management actions
      'review.create', 'review.update', 'review.delete', 'review.status.update',
      // Shipping method actions
      'shipping.create', 'shipping.update', 'shipping.delete',
      // Settings actions
      'settings.update'
    ],
    required: true,
    index: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'targetModel'  // استخدام refPath بدلاً من ref
  },
  targetModel: {
    type: String,
    enum: [
      'Product', 'Category', 'Order', 'Employee', 
      'Customer', 'Brand', 'Hero', 'Review', 
      'Shipping', 'Settings'
    ],
    required: true,
    index: true
  },
  changes: {
    type: Map,
    of: {
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
      field: String
    },
    default: new Map()
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true
  },
  errorMessage: String
});

// النموذج يحتوي على جميع الحقول المطلوبة (employeeId, actionType, targetId, targetModel, changes, metadata, ipAddress, userAgent, timestamp, status, errorMessage)

// تحسين الأداء عبر الفهارس
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ 'employeeId.name': 1 });
auditLogSchema.index({ 'employeeId.email': 1 });
auditLogSchema.index({ actionType: 1, timestamp: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ status: 1 });

const AuditLog = models.AuditLog || model('AuditLog', auditLogSchema);

export default AuditLog;