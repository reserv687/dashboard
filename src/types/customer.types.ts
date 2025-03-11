export interface Address {
  id: string;
  title: string;
  street: string;
  city: string;
  area?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  location?: {
    lat: number;
    lng: number;
  };
  isDefault: boolean;
  fullAddress?: string;
}

export interface PaymentMethod {
  _id?: string;
  title: string;
  cardNumber?: string;
  expiryDate?: string;
  isDefault: boolean;
}

// واجهة عرض المنتج المفضل (للعرض فقط)
export interface FavoriteProductView {
  _id: string;
  name: string;
  slug: string;
  price: number;
  finalPrice: number;
  stock: number;
  description: string;
  brand: string;
  image: string;
  discount?: {
    isActive: boolean;
    type: 'fixed' | 'percentage';
    value: number;
  };
}

export interface Customer {
  _id?: string;
  name: string;
  phone: string;
  password?: string;
  email?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: Date;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  favoriteProducts: string[]; // تخزين معرفات المنتجات فقط
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CustomerFormData = Omit<Customer, '_id' | 'createdAt' | 'updatedAt' | 'isPhoneVerified' | 'isEmailVerified'>;
