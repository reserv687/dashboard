import { Document } from 'mongoose';
import { ICategory } from './category';
import { IBrand } from './brand';

type ImageType = { url: string; alt: string };
type DateRange = { startDate?: Date; endDate?: Date };

export const Enums = {
  Status: ['draft', 'published', 'archived'] as const,
  DiscountType: ['fixed', 'percentage'] as const,
  AttributeType: ['color', 'custom'] as const,
  MeasurementUnit: ['cm', 'mm', 'm', 'inch'] as const,
  WeightUnit: ['kg', 'g', 'lb', 'oz'] as const
} as const;

export type ProductStatus = typeof Enums.Status[number];
export type DiscountType = typeof Enums.DiscountType[number];
export type AttributeType = typeof Enums.AttributeType[number];
export type MeasurementUnit = typeof Enums.MeasurementUnit[number];
export type WeightUnit = typeof Enums.WeightUnit[number];

export interface TechnicalSpecs {
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm' | 'inch' | 'meter';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'g' | 'lb' | 'oz';
  };
  specifications: Record<string, string>;
}

export interface ProductAttribute {
  name: string;
  type: AttributeType;
  values: Array<{
    label: string;
    code?: string;
    price: number;
    stock: number;
    image?: ImageType;
  }>;
  isRequired: boolean;
}

export interface ProductVariant {
  combination: Record<string, string>;
  price: number;
  stock: number;
  sku: string;      // Make required
  qrCode: string;   // Make required
  image?: ImageType;
  isActive: boolean;
}

export interface CustomField {
  label: string;
  value: string;
}

export interface IProduct extends Document {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  serialNumber: string;
  qrCode: string;
  description: string;
  price: number;
  finalPrice: number;
  stock: number;
  status: ProductStatus;
  countryOfOrigin?: string;
  brand?: IBrand | string; // Make brand optional
  category?: ICategory | string;
  images: ImageType[];
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  technicalSpecs?: TechnicalSpecs;
  customContent: Array<{
    title: string;
    content: string;
  }>;
  discount?: {
    isActive: boolean;
    type?: DiscountType;
    value?: number;
  } & DateRange;
  userId: string;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  customFields?: CustomField[];
  returnPolicy: {
    replacementPeriod: number;  // مدة الاستبدال بالأيام
    refundPeriod: number;       // مدة الاسترجاع بالأيام
  };
}

// واجهة لحالة التحقق من المنتج
export interface ProductValidation {
  hasStock: boolean;
  hasOptions: boolean;
  hasRequiredOptions: boolean;
  hasOptionalOptions: boolean;
  requiredOptions: string[];
  optionalOptions: string[];
  canAddToCart: boolean;
  stockError: string | null;
}

// دالة مساعدة للتحقق من حالة المنتج
export function validateProduct(product: IProduct): ProductValidation {
  // التحقق من المخزون
  const hasStock = product.stock > 0;
  const stockError = !hasStock ? 'نفذت الكمية' : null;

  // التحقق من وجود خيارات
  const hasOptions = Array.isArray(product.attributes) && product.attributes.length > 0;
  
  // تصنيف الخيارات
  const requiredOptions = hasOptions ? product.attributes!.filter(opt => opt.isRequired) : [];
  const optionalOptions = hasOptions ? product.attributes!.filter(opt => !opt.isRequired) : [];
  
  const hasRequiredOptions = requiredOptions.length > 0;
  const hasOptionalOptions = optionalOptions.length > 0;

  return {
    hasStock,
    hasOptions,
    hasRequiredOptions,
    hasOptionalOptions,
    requiredOptions: requiredOptions.map(opt => opt.name),
    optionalOptions: optionalOptions.map(opt => opt.name),
    canAddToCart: hasStock && !hasRequiredOptions,
    stockError
  };
}
