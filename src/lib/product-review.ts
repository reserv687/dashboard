export type ReviewReason = 
  | 'low_stock'           // المخزون منخفض
  | 'no_sales'            // لم يحقق مبيعات
  | 'price_check'         // تحقق من السعر
  | 'outdated_info'       // معلومات قديمة
  | 'low_performance'     // أداء منخفض
  | 'missing_images'      // صور ناقصة
  | 'expired_discount'    // خصم منتهي
  | 'custom';             // سبب مخصص

export interface ReviewStatus {
  pending: boolean;
  reason: ReviewReason;
  details?: string;
  lastChecked: Date;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
}

export function checkProductNeedsReview(product: any): { needsReview: boolean; reason?: ReviewReason; priority: 'low' | 'medium' | 'high' } {
  const currentDate = new Date();
  const lastUpdate = new Date(product.updatedAt);
  const daysSinceUpdate = Math.floor((currentDate.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  // التحقق من المخزون
  if (product.stock <= (product.stockAlert?.threshold || 5)) {
    return {
      needsReview: true,
      reason: 'low_stock',
      priority: 'high'
    };
  }

  // التحقق من الصور
  if (!product.images || product.images.length === 0) {
    return {
      needsReview: true,
      reason: 'missing_images',
      priority: 'high'
    };
  }

  // التحقق من الخصومات المنتهية
  if (product.discountEndDate && new Date(product.discountEndDate) < currentDate) {
    return {
      needsReview: true,
      reason: 'expired_discount',
      priority: 'medium'
    };
  }

  // التحقق من تحديث المعلومات
  if (daysSinceUpdate > 90) { // لم يتم التحديث منذ 3 أشهر
    return {
      needsReview: true,
      reason: 'outdated_info',
      priority: 'low'
    };
  }

  return { needsReview: false, priority: 'low' };
}

export function getReviewReasonText(reason: ReviewReason): string {
  const reasons: Record<ReviewReason, string> = {
    low_stock: 'المخزون منخفض',
    no_sales: 'لم يحقق مبيعات',
    price_check: 'تحقق من السعر',
    outdated_info: 'معلومات قديمة',
    low_performance: 'أداء منخفض',
    missing_images: 'صور ناقصة',
    expired_discount: 'خصم منتهي',
    custom: 'سبب مخصص'
  };
  
  return reasons[reason] || 'غير محدد';
}
