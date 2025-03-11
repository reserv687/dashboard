import { Address, PaymentMethod } from './customer.types';

// If these types are needed elsewhere, export them:
export type { Address, PaymentMethod };

export type OrderStatus = 
  | 'PENDING'    // في انتظار الدفع
  | 'PROCESSING' // جاري التجهيز
  | 'SHIPPED'    // تم الشحن
  | 'DELIVERED'  // تم التوصيل
  | 'CANCELLED'  // ملغي
  | 'REFUNDED';  // مسترجع

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface OrderItem {
  productId: string;
  name: string;
  basePrice: number;
  finalPrice: number;
  quantity: number;
  options?: Record<string, {
    value: string;
    price?: number;
    label: string;
    code?: string;
  }>;
  discount?: {
    isActive: boolean;
    type?: 'fixed' | 'percentage';
    value?: number;
    startDate?: Date;
    endDate?: Date;
  };
}

export interface OrderRecipient {
  name: string;
  phone: string;
  isCustomer: boolean;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  address: {
    id?: string;
    city?: string;
    area?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    landmark?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  recipient: {
    name: string;
    phone: string;
    isCustomer: boolean;
  };
  paymentMethod: {
    id?: string;
    type?: 'card' | 'cod';
    cardNumber?: string;
    cardHolder?: string;
    expiryMonth?: string;
    expiryYear?: string;
  };
}

export interface OrderAddress {
  type: 'saved' | 'temporary';
  addressId?: string;
  fullAddress?: string;
  city: string;
  area?: string;
  street: string;
  building: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  recipientName: string;
  recipientPhone: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface OrderPaymentMethod {
  type: 'saved' | 'cod' | 'card';
  paymentMethodId?: string;
  cardNumber?: string;
  cardHolder?: string;
  expiryMonth?: string;
  expiryYear?: string;
}

export interface OrderStatusHistory {
  status: keyof OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface ShippingRule {
  type: 'weight' | 'price' | 'distance';
  minValue?: number;
  maxValue?: number;
  additionalCost: number;
}

export interface ShippingMethod {
  _id: string;
  name: string;
  description?: string;
  baseCost: number;
  minCost: number;
  maxCost: number;
  estimatedDeliveryMin?: number;
  estimatedDeliveryMax?: number;
  rules: ShippingRule[];
  isActive: boolean;
}

export interface OrderShipping {
  method: ShippingMethod;
  fee: number;
  estimatedDeliveryDate?: Date;
}

export interface Order {
  _id: string;
  customerId: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  shipping: OrderShipping;
  total: number;
  address: OrderAddress;
  paymentMethod: OrderPaymentMethod;
  status: keyof OrderStatus;
  paymentStatus: keyof PaymentStatus;
  notes?: string;
  statusHistory: OrderStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderWithHistory extends Order {
  statusHistory: OrderStatusHistory[];
}

export interface OrderStatusUpdate {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}
