'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import Image from 'next/image';

// مكون رفع الصور
interface ImageUploadProps {
  value?: string[];
  disabled?: boolean;
  onChange: (urls: string[]) => void;
  onRemove: (url: string) => void;
  maxFiles?: number;
  className?: string;
  width?: string;
  height?: string;
}

export function ImageUpload({ 
  value = [],
  disabled = false,
  onChange,
  onRemove,
  maxFiles = 1,
  className = '',
  width = 'w-16',
  height = 'h-16'
}: ImageUploadProps) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {value.map(url => (
        <div key={url} className={`relative ${width} ${height} rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border transition-all duration-200 group ${className}`}>
          <Image src={url} alt="الصورة" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" width={64} height={64} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
            <div className="flex gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-md">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md bg-destructive/10 hover:bg-destructive/20" onClick={() => onRemove(url)} disabled={disabled}>
                <X className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      {value.length < maxFiles && (
        <label className={`cursor-pointer ${width} ${height} rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex items-center justify-center transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => onChange([...value, reader.result as string]);
                reader.readAsDataURL(file);
              }
            }}
            disabled={disabled}
          />
          <Plus className="w-6 h-6 text-muted-foreground" />
        </label>
      )}
    </div>
  );
}

// تعريف المخططات باستخدام zod
const imageSchema = z.object({
  url: z.string().min(1, 'الرابط مطلوب'),
  alt: z.string().min(1, 'وصف الصورة مطلوب')
});
const imagesFormSchema = z.object({
  images: z.array(imageSchema).min(1, 'يجب إضافة صورة واحدة على الأقل')
});
type ImagesFormValues = z.infer<typeof imagesFormSchema>;

interface ImagesFormProps {
  data?: { images?: { url: string; alt: string; isPrimary: boolean }[] };
  productName?: string;
  onComplete: (data: ImagesFormValues) => void;
  isSubmitting?: boolean;
}

const handleImageUpload = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'products');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

// مكون إدارة صور المنتج
export function ImagesForm({ data, productName = '', onComplete, isSubmitting = false }: ImagesFormProps) {
  const form = useForm<ImagesFormValues>({
    resolver: zodResolver(imagesFormSchema),
    defaultValues: { images: data?.images || [] }
  });

  const { fields, append, remove, swap } = useFieldArray({ name: 'images', control: form.control });

  useEffect(() => {
    if (data?.images) form.reset({ images: data.images });
  }, [data, form]);

  const updateImageDescriptions = () => {
    fields.forEach((_, index) => {
      const currentAlt = form.getValues(`images.${index}.alt`);
      if (currentAlt?.match(/^صورة \d+/)) {
        const newAlt = productName ? `صورة ${index + 1} - ${productName}` : `صورة ${index + 1}`;
        form.setValue(`images.${index}.alt`, newAlt);
      }
    });
  };

  const handleImageChange = async (file: File) => {
    const imageUrl = await handleImageUpload(file);
    if (imageUrl) {
      const imageNumber = fields.length + 1;
      append({ 
        url: imageUrl, 
        alt: productName ? `صورة ${imageNumber} - ${productName}` : `صورة ${imageNumber}`
      });
    }
  };

  const handleImageRemove = (url: string) => {
    const index = fields.findIndex(field => field.url === url);
    if (index !== -1) {
      remove(index);
      setTimeout(updateImageDescriptions, 0);
    }
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < fields.length) {
      swap(index, newIndex);
      setTimeout(updateImageDescriptions, 0);
    }
  };

  const onSubmit = async (values: ImagesFormValues) => {
    const isValid = await form.trigger();
    if (isValid) {
      onComplete(values);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">صور المنتج</h3>
            <p className="text-sm text-muted-foreground">أضف صور المنتج. يمكنك إضافة حتى 10 صور.</p>
          </div>
          <FormDescription className="text-sm">{fields.length} / 10 صور</FormDescription>
        </div>
        <Card className="p-6">
          <div className="space-y-6">
            {fields.length < 10 && (
              <label className="cursor-pointer w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex items-center justify-center transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleImageChange(file);
                    }
                  }}
                  disabled={isSubmitting}
                />
                <Plus className="w-8 h-8 text-muted-foreground" />
              </label>
            )}
            {fields.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">الصور المضافة</h4>
                <div className="grid gap-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => moveImage(index, 'up')} disabled={isSubmitting || index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{index + 1}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => moveImage(index, 'down')} disabled={isSubmitting || index === fields.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border">
                        <Image src={field.url} alt={form.watch(`images.${index}.alt`) || ''} className="h-full w-full object-cover" width={80} height={80} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <FormField
                          control={form.control}
                          name={`images.${index}.alt`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="وصف الصورة" className="h-9" disabled={isSubmitting} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" size="sm" className="h-8 hover:text-destructive" onClick={() => handleImageRemove(field.url)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </form>
    </Form>
  );
}
