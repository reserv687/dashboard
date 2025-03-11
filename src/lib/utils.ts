import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function fetcher<T = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'حدث خطأ أثناء جلب البيانات' }));
    throw new Error(error.error || 'حدث خطأ أثناء جلب البيانات');
  }
  return response.json();
}

export function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '0 ريال';
  return price.toLocaleString('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  });
}

export function formatDate(date: string | Date) {
  if (!date) return '';
  
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function calculateDiscount(price: number, discount?: number): number {
  if (!discount) return price;
  return price - (price * discount / 100);
}

// التحقق من صحة رقم الهاتف السعودي
export function isValidSaudiPhoneNumber(phone: string): boolean {
  // يجب أن يبدأ بـ 05 ويتكون من 10 أرقام
  const saudiPhoneRegex = /^05[0-9]{8}$/;
  return saudiPhoneRegex.test(phone);
}

// تنسيق رقم الهاتف
export function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return '';
  
  // إزالة أي شيء غير الأرقام
  const cleaned = phone.replace(/\D/g, '');
  
  // التأكد من أن الرقم 10 أرقام
  if (cleaned.length !== 10) return phone;
  
  // تنسيق الرقم: 05xx xxx xxx
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 5);
  return `${timestamp}${randomStr}`.toUpperCase();
}

// تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية
export function convertArabicToEnglishNumbers(str: string | number): string {
  if (typeof str === 'number') return str.toString();
  
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  return str.split('').map(char => {
    const arabicIndex = arabicNumbers.indexOf(char);
    if (arabicIndex !== -1) return arabicIndex.toString();
    
    const persianIndex = persianNumbers.indexOf(char);
    if (persianIndex !== -1) return persianIndex.toString();
    
    return char;
  }).join('');
}

// تحويل النص إلى رقم (يدعم الأرقام العربية والفارسية)
export function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  const englishNumbers = convertArabicToEnglishNumbers(value);
  return Number(englishNumbers);
}

export const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('ar-EG')} ج.م`;
};

export function getInitials(name: string | undefined): string {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
}
