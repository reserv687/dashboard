'use client';

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";
import { useOrder } from "@/hooks/use-dashboard-order";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react'; // Add this import

// Import LocationPicker with dynamic to avoid SSR
const LocationPicker = dynamic(
  () => import("@/components/dashboard/location-picker").then(mod => mod.LocationPicker),
  { ssr: false }
);

const orderStatusMap = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-500" },
  confirmed: { label: "مؤكد", color: "bg-blue-500" },
  processing: { label: "قيد المعالجة", color: "bg-blue-500" },
  shipping: { label: "قيد الشحن", color: "bg-purple-500" },
  delivered: { label: "تم التوصيل", color: "bg-green-500" },
  cancelled: { label: "ملغي", color: "bg-red-500" }
} as const;

// تحديث الحالات النهائية
const FINAL_STATUSES = ['delivered', 'cancelled'];

// تحديث التحولات المسموح بها
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

export default function OrderPage({ params }: { params: { orderNumber: string } }) {
  const { order, isLoading, error, mutate } = useOrder(params.orderNumber);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');

  const handleUpdateStatus = async () => {
    if (!newStatus || isUpdating) return;

    try {
      setIsUpdating(true);
      
      const response = await fetch(`/api/dashboard/orders?orderNumber=${params.orderNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل تحديث حالة الطلب');
      }

      await mutate();
      toast.success('تم تحديث حالة الطلب بنجاح');
      setNewStatus('');
      setStatusNote('');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث حالة الطلب');
    } finally {
      setIsUpdating(false);
    }
  };

  const [paymentStatusNote, setPaymentStatusNote] = useState('');

  const handleUpdatePaymentStatus = async () => {
    if (!newPaymentStatus || isUpdating) return;

    try {
      setIsUpdating(true);
      
      const response = await fetch(`/api/dashboard/orders?orderNumber=${params.orderNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: newPaymentStatus,
          note: paymentStatusNote
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل تحديث حالة الدفع');
      }

      await mutate();
      toast.success('تم تحديث حالة الدفع بنجاح');
      setNewPaymentStatus('');
      setPaymentStatusNote('');
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث حالة الدفع');
    } finally {
      setIsUpdating(false);
    }
  };

  // التحقق من إمكانية تغيير الحالة
  const canUpdateStatus = order && !FINAL_STATUSES.includes(order.status);
  
  // الحصول على الحالات المتاحة للتغيير
  const allowedStatuses = order ? ALLOWED_STATUS_TRANSITIONS[order.status] || [] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-red-500">فشل في تحميل تفاصيل الطلب</p>
        <Button onClick={() => mutate()} variant="outline" size="sm">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-gray-500">لا يوجد تفاصيل للطلب</p>
        <Button onClick={() => mutate()} variant="outline" size="sm">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6" dir="rtl">
      {/* معلومات الطلب الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات الطلب</CardTitle>
          <CardDescription>التفاصيل الأساسية للطلب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">رقم الطلب</p>
              <p className="text-lg">#{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium">الحالة</p>
              <Badge className={orderStatusMap[order.status as keyof typeof orderStatusMap]?.color || "bg-gray-500"}>
                {orderStatusMap[order.status as keyof typeof orderStatusMap]?.label || order.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">تاريخ الطلب</p>
              <p>{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">آخر تحديث</p>
              <p>{formatDate(order.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إضافة قسم تحديث الحالة */}
      {canUpdateStatus && allowedStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>تحديث حالة الطلب</CardTitle>
            <CardDescription>يمكنك تغيير حالة الطلب وإضافة ملاحظة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label>الحالة الجديدة</label>
                <Select
                  value={newStatus}
                  onValueChange={setNewStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة الجديدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {orderStatusMap[status as keyof typeof orderStatusMap]?.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label>ملاحظات (اختياري)</label>
                <Textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="أضف ملاحظات حول تغيير الحالة"
                />
              </div>
              <Button
                onClick={handleUpdateStatus}
                disabled={!newStatus || isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري التحديث...
                  </>
                ) : (
                  'تحديث الحالة'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* معلومات العميل والمستلم */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>معلومات العميل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="font-medium">الاسم:</span> {order.customer?.name}</p>
              <p><span className="font-medium">البريد:</span> {order.customer?.email}</p>
              <p><span className="font-medium">الهاتف:</span> {order.customer?.phone}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>معلومات المستلم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="font-medium">الاسم:</span> {order.recipient.name}</p>
              <p><span className="font-medium">الهاتف:</span> {order.recipient.phone}</p>
              <p>
                <span className="font-medium">نوع المستلم:</span>
                {order.recipient.isCustomer ? ' العميل نفسه' : ' شخص آخر'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* معلومات الشحن والدفع */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>معلومات العنوان والشحن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* إضافة قسم طريقة الشحن */}
              <div className="space-y-2">
                <p className="font-medium">طريقة الشحن:</p>
                <div className="text-sm space-y-1 border rounded-lg p-4">
                  <p className="font-semibold text-base">{order.shippingMethod?.name}</p>
                  {order.shippingMethod?.description && (
                    <p className="text-muted-foreground">{order.shippingMethod.description}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <p>تكلفة الشحن: {formatPrice(order.shippingMethod?.baseCost || 0)}</p>
                    <p>
                      مدة التوصيل المتوقعة: {order.shippingMethod?.estimatedDeliveryMin || 0} -{' '}
                      {order.shippingMethod?.estimatedDeliveryMax || 0} يوم
                    </p>
                  </div>
                </div>
              </div>

              {/* باقي معلومات العنوان */}
              <div>
                <p className="font-medium mb-2">نوع العنوان:</p>
                <Badge variant="outline">
                  {order.address.type === 'saved' ? 'عنوان محفوظ' : 'عنوان مؤقت'}
                </Badge>
              </div>

              <div className="grid gap-1">
                <p className="font-medium">تفاصيل العنوان:</p>
                <div className="text-sm space-y-1">
                  <p>المدينة: {order.address.city}</p>
                  <p>المنطقة: {order.address.area}</p>
                  <p>الشارع: {order.address.street}</p>
                  {order.address.building && <p>المبنى: {order.address.building}</p>}
                  {order.address.floor && <p>الطابق: {order.address.floor}</p>}
                  {order.address.apartment && <p>الشقة: {order.address.apartment}</p>}
                  {order.address.landmark && <p>علامة مميزة: {order.address.landmark}</p>}
                </div>
              </div>

              {order.address.location && (
                <div>
                  <p className="font-medium mb-2">الموقع على الخريطة:</p>
                  <div className="h-[300px] relative rounded-lg overflow-hidden">
                    <LocationPicker
                      initialLocation={order.address.location}
                      readOnly
                      showDirectionsButton // إضافة الخاصية الجديدة
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>معلومات الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-2">طريقة الدفع:</p>
                <Badge variant="outline">
                  {order.payment.type === 'cod' ? 'الدفع عند الاستلام' : 'بطاقة ائتمان'}
                </Badge>
              </div>

              {order.payment.type === 'card' && (
                <div className="space-y-2">
                  <p className="font-medium">تفاصيل البطاقة:</p>
                  {order.payment.cardInfo ? (
                    <div className="text-sm space-y-1">
                      <p>نوع البطاقة: {order.payment.cardInfo.type}</p>
                      <p>رقم البطاقة: **** **** **** {order.payment.cardInfo.lastFourDigits}</p>
                      <p>تاريخ الانتهاء: {order.payment.cardInfo.expiryDate}</p>
                      <p>اسم حامل البطاقة: {order.payment.cardInfo.cardholderName}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لا تتوفر تفاصيل البطاقة</p>
                  )}
                </div>
              )}

              <div>
                <p className="font-medium">حالة الدفع:</p>
                <Badge variant={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'destructive' : order.paymentStatus === 'refunded' ? 'secondary' : 'warning'}>
                  {order.paymentStatus === 'paid' ? 'تم الدفع' : 
                   order.paymentStatus === 'failed' ? 'فشل الدفع' : 
                   order.paymentStatus === 'refunded' ? 'تم الاسترجاع' : 
                   'في انتظار الدفع'}
                </Badge>
                {/* إضافة قسم تحديث حالة الدفع */}
                <div className="mt-4 space-y-4">
                  <Select
                    value={newPaymentStatus}
                    onValueChange={setNewPaymentStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="تحديث حالة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">في انتظار الدفع</SelectItem>
                      <SelectItem value="paid">تم الدفع</SelectItem>
                      <SelectItem value="failed">فشل الدفع</SelectItem>
                      <SelectItem value="refunded">تم الاسترجاع</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="grid gap-2">
                    <label>ملاحظات (اختياري)</label>
                    <Textarea
                      value={paymentStatusNote}
                      onChange={(e) => setPaymentStatusNote(e.target.value)}
                      placeholder="أضف ملاحظات حول تغيير حالة الدفع"
                    />
                  </div>

                  <Button
                    onClick={handleUpdatePaymentStatus}
                    disabled={!newPaymentStatus || isUpdating}
                    className="w-full"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري التحديث...
                      </>
                    ) : (
                      'تحديث حالة الدفع'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* المنتجات */}
      <Card>
        <CardHeader>
          <CardTitle>المنتجات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items?.map((item: any, index: number) => (
              <div key={index} className="flex flex-col p-4 border rounded-lg">
                <div className="flex gap-4">
                  <div className="relative w-20 h-20">
                    {item.productData?.images?.[0] ? (
                      <Image
                        src={item.productData.images[0].url || item.productData.images[0]}
                        alt={item.productData.name || 'صورة المنتج'}
                        fill
                        className="object-cover rounded"
                        sizes="80px"
                        onError={(e: any) => {
                          e.currentTarget.src = '/images/placeholder-product.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-sm">لا توجد صورة</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.productData?.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.productData?.description}</p>
                    <div className="mt-2 space-y-1">
                      {item.productData?.category && (
                        <p className="text-sm">
                          <span className="font-medium">الفئة:</span>{' '}
                          {item.productData.category.name}
                        </p>
                      )}
                      {item.productData?.brand && (
                        <p className="text-sm">
                          <span className="font-medium">العلامة التجارية:</span>{' '}
                          {item.productData.brand.name}
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="font-medium">السعر الأساسي:</span>{' '}
                        {formatPrice(item.price)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">السعر النهائي:</span>{' '}
                        {formatPrice(item.finalPrice)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">الكمية المطلوبة:</span>{' '}
                        {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">{formatPrice(item.quantity * item.finalPrice)}</p>
                  </div>
                </div>

                {/* عرض خيارات المنتج */}
                {item.options && Object.keys(item.options).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">الخيارات المحددة:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(item.options).map(([key, option]: [string, any]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="font-medium text-sm">{key}:</span>
                          <div className="flex items-center gap-2">
                            {option.image && (
                              <div className="relative w-6 h-6">
                                <Image
                                  src={option.image.url}
                                  alt={option.label || ''}
                                  fill
                                  className="object-cover rounded"
                                  sizes="24px"
                                />
                              </div>
                            )}
                            <span className="text-sm">
                              {option.label || option.value}
                              {option.code && ` (${option.code})`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* عرض حالة المخزون للمنتج */}
                {item.productData?.stock !== undefined && (
                  <div className="mt-2">
                    <Badge variant={item.productData.stock > 0 ? "success" : "destructive"}>
                      {item.productData.stock > 0 ? "متوفر" : "غير متوفر"}
                    </Badge>
                    {item.productData.stock > 0 && (
                      <span className="text-sm text-muted-foreground mr-2">
                        (المتبقي: {item.productData.stock})
                      </span>
                    )}
                  </div>
                )}
                {/* تعديل عرض حالة المخزون */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">حالة المخزون:</span>
                    <Badge variant={item.productData.stock > 0 ? "success" : "destructive"}>
                      {item.productData.stock > 0 ? "متوفر" : "غير متوفر"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      (الكمية المتاحة: {item.productData.stock})
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>المجموع</span>
                <span>{formatPrice(order.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>رسوم الشحن</span>
                <span>{formatPrice(order.shippingFee || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>الإجمالي</span>
                <span>{formatPrice(order.total || 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}