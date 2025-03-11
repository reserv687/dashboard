// تعريف الأنواع المتاحة للموظفين
export const GENDER = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
} as const;

// تعريف الصلاحيات المتاحة
export const PERMISSIONS = {
  ALL: 'ALL',
  // المنتجات
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  
  // العلامات التجارية
  BRANDS_VIEW: 'brands.view',
  BRANDS_CREATE: 'brands.create',
  BRANDS_EDIT: 'brands.edit',
  BRANDS_DELETE: 'brands.delete',
  
  // الفئات
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_EDIT: 'categories.edit',
  CATEGORIES_DELETE: 'categories.delete',
  
  // الطلبات
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_DELETE: 'orders.delete',
  
  // العملاء
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',
  
  // التقييمات
  REVIEWS_VIEW: 'reviews.view',
  REVIEWS_REPLY: 'reviews.reply',
  REVIEWS_DELETE: 'reviews.delete',
  
  // الشرائح الرئيسية
  HERO_VIEW: 'hero.view',
  HERO_CREATE: 'hero.create',
  HERO_EDIT: 'hero.edit',
  HERO_DELETE: 'hero.delete',
  
  // الشحن
  SHIPPING_VIEW: 'shipping.view',
  SHIPPING_CREATE: 'shipping.create',
  SHIPPING_EDIT: 'shipping.edit',
  SHIPPING_DELETE: 'shipping.delete',
  
  // الإعدادات
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  
  // الموظفين
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_EDIT: 'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',
  
  // الإحصائيات
  STATISTICS_VIEW: 'statistics.view',
} as const;

// تجميع الصلاحيات حسب الأقسام
export const PERMISSION_GROUPS = {
  PRODUCTS: ['PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_EDIT', 'PRODUCTS_DELETE'],
  BRANDS: ['BRANDS_VIEW', 'BRANDS_CREATE', 'BRANDS_EDIT', 'BRANDS_DELETE'],
  CATEGORIES: ['CATEGORIES_VIEW', 'CATEGORIES_CREATE', 'CATEGORIES_EDIT', 'CATEGORIES_DELETE'],
  ORDERS: ['ORDERS_VIEW', 'ORDERS_CREATE', 'ORDERS_EDIT', 'ORDERS_DELETE'],
  CUSTOMERS: ['CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_EDIT', 'CUSTOMERS_DELETE'],
  REVIEWS: ['REVIEWS_VIEW', 'REVIEWS_REPLY', 'REVIEWS_DELETE'],
  HERO: ['HERO_VIEW', 'HERO_CREATE', 'HERO_EDIT', 'HERO_DELETE'],
  SHIPPING: ['SHIPPING_VIEW', 'SHIPPING_CREATE', 'SHIPPING_EDIT', 'SHIPPING_DELETE'],
  SETTINGS: ['SETTINGS_VIEW', 'SETTINGS_EDIT'],
  EMPLOYEES: ['EMPLOYEES_VIEW', 'EMPLOYEES_CREATE', 'EMPLOYEES_EDIT', 'EMPLOYEES_DELETE'],
  STATISTICS: ['STATISTICS_VIEW'],
} as const;

// تعريف الأنواع
export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type Gender = typeof GENDER[keyof typeof GENDER];

// واجهة الموظف
export interface IEmployee {
  _id: string;
  name: string;
  email: string;
  password: string;
  permissions: string[];
  isActive: boolean;
  isFirstAdmin: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  name: string;
  label: string;
  description?: string;
}

export interface DashboardSection {
  id: string;
  title: string;
  href: string;
  icon?: string;
  permissions?: string[];
}
