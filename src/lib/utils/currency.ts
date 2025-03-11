export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return 'السعر غير محدد';
  }
  return `${amount.toLocaleString('ar-EG')} ج.م`;
}

// للخصومات الثابتة
export function formatFixedDiscount(amount: number): string {
  return `${amount.toLocaleString('ar-EG')} ج.م`;
}
