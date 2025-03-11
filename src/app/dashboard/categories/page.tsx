'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CategoriesTable } from '@/app/dashboard/categories/components/categories-table';
import { CategoryTree } from '@/app/dashboard/categories/components/category-tree';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Category } from '@/models/category.model';
import { useCategories } from '@/hooks/use-categories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusToggle } from '@/components/ui/status-toggle';
import { ImageUpload } from '@/components/dashboard/image-upload';

export default function CategoriesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<InstanceType<typeof Category> | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState<string | null>(null); // Track which category image is being uploaded
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    image: null as File | null,
    parentId: '',
    status: true,
  });

  const { categories, isLoading, mutate, pagination } = useCategories(
    currentPage,
    activeTab as 'table' | 'tree'
  );

  const handleUpdate = async (id: string, data: any) => {
    if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      toast.error('معرف الفئة غير صالح');
      return;
    }

    const loadingToast = toast.loading('جاري تحديث الفئة...');
    try {
      const optimisticData = categories.map((cat: InstanceType<typeof Category>) =>
        cat._id === id ? { ...cat, ...data } : cat
      );
      
      mutate({ categories: optimisticData }, false);

      const response = await fetch(`/api/dashboard/categories?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('فشل في تحديث الفئة');

      toast.success('تم تحديث الفئة بنجاح', { id: loadingToast, duration: 3000 });
      await mutate();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('فشل في تحديث الفئة', { id: loadingToast, duration: 3000 });
      await mutate();
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete?._id || !/^[0-9a-fA-F]{24}$/.test(categoryToDelete._id)) {
      toast.error('معرف الفئة غير صالح');
      return;
    }

    const loadingToast = toast.loading('جاري حذف الفئة...');
    try {
      const response = await fetch(`/api/dashboard/categories?id=${categoryToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success('تم حذف الفئة بنجاح', { id: loadingToast, duration: 3000 });
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
      await mutate();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('فشل في حذف الفئة', { id: loadingToast, duration: 3000 });
    }
  };

  // رفع الصورة
  const handleUploadImage = async (file: File): Promise<string> => {
    try {
      setIsUploading('upload'); // Set uploading state for image upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('فشل في رفع الصورة');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('فشل في رفع الصورة');
    } finally {
      setIsUploading(null); // Clear uploading state
    }
  };

  // إضافة فئة جديدة
  const handleAddCategory = async () => {
    try {
      if (!newCategory.name) {
        toast.error('يرجى إدخال اسم الفئة');
        return;
      }

      setIsUploading('new'); // Set uploading state for new category
      const loadingToast = toast.loading('جاري إنشاء الفئة...');

      const formData = new FormData();
      formData.append('name', newCategory.name);
      formData.append('description', newCategory.description || '');
      
      if (newCategory.parentId && newCategory.parentId !== 'none') {
        formData.append('parentId', newCategory.parentId);
      }
      
      if (newCategory.image) {
        formData.append('image', newCategory.image);
      }
      
      formData.append('isActive', String(newCategory.status));

      const response = await fetch('/api/dashboard/categories', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'فشل في إضافة الفئة');
      }

      toast.success('تم إضافة الفئة بنجاح', { id: loadingToast, duration: 3000 });
      setNewCategory({
        name: '',
        description: '',
        image: null,
        parentId: '',
        status: true,
      });
      setIsCreating(false);
      mutate();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في إضافة الفئة', { duration: 3000 });
    } finally {
      setIsUploading(null); // Clear uploading state
    }
  };

  // فلترة الفئات حسب البحث
  const filteredCategories = categories.filter((category: InstanceType<typeof Category>) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // تعديل دالة تبديل حالة النموذج
  const toggleCreating = () => {
    if (isCreating) {
      // إعادة تعيين قيم النموذج عند إغلاقه
      setNewCategory({
        name: '',
        description: '',
        image: null,
        parentId: '',
        status: true,
      });
    }
    setIsCreating(!isCreating);
  };

  const getSubcategoriesCount = (categoryId: string): number => {
    const category = categories.find((c: InstanceType<typeof Category>) => c._id === categoryId);
    return category?.subCategoriesCount || 0;
  };

  const getDeleteConfirmMessage = (category: any) => {
    const subCount = getSubcategoriesCount(category._id);
    if (subCount > 0) {
      return `هل أنت متأكد من حذف "${category.name}"؟ سيتم حذف ${subCount} فئة فرعية تابعة لها.`;
    }
    return `هل أنت متأكد من حذف "${category.name}"؟`;
  };

  return (
    <div className="space-y-6" dir='rtl'>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة الفئات</h1>
       
      </div>

      {/* نموذج إضافة فئة جديدة - تم نقله هنا */}
      {isCreating && (
        <div className="bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-center rounded-md shadow-md">
          <div className="flex flex-1 items-center gap-4">
            {/* صورة التصنيف واسمها */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <ImageUpload
                image={newCategory.image ? URL.createObjectURL(newCategory.image) : null}
                onImageChange={(file) => setNewCategory({ ...newCategory, image: file })}
                onImageRemove={async () => Promise.resolve(setNewCategory({ ...newCategory, image: null }))}
                width="w-16"
                height="h-16"
                isDisabled={isUploading === 'new'}
              />
              <div className="flex flex-col">
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="اسم الفئة"
                  className="text-lg font-semibold"
                />
                <Select
                  value={newCategory.parentId}
                  onValueChange={(value) => setNewCategory({ ...newCategory, parentId: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="اختر الفئة الأب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فئة أب</SelectItem>
                    {categories.map((category: InstanceType<typeof Category>) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* الوصف */}
            <div className="flex flex-col gap-1 flex-1">
              <textarea
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="وصف الفئة"
                className="w-full min-h-[60px] p-2 rounded-md border resize-none"
              />
              <span>0 منتج</span>
            </div>
          </div>
          {/* الحالة وأزرار الإجراءات */}
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <StatusToggle
              checked={newCategory.status}
              onCheckedChange={(checked) => setNewCategory({ ...newCategory, status: checked })}
            />
            <Button onClick={handleAddCategory}>
              إضافة
            </Button>
          </div>
        </div>
      )}

      

      <Tabs dir='rtl' value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-8 gap-4">
          <div className="flex gap-4 items-center">
            <Select value={searchTerm || "all"} onValueChange={(value) => setSearchTerm(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="البحث في الفئات..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {categories.map((category: InstanceType<typeof Category>) => (
                  <SelectItem key={category._id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <TabsList className="absolute left-1/2 transform -translate-x-1/2">
            <TabsTrigger value="table">جدول</TabsTrigger>
            <TabsTrigger value="tree">شجرة</TabsTrigger>
          </TabsList>
          
          <Button onClick={toggleCreating}>
            {isCreating ? 'إلغاء' : 'إضافة فئة جديدة'}
          </Button>
        </div>

        <TabsContent value="table">
          <div className="space-y-4">
            <CategoriesTable
              categories={filteredCategories}
              onUpdate={handleUpdate}
              onDelete={(category) => {
                setCategoryToDelete(category);
                setIsDeleteDialogOpen(true);
              }}
              onAddSubcategory={(parentCategory) => {
                setNewCategory({ ...newCategory, parentId: parentCategory._id });
                setIsCreating(true);
              }}
              uploadImage={handleUploadImage}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
          </div>

          {/* أزرار التنقل بين الصفحات */}
          <div className="mt-4 flex items-center justify-between" dir="rtl">
            <div className="text-sm text-muted-foreground">
              إجمالي الفئات: {pagination?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination?.pages || 1, prev + 1))}
                disabled={currentPage === (pagination?.pages || 1) || isLoading}
              >
                التالي
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                {currentPage} / {pagination?.pages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                السابق
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tree">
          <CategoryTree
            categories={filteredCategories}
            onUpdate={(category) => {
              if (!category?._id) {
                toast.error('Invalid category ID');
                return;
              }
              handleUpdate(category._id, category);
            }}
            onDelete={(category) => {
              if (!category?._id) {
                toast.error('Invalid category ID');
                return;
              }
              setCategoryToDelete(category);
              setIsDeleteDialogOpen(true);
            }}
            onAddSubcategory={(category: InstanceType<typeof Category>) => {
              if (!category?._id) {
                toast.error('Invalid category ID');
                return;
              }
              setNewCategory({ ...newCategory, parentId: category._id });
              setIsCreating(true);
            }}
            expandedCategories={expandedCategories}
            onToggleExpand={(categoryId) => {
              const newExpanded = new Set(expandedCategories);
              if (newExpanded.has(categoryId)) {
                newExpanded.delete(categoryId);
              } else {
                newExpanded.add(categoryId);
              }
              setExpandedCategories(newExpanded);
            }}
            uploadImage={handleUploadImage}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="حذف الفئة"
        description={categoryToDelete ? getDeleteConfirmMessage(categoryToDelete) : ''}
        onConfirm={handleDelete}
      />
    </div>
  );
}
