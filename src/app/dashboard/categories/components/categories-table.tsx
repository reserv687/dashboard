'use client';

import { useState } from 'react';
import { Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickEditInput } from '@/components/dashboard/quick-edit-input';
import { ImageUpload } from '@/components/dashboard/image-upload';
import type { Category } from '@/models/category.model';
import { StatusToggle } from '@/components/ui/status-toggle';

interface CategoriesTableProps {
  categories: InstanceType<typeof Category>[];
  onUpdate: (id: string, data: Partial<InstanceType<typeof Category>>) => Promise<void>;
  onDelete: (category: InstanceType<typeof Category>) => void;
  onAddSubcategory: (category: InstanceType<typeof Category>) => void;
  uploadImage: (file: File) => Promise<string>;
  isUploading: string | null;
  setIsUploading: (id: string | null) => void;
}

export function CategoriesTable({
  categories,
  onUpdate,
  onDelete,
  onAddSubcategory,
  uploadImage,
  isUploading,
  setIsUploading
}: CategoriesTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdate = async (id: string, data: Partial<InstanceType<typeof Category>>) => {
    try {
      setUpdatingId(id);
      await onUpdate(id, data);
    } finally { 
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {categories?.map((category) => (
        <div
          key={category._id}
          className={`bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-center rounded-md shadow-md ${
            updatingId === category._id ? 'opacity-50' : ''
          } ${category.isMainCategory ? 'border-r-4 border-primary' : ''}`}
        >
          <div className="flex flex-1 items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <ImageUpload
                image={category.image}
                onImageChange={async (file) => {
                  if (file) {
                    setIsUploading(category._id);
                    try {
                      const imageUrl = await uploadImage(file);
                      handleUpdate(category._id, { image: imageUrl });
                    } finally {
                      setIsUploading(null);
                    }
                  }
                }}
                onImageRemove={async () => {
                  setIsUploading(category._id);
                  try {
                    await handleUpdate(category._id, { image: null });
                  } finally {
                    setIsUploading(null);
                  }
                }}
                width="w-16"
                height="h-16"
                isDisabled={isUploading === category._id}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <QuickEditInput
                    value={category.name}
                    onSubmit={async (newValue) =>
                      handleUpdate(category._id, { name: newValue.toString() })
                    }
                    disabled={updatingId === category._id}
                    className="text-lg font-semibold"
                  />
                  {category.isMainCategory ? (
                    <Badge variant="default">فئة رئيسية</Badge>
                  ) : (
                    <Badge variant="secondary">فئة فرعية</Badge>
                  )}
                </div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  {category.subCategoriesCount > 0 && (
                    <Badge variant="outline">
                      {category.subCategoriesCount} فئة فرعية
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {category.productsCount || 0} منتج
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <QuickEditInput
                value={category.description || ''}
                onSubmit={async (newValue) =>
                  handleUpdate(category._id, { description: newValue.toString() })
                }
                disabled={updatingId === category._id}
                placeholder="لا يوجد وصف"
              />
              <span>{category.productsCount || 0} منتج</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <StatusToggle
              checked={category.isActive}
              onCheckedChange={(checked) => handleUpdate(category._id, { isActive: checked })}
              disabled={updatingId === category._id}
            />
            <div className="flex items-center gap-2">
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
      ))}
    </div>
  );
}
