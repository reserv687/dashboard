import { formatFixedDiscount } from './currency';

interface Discount {
  isActive: boolean;
  type?: 'fixed' | 'percentage';
  value?: number;
}

export function formatDiscountText(discount?: Discount): string {
  if (!discount?.isActive || !discount.type || !discount.value) {
    return '';
  }

  if (discount.type === 'fixed') {
    return `خصم ${formatFixedDiscount(discount.value)}`;
  }

  return `خصم ${discount.value}%`;
}

export function calculateDiscountedPrice(price: number, discount?: Discount): number {
  if (!discount?.isActive || !discount.type || !discount.value) {
    return price;
  }

  if (discount.type === 'fixed') {
    return Math.max(0, price - discount.value);
  }

  const discountAmount = (price * discount.value) / 100;
  return Math.max(0, price - discountAmount);
}
