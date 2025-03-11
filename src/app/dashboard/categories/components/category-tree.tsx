'use client';

import { ChevronLeft, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusToggle } from '@/components/ui/status-toggle';
import { Badge } from '@/components/ui/badge'; // إضافة استيراد Badge
import { useState } from 'react';
import { ImageUpload } from '@/components/dashboard/image-upload';

interface CategoryTreeProps {
  categories: any[];
  onUpdate: (category: any) => void;
  onDelete: (category: any) => void;
  onAddSubcategory: (category: any) => void;
  expandedCategories: Set<string>;
  onToggleExpand: (categoryId: string) => void;
  uploadImage?: (file: File) => Promise<string>;
  isUploading: string | null;
  setIsUploading: (id: string | null) => void;
}

export function CategoryTree({
  categories,
  onUpdate,
  onDelete,
  onAddSubcategory,
  expandedCategories,
  onToggleExpand,
  uploadImage,
  isUploading,
  setIsUploading
}: CategoryTreeProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const handleStatusChange = async (category: any, newStatus: boolean) => {
    setUpdatingStatus(category._id);
    try {
      await onUpdate({ ...category, isActive: newStatus });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // تحسين دالة buildTree لعرض جميع الفئات بشكل صحيح
  const buildTree = (items: any[]): any[] => {
    // إنشاء خريطة للفئات للوصول السريع
    const itemMap = new Map();
    items.forEach(item => {
      itemMap.set(item._id, {
        ...item,
        children: []
      });
    });

    // بناء الشجرة
    const tree: any[] = [];
    items.forEach(item => {
      const mappedItem = itemMap.get(item._id);
      if (item.parentId && itemMap.has(item.parentId)) {
        // إضافة كفئة فرعية
        const parent = itemMap.get(item.parentId);
        parent.children.push(mappedItem);
      } else {
        // إضافة كفئة رئيسية
        tree.push(mappedItem);
      }
    });

    return tree;
  };

  // تحسين دالة renderCategory
  const renderCategory = (category: any, level = 0) => {
    const isExpanded = expandedCategories.has(category._id);
    const hasChildren = category.children?.length > 0;

    return (
      <div key={category._id} className="category-tree-item">
        <div className={`bg-card/90 backdrop-blur-md p-4 rounded-md shadow-md mb-2 
          ${category.isMainCategory ? 'border-r-4 border-primary' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleExpand(category._id)}
                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="flex items-center gap-3">
                {uploadImage && (
                  <ImageUpload
                    image={category.image}
                    onImageChange={async (file) => {
                      if (file) {
                        setIsUploading(category._id);
                        try {
                          const imageUrl = await uploadImage(file);
                          onUpdate({ ...category, image: imageUrl });
                        } finally {
                          setIsUploading(null);
                        }
                      }
                    }}
                    onImageRemove={async () => {
                      setIsUploading(category._id);
                      try {
                        await onUpdate({ ...category, image: null });
                      } finally {
                        setIsUploading(null);
                      }
                    }}
                    width="w-16"
                    height="h-16"
                    isDisabled={isUploading === category._id}
                  />
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    {category.isMainCategory ? (
                      <Badge variant="default" className="text-xs">رئيسية</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">فرعية</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground mt-1">
                    {category.subCategoriesCount > 0 && (
                      <span className="text-xs">
                        {category.subCategoriesCount} فئة فرعية
                      </span>
                    )}
                    <span className="text-xs">
                      {category.productsCount || 0} منتج
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusToggle
                checked={category.isActive}
                onCheckedChange={(checked) => handleStatusChange(category, checked)}
                disabled={updatingStatus === category._id}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddSubcategory(category)}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(category)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="category-children mr-4">
            {category.children.map((child: any) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // بناء وعرض الشجرة
  const tree = buildTree(categories);

  return (
    <div className="space-y-2">
      {tree.map(category => renderCategory(category))}
    </div>
  );
}
