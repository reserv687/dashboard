'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'; // Add this import
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, UserIcon, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Add this dynamic import
const ClientLocationPicker = dynamic(
  () => import('@/components/dashboard/client-location-picker').then(mod => mod.ClientLocationPicker),
  { ssr: false }
);

interface Address {
  title: string;
  street: string;
  city: string;
  area?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  isDefault: boolean;
  location?: {
    lat: number;
    lng: number;
  };
}

interface PaymentMethod {
  type: string;
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  isDefault: boolean;
}

interface Order {
  _id: string;
  orderNumber: string; // Changed from orderId to orderNumber
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: {
    url: string;
    alt: string;
  };
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  orders: Order[];
  createdAt: string;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: string;
}

const CustomerImage = ({ customer }: { customer: Customer }) => {
  if (customer.avatar?.url && customer.avatar.url !== 'undefined') {
    return (
      <div className="relative w-20 h-20">
        <Image
          src={customer.avatar.url}
          alt={customer.avatar.alt || customer.name}
          fill
          className="rounded-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/default-avatar.png';
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
      <UserIcon className="w-10 h-10 text-muted-foreground" />
    </div>
  );
};

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]); // حالة لتخزين التقييمات
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCustomerAndReviews() {
      try {
        if (!params.id) {
          toast.error('معرف العميل مطلوب');
          return;
        }

        setLoading(true);
        console.log('🔍 Fetching data for customer:', params.id);
        
        // Fetch customer and reviews in parallel
        const [customerResponse, reviewsResponse] = await Promise.all([
          fetch(`/api/dashboard/customers?id=${params.id}`, {
            credentials: 'include',
            cache: 'no-store'
          }),
          fetch(`/api/dashboard/reviews?userId=${params.id}`, {
            credentials: 'include'
          })
        ]);

        // Handle customer response
        if (!customerResponse.ok) {
          throw new Error('Failed to fetch customer');
        }

        const customerData = await customerResponse.json();
        setCustomer(customerData);
        console.log('👤 Customer data loaded');

        // Handle reviews response
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          console.log('📝 Reviews data:', reviewsData);
          setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        } else {
          console.error('Failed to fetch reviews:', await reviewsResponse.text());
          setReviews([]);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        const errorMessage = error instanceof Error ? error.message : 'فشل في جلب البيانات';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerAndReviews();
  }, [params.id]);

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/dashboard/customers?id=${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('فشل حذف العميل');
      }

      toast.success('تم حذف العميل بنجاح');
      router.push('/dashboard/customers');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف العميل';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBlockToggle = async () => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/dashboard/customers?id=${params.id}&action=${customer?.isBlocked ? 'unblock' : 'block'}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: !customer?.isBlocked ? JSON.stringify({ reason: blockReason }) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل تحديث حالة الحظر');
      }

      // تحديث حالة العميل بكامل البيانات الجديدة
      if (data.customer) {
        setCustomer(data.customer);
      }

      toast.success(data.message);
    } catch (error) {
      console.error('Error toggling block status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الحظر');
    } finally {
      setIsSubmitting(false);
      setShowBlockDialog(false);
      setBlockReason('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل بيانات العميل...</p>

        </div>
      </div>
    );
  }

  // Remove error handling block since error variable is not defined
  // This section can be removed since errors are handled in the try-catch block

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-lg">لم يتم العثور على العميل</p>
        <Button onClick={() => router.push('/dashboard/customers')}>
          العودة إلى قائمة العملاء
        </Button>
      </div>
    );
  }

  const renderAddressWithMap = (address: Address) => (
    <div key={address.title} className="border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{address.title}</h3>
          <p className="text-sm text-muted-foreground">
            {[
              address.street,
              address.area,
              address.building && `مبنى ${address.building}`,
              address.floor && `طابق ${address.floor}`,
              address.apartment && `شقة ${address.apartment}`,
              address.landmark && `(${address.landmark})`,
              address.city
            ].filter(Boolean).join('، ')}
          </p>
        </div>
        {address.isDefault && (
          <Badge variant="outline">العنوان الافتراضي</Badge>
        )}
      </div>
      
      {/* عرض الخريطة فقط إذا كان هناك موقع */}
      {address.location && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">موقع العنوان على الخريطة</span>
          </div>
          <div className="relative h-[300px] w-full rounded-lg overflow-hidden">
            <ClientLocationPicker
              initialLocation={address.location}
              readOnly
              showDirectionsButton // إضافة الخاصية هنا
            />
          </div>
        </div>
      )}
    </div>
  );

  const handleOrderClick = (orderNumber: string) => {
    router.push(`/dashboard/orders/${orderNumber}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4" dir="rtl">
      <div className="space-y-6">
        {/* زر العودة */}
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/customers')}
          className="mb-4"
        >
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة إلى قائمة العملاء
        </Button>

        {/* معلومات العميل الأساسية */}
        <div className="flex just gap-3 bg-card rounded-lg p-6 shadow-sm">
       
            <CustomerImage customer={customer} />
            <div>
              <h2 className="text-2xl font-bold">{customer.name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{customer.email}</span>
                {customer.isEmailVerified && (
                  <Badge variant="success">موثق</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{customer.phone}</span>
                {customer.isPhoneVerified && (
                  <Badge variant="success">موثق</Badge>
                )}
              </div>
        
          </div>
        
          {/* ...rest of customer details... */}
        </div>

        {/* Add these buttons after the customer info section */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isSubmitting}
          >
            حذف العميل
          </Button>
          <Button
            variant={customer?.isBlocked ? "secondary" : "destructive"}
            onClick={() => setShowBlockDialog(true)}
            disabled={isSubmitting}
          >
            {customer?.isBlocked ? 'إلغاء حظر العميل' : 'حظر العميل'}
          </Button>
        </div>

        {/* Add block status badge if customer is blocked */}
        {customer?.isBlocked && (
          <div className="mt-2">
            <Badge variant="destructive">محظور</Badge>
            {customer.blockReason && (
              <p className="text-sm text-muted-foreground mt-1">
                سبب الحظر: {customer.blockReason}
              </p>
            )}
            {customer.blockedAt && (
              <p className="text-sm text-muted-foreground">
                تاريخ الحظر: {formatDate(customer.blockedAt)}
              </p>
            )}
          </div>
        )}

        {/* عناوين العميل مع الخرائط */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">العناوين</h2>
          <div className="grid gap-4">
            {customer.addresses.length > 0 ? (
              customer.addresses.map(renderAddressWithMap)
            ) : (
              <p className="text-muted-foreground">لا توجد عناوين مسجلة</p>
            )}
          </div>
        </div>

        {/* وسائل الدفع */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">وسائل الدفع</h2>
          <div className="grid gap-4">
            {customer.paymentMethods.length > 0 ? (
              customer.paymentMethods.map((method, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 w-full">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-lg">
                          {method.type}
                          {method.isDefault && (
                            <Badge variant="outline" className="mr-2">الافتراضي</Badge>
                          )}
                        </h3>
                      </div>
                      {method.cardNumber && (
                        <div className="grid gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">نوع البطاقة:</span>
                            <span>بطاقة ائتمان</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">رقم البطاقة:</span>
                            <span className="font-mono">
                              {method.cardNumber ? `**** **** **** ${method.cardNumber.slice(-4)}` : 'غير متوفر'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">تاريخ الانتهاء:</span>
                            <span>{method.expiryDate || 'غير متوفر'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">لا توجد وسائل دفع مسجلة</p>
            )}
          </div>
        </div>

        {/* الطلبات السابقة */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">الطلبات السابقة</h2>
          <div className="grid gap-4">
            {customer.orders?.length > 0 ? (
              customer.orders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => handleOrderClick(order.orderNumber)}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">رقم الطلب: #{order.orderNumber}</p>
                        <div className="font-bold text-lg">
                          {order.totalAmount?.toFixed(2)} ريال
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>التاريخ: {formatDate(order.createdAt)}</span>
                        <Badge variant={
                          order.status === 'delivered' || order.status === 'completed' 
                            ? 'success' 
                            : 'secondary'
                        }>
                          {getOrderStatusText(order.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">لا توجد طلبات سابقة</p>
            )}
          </div>
        </div>

        {/* تقييمات العميل */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">تقييمات العميل</h2>
          <div className="grid gap-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      {review.product?.images?.[0]?.url && (
                        <Image
                          src={review.product.images[0].url}
                          alt={review.product.name || 'صورة المنتج'}
                          width={80}
                          height={80}
                          className="rounded-md object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-medium">
                          {review.product?.name ? (
                            <Button
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() => router.push(`/dashboard/products/${review.product.slug}`)}
                            >
                              {review.product.name}
                            </Button>
                          ) : (
                            'منتج غير متوفر'
                          )}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`text-lg ${
                                i < (review.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="text-sm text-muted-foreground">
                            ({review.rating || 0}/5)
                          </span>
                        </div>
                        {review.order?.orderNumber && (
                          <p className="text-sm text-muted-foreground mt-1">
                            طلب #{review.order.orderNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {review.createdAt && formatDate(review.createdAt)}
                    </div>
                  </div>

                  {/* تفاصيل التقييم */}
                  <div className="mt-4 space-y-3">
                    {review.comment && (
                      <p className="text-sm">{review.comment}</p>
                    )}

                    {/* المميزات */}
                    {review.pros?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">المميزات:</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {review.pros.map((pro: string, index: number) => (
                            <li key={index} className="text-green-600">
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* العيوب */}
                    {review.cons?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">العيوب:</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {review.cons.map((con: string, index: number) => (
                            <li key={index} className="text-red-600">
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* الصور */}
                    {review.images?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">الصور:</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {review.images.map((image: any, index: number) => (
                            <div key={index} className="relative aspect-square">
                              <Image
                                src={image.url}
                                alt={image.alt || `صورة ${index + 1}`}
                                fill
                                className="rounded-md object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* حالة التقييم */}
                    <div className="flex items-center gap-2 mt-4">
                      <Badge
                        variant={
                          review.status === 'approved'
                            ? 'success'
                            : review.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {review.status === 'approved'
                          ? 'معتمد'
                          : review.status === 'rejected'
                          ? 'مرفوض'
                          : 'قيد المراجعة'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">
                لا توجد تقييمات لهذا العميل
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {customer?.isBlocked ? 'تأكيد إلغاء حظر العميل' : 'تأكيد حظر العميل'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {customer?.isBlocked
                ? 'هل أنت متأكد من إلغاء حظر هذا العميل؟'
                : 'هل أنت متأكد من حظر هذا العميل؟'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!customer?.isBlocked && (
            <div className="py-4">
              <Label htmlFor="blockReason">سبب الحظر</Label>
              <Input
                id="blockReason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="أدخل سبب الحظر"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockToggle}
              disabled={isSubmitting || (!customer?.isBlocked && !blockReason)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : customer?.isBlocked ? (
                'إلغاء الحظر'
              ) : (
                'حظر'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add this helper function to translate status
function getOrderStatusText(status: string) {
  const statusMap: Record<string, string> = {
    'pending': 'قيد الانتظار',
    'confirmed': 'مؤكد',
    'processing': 'قيد المعالجة',
    'shipping': 'قيد الشحن',
    'delivered': 'تم التوصيل',
    'cancelled': 'ملغي'
  };
  return statusMap[status] || status;
}
