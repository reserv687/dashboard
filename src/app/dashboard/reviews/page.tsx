'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';
import { Check, X, AlertCircle, MessageSquare } from 'lucide-react';
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

// تحديث Interface للمراجعات ليتطابق مع الاستجابة من API
interface Review {
  id: string; // تم تغيير _id إلى id
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: any[];
  };
  rating: number;
  comment?: string;
  pros?: string[];
  cons?: string[];
  images?: Array<{
    url: string;
    alt: string;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function ReviewsPage() {
  // Initialize with empty array to prevent undefined errors
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true); // Set loading at the start
      const response = await fetch('/api/dashboard/reviews');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'حدث خطأ أثناء جلب المراجعات');
      }

      const data = await response.json();
      console.log('Received reviews:', data); // للتأكد من البيانات
      
      // Ensure we're setting an array
      setReviews(Array.isArray(data) ? data : []);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('حدث خطأ أثناء جلب المراجعات');
      setReviews([]); // Reset reviews on error
    } finally {
      setLoading(false);
    }
  };

  // تحديث حالة المراجعة
  const updateReviewStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      // تحقق من وجود معرف المراجعة
      if (!reviewId) {
        throw new Error('معرف المراجعة مطلوب');
      }

      // استخدام معرف المراجعة المناسب (_id بدلاً من id)
      const response = await fetch(`/api/dashboard/reviews?id=${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء تحديث حالة المراجعة');
      }

      setReviews(reviews.map(review => 
        review.id === reviewId ? { ...review, status } : review
      ));

      toast.success('تم تحديث حالة المراجعة بنجاح');
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث حالة المراجعة');
    }
  };

  // حذف المراجعة
  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;

    try {
      const response = await fetch(`/api/dashboard/reviews?id=${reviewToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء حذف المراجعة');
      }

      setReviews(reviews.filter(review => review.id !== reviewToDelete));
      toast.success('تم حذف المراجعة بنجاح');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('حدث خطأ أثناء حذف المراجعة');
    } finally {
      setReviewToDelete(null);
    }
  };

  // Show loading state first
  if (loading) {
    return <ReviewsTableSkeleton />;
  }

  // Show error state if there is an error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>إدارة المراجعات</CardTitle>
          <CardDescription>
            عرض وإدارة مراجعات العملاء للمنتجات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-destructive mb-2">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={fetchReviews}
            >
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Now we can safely check reviews length as it's guaranteed to be an array
  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>إدارة المراجعات</CardTitle>
          <CardDescription>
            عرض وإدارة مراجعات العملاء للمنتجات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-muted-foreground mb-2">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium">لا توجد مراجعات حتى الآن</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>إدارة المراجعات</CardTitle>
          <CardDescription>
            عرض وإدارة مراجعات العملاء للمنتجات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <ReviewCard 
                key={review.id} 
                review={review} 
                onUpdateStatus={updateReviewStatus}
                onDelete={() => setReviewToDelete(review.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!reviewToDelete} onOpenChange={() => setReviewToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المراجعة نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// تحديث طريقة عرض بيانات المراجعة في الواجهة
function ReviewCard({ 
  review, 
  onUpdateStatus,
  onDelete 
}: { 
  review: Review;
  onUpdateStatus: (reviewId: string, status: 'approved' | 'rejected') => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-start md:items-center rounded-md shadow-md">
      <div className="flex flex-col flex-1 gap-2">
        <div className="flex flex-col">
          {/* التحقق من وجود بيانات المستخدم */}
          <span className="font-medium">
            {review.user?.name || 'مستخدم غير معروف'}
          </span>
          <span className="text-sm text-muted-foreground">
            {review.user?.email || 'البريد غير متوفر'}
          </span>
        </div>
        <div>
          {/* التحقق من وجود بيانات المنتج */}
          {review.product ? (
            <a
              href={`/products/${review.product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {review.product.name}
            </a>
          ) : (
            <span className="text-muted-foreground">المنتج غير متوفر</span>
          )}
        </div>
        <div className="text-sm">
          <span className="font-medium">التقييم: </span>
          {review.rating} / 5
        </div>
        {review.comment && (
          <div className="text-sm">
            <span className="font-medium">التعليق: </span>
            {review.comment}
          </div>
        )}
        <div className="text-sm">
          <span className="font-medium">التاريخ: </span>
          {format(new Date(review.createdAt), 'PPP', { locale: ar })}
        </div>
        <div>
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
              ? 'مقبول'
              : review.status === 'rejected'
              ? 'مرفوض'
              : 'قيد المراجعة'}
          </Badge>
        </div>
      </div>
      {/* أزرار الإجراءات */}
      <div className="mt-4 md:mt-0 flex items-center gap-2">
        {review.status === 'pending' && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdateStatus(review.id, 'approved')}
            >
              <Check className="w-4 h-4 text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdateStatus(review.id, 'rejected')}
            >
              <X className="w-4 h-4 text-red-500" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
        >
          <X className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function ReviewsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-[100px]" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-[100px]" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
