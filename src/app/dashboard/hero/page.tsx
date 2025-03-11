'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusToggle } from '@/components/ui/status-toggle';
import { ImageUpload } from '@/components/dashboard/image-upload';
import { QuickEditInput } from '@/components/dashboard/quick-edit-input'; // إضافة هذا الاستيراد
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface HeroSlide {
  _id?: string;
  title: string;
  subtitle: string;
  image: {
    url: string;
    alt: string;
  };
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  order: number;
}

export default function HeroPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null); // Track which slide image is being uploaded
  const { data: session, status } = useSession();
  const router = useRouter();

  const [newSlide, setNewSlide] = useState({
    title: '',
    subtitle: '',
    image: null as File | null,
    buttonText: '',
    buttonLink: '',
    isActive: true,
  });

  // التحقق من الصلاحيات
  const hasViewPermission = session?.user?.permissions?.includes('hero.view') || session?.user?.permissions?.includes('ALL');

  // التحقق من تسجيل الدخول والصلاحيات
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && !hasViewPermission) {
      router.push('/dashboard');
    } else if (status === 'authenticated' && hasViewPermission) {
      fetchSlides();
    }
  }, [status, hasViewPermission, router]);

  // جلب الشرائح
  const fetchSlides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/hero', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      setSlides(data.slides);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ في جلب الشرائح');
      console.error('Error fetching slides:', error);
    } finally {
      setLoading(false);
    }
  };

  // إضافة شريحة جديدة
  const handleAddSlide = async () => {
    try {
      if (!newSlide.title) {
        toast.error('يرجى إدخال عنوان الشريحة');
        return;
      }

      if (!newSlide.image) {
        toast.error('يرجى اختيار صورة للشريحة');
        return;
      }

      setIsSubmitting(true);
      setIsUploading('new'); // Set uploading state for new slide
      const toastId = toast.loading('جاري إضافة الشريحة...');
      const formData = new FormData();
      formData.append('title', newSlide.title);
      formData.append('subtitle', newSlide.subtitle);
      formData.append('buttonText', newSlide.buttonText);
      formData.append('buttonLink', newSlide.buttonLink);
      formData.append('isActive', String(newSlide.isActive));
      formData.append('image', newSlide.image);

      const response = await fetch('/api/dashboard/hero', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success('تم إضافة الشريحة بنجاح', { id: toastId });
      setNewSlide({
        title: '',
        subtitle: '',
        image: null,
        buttonText: '',
        buttonLink: '',
        isActive: true,
      });
      setIsCreating(false);
      fetchSlides();
    } catch (error) {
      console.error('Error adding slide:', error);
      const errorToastId = toast.loading('حدث خطأ في إضافة الشريحة');
      toast.error('حدث خطأ في إضافة الشريحة', { id: errorToastId });
    } finally {
      setIsSubmitting(false);
      setIsUploading(null); // Clear uploading state
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة الشرائح الرئيسية</h1>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? 'إلغاء' : 'إضافة شريحة جديدة'}
        </Button>
      </div>

      {/* نموذج إضافة شريحة جديدة */}
      {isCreating && (
        <div className="bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-center rounded-md shadow-md">
          <div className="flex flex-1 items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <ImageUpload
                image={newSlide.image ? URL.createObjectURL(newSlide.image) : null}
                onImageChange={(file) => setNewSlide({ ...newSlide, image: file })}
                onImageRemove={async () => Promise.resolve(setNewSlide({ ...newSlide, image: null }))}
                width="w-40"
                height="h-24"
                isDisabled={isUploading === 'new'}
              />
              <div className="flex flex-col gap-2 w-full">
                <Input
                  value={newSlide.title}
                  onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                  placeholder="عنوان الشريحة"
                  className="text-lg font-semibold"
                />
                <Input
                  value={newSlide.subtitle}
                  onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
                  placeholder="العنوان الفرعي"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Input
                value={newSlide.buttonText}
                onChange={(e) => setNewSlide({ ...newSlide, buttonText: e.target.value })}
                placeholder="نص الزر"
              />
              <Input
                value={newSlide.buttonLink}
                onChange={(e) => setNewSlide({ ...newSlide, buttonLink: e.target.value })}
                placeholder="رابط الزر"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <StatusToggle
              checked={newSlide.isActive}
              onCheckedChange={(checked) => setNewSlide({ ...newSlide, isActive: checked })}
              disabled={isSubmitting}
            />
            <Button 
              onClick={handleAddSlide}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                'إضافة'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* تحديث عرض قائمة الشرائح */}
      <div className="space-y-4">
        <div className="grid gap-4">
          {slides.map((slide) => (
            <div key={slide._id} className="bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-center rounded-md shadow-md">
              <div className="flex flex-1 items-center gap-4">
                {/* صورة الشريحة */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <ImageUpload
                    image={slide.image?.url}
                    onImageChange={async (file) => {
                      if (file) {
                        setIsUploading(slide._id!); // Set uploading state for this slide
                        const toastId = toast.loading('جاري تحديث الصورة...');
                        try {
                          const formData = new FormData();
                          formData.append('image', file);
                          formData.append('title', slide.title || '');
                          const response = await fetch(`/api/dashboard/hero`, {
                            method: 'PATCH',
                            headers: { 'x-hero-id': slide._id! },
                            body: formData,
                          });
                          if (response.ok) {
                            fetchSlides();
                            toast.success('تم تحديث الصورة بنجاح', { id: toastId });
                          } else {
                            const errorData = await response.json();
                            toast.error(errorData.error || 'فشل في تحديث الصورة', { id: toastId });
                          }
                        } catch (error) {
                          console.error('Error updating image:', error);
                          toast.error('فشل في تحديث الصورة', { id: toastId });
                        } finally {
                          setIsUploading(null); // Clear uploading state
                        }
                      }
                    }}
                    onImageRemove={async () => Promise.resolve()}
                    width="w-40"
                    height="h-24"
                    isDisabled={isUploading === slide._id}
                  />
                  <div className="flex flex-col gap-2">
                    <QuickEditInput
                      value={slide.title}
                      onSubmit={async (value) => {
                        const toastId = toast.loading('جاري تحديث العنوان...');
                        try {
                          const response = await fetch(`/api/dashboard/hero`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-hero-id': slide._id!
                            },
                            body: JSON.stringify({ title: value }),
                          });
                          if (response.ok) {
                            fetchSlides();
                            toast.success('تم تحديث العنوان بنجاح', { id: toastId });
                          } else {
                            toast.error('فشل في تحديث العنوان', { id: toastId });
                          }
                        } catch (error) {
                          console.error('Error updating title:', error);
                          toast.error('فشل في تحديث العنوان', { id: toastId });
                        }
                      }}
                      className="text-lg font-semibold"
                    />
                    <QuickEditInput
                      value={slide.subtitle}
                      onSubmit={async (value) => {
                        const toastId = toast.loading('جاري تحديث العنوان الفرعي...');
                        try {
                          const response = await fetch(`/api/dashboard/hero`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-hero-id': slide._id!
                            },
                            body: JSON.stringify({ subtitle: value }),
                          });
                          if (response.ok) {
                            fetchSlides();
                            toast.success('تم تحديث العنوان الفرعي بنجاح', { id: toastId });
                          } else {
                            toast.error('فشل في تحديث العنوان الفرعي', { id: toastId });
                          }
                        } catch (error) {
                          console.error('Error updating subtitle:', error);
                          toast.error('فشل في تحديث العنوان الفرعي', { id: toastId });
                        }
                      }}
                      placeholder="العنوان الفرعي"
                    />
                  </div>
                </div>
                {/* معلومات الزر */}
                <div className="flex flex-col gap-2 flex-1">
                  <QuickEditInput
                    value={slide.buttonText}
                    onSubmit={async (value) => {
                      const response = await fetch(`/api/dashboard/hero`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-hero-id': slide._id!
                        },
                        body: JSON.stringify({ buttonText: value }),
                      });
                      if (response.ok) {
                        fetchSlides();
                        toast.success('تم تحديث نص الزر بنجاح');
                      }
                    }}
                    placeholder="نص الزر"
                  />
                  <QuickEditInput
                    value={slide.buttonLink}
                    onSubmit={async (value) => {
                      const response = await fetch(`/api/dashboard/hero`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-hero-id': slide._id!
                        },
                        body: JSON.stringify({ buttonLink: value }),
                      });
                      if (response.ok) {
                        fetchSlides();
                        toast.success('تم تحديث رابط الزر بنجاح');
                      }
                    }}
                    placeholder="رابط الزر"
                  />
                </div>
              </div>
              {/* أزرار التحكم */}
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <StatusToggle
                  checked={slide.isActive}
                  onCheckedChange={async (checked) => {
                    const toastId = toast.loading('جاري تحديث حالة الشريحة...');
                    try {
                      const response = await fetch(`/api/dashboard/hero`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-hero-id': slide._id!
                        },
                        body: JSON.stringify({ isActive: checked }),
                      });
                      if (response.ok) {
                        fetchSlides();
                        toast.success('تم تحديث حالة الشريحة بنجاح', { id: toastId });
                      } else {
                        toast.error('فشل في تحديث حالة الشريحة', { id: toastId });
                      }
                    } catch (error) {
                      console.error('Error updating slide status:', error);
                      toast.error('فشل في تحديث حالة الشريحة', { id: toastId });
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setSlideToDelete(slide._id!);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {slides.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد شرائح متاحة
            </div>
          )}
        </div>
      </div>
      
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="حذف الشريحة"
        description="هل أنت متأكد من حذف هذه الشريحة؟"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!slideToDelete) return;
          
          setIsDeleting(true);
          const toastId = toast.loading('جاري حذف الشريحة...');
          
          try {
            const response = await fetch(`/api/dashboard/hero`, {
              method: 'DELETE',
              headers: { 'x-hero-id': slideToDelete },
            });
            
            if (response.ok) {
              toast.success('تم حذف الشريحة بنجاح', { id: toastId });
              fetchSlides();
            } else {
              toast.error('فشل في حذف الشريحة', { id: toastId });
            }
          } catch (error) {
            console.error('Error deleting slide:', error);
            toast.error('فشل في حذف الشريحة', { id: toastId });
          } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            setSlideToDelete(null);
          }
        }}
      />
    </div>
  );
}