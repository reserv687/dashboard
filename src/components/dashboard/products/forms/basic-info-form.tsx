'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import slugify from 'slugify';
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CategorySelect } from '@/components/dashboard/categories/category-select';
import { BrandSelect } from '@/components/dashboard/brands/brand-select';
import { CountrySelect } from '@/components/dashboard/brands/country-select';
import { NumberInput } from '@/components/ui/number-input';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const basicInfoSchema = z.object({
  name: z.string()
    .min(3, 'يجب أن يكون اسم المنتج 3 أحرف على الأقل')
    .max(100, 'يجب أن لا يتجاوز اسم المنتج 100 حرف'),
  slug: z.string().optional(),
  description: z.string()
    .min(10, 'يجب أن يكون الوصف 10 أحرف على الأقل')
    .max(2000, 'يجب أن لا يتجاوز الوصف 2000 حرف'),
  price: z.coerce.number({
    required_error: 'السعر مطلوب',
    invalid_type_error: 'يجب أن يكون السعر رقماً',
  })
    .min(0, 'يجب أن يكون السعر أكبر من أو يساوي 0'),
  stock: z.coerce.number()
    .min(0, 'يجب أن تكون الكمية أكبر من أو تساوي 0')
    .default(0),
  brand: z.string().optional(),
  category: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  sku: z.string().optional(),
  customFields: z.array(
    z.object({
      label: z.string().min(1, 'عنوان الحقل مطلوب'),
      value: z.string().min(1, 'قيمة الحقل مطلوبة')
    })
  ).optional(),
  isFeatured: z.boolean().default(false),
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

interface BasicInfoFormProps {
  data?: Partial<BasicInfoFormValues>;
  onComplete: (data: BasicInfoFormValues) => void;
  isSubmitting?: boolean;
}

export function BasicInfoForm({ 
  data, 
  onComplete, 
  isSubmitting 
}: BasicInfoFormProps) {
  console.log('BasicInfoForm - Received data:', data);

  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: data?.name || '',
      description: data?.description || '',
      price: data?.price || 0,
      stock: data?.stock || 0,
      category: data?.category || '',
      brand: data?.brand || '',
      countryOfOrigin: data?.countryOfOrigin || '',
      sku: data?.sku || '',
      customFields: data?.customFields || [],
      isFeatured: data?.isFeatured || false
    }
  });

  const [customFields, setCustomFields] = useState<Array<{label: string; value: string}>>(
    data?.customFields || []
  );

  const addCustomField = () => {
    setCustomFields([...customFields, { label: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, key: 'label' | 'value', value: string) => {
    const newFields = [...customFields];
    newFields[index][key] = value;
    setCustomFields(newFields);
    form.setValue('customFields', newFields);
  };

  // تحديث قيم النموذج عند تغيير البيانات
  useEffect(() => {
    if (data) {
      console.log('BasicInfoForm - Updating form with data:', data);
      form.reset(data, {
        keepDefaultValues: true,
        keepDirty: false,
        keepErrors: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false
      });
      console.log('BasicInfoForm - Form values after update:', form.getValues());
    }
  }, [data, form]);

  // توليد slug تلقائياً عند تغيير اسم المنتج
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (name) {
      const generatedSlug = slugify(name, {
        lower: true,
        strict: true,
        locale: 'ar'
      });
      form.setValue('slug', generatedSlug);
    }
  };

  const onSubmit = (values: BasicInfoFormValues) => {
    console.log('BasicInfoForm - Is Featured:', values.isFeatured);
    console.log('BasicInfoForm - Form submitted with values:', values);
    onComplete(values);
  };

  const brandValue = form.watch('brand');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم المنتج</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleNameChange(e);
                  }}
                  placeholder="أدخل اسم المنتج"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الرابط</FormLabel>
              <FormControl>
                <Input {...field} placeholder="سيتم توليده تلقائياً" disabled={isSubmitting} />
              </FormControl>
              <FormDescription>
                سيتم استخدام هذا الرابط في URL المنتج
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>وصف المنتج</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="أدخل وصف المنتج"
                  className="h-32"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>السعر</FormLabel>
                <FormControl>
                  <NumberInput
                    placeholder="السعر"
                    min={0}
                    step={0.01}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المخزون</FormLabel>
                <FormControl>
                  <NumberInput
                    placeholder="المخزون"
                    min={0}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العلامة التجارية (اختياري)</FormLabel>
                <FormControl>
                  <BrandSelect
                    value={field.value || ''}
                    onChange={(value) => {
                      field.onChange(value);
                      form.setValue('countryOfOrigin', '');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الفئة (اختياري)</FormLabel>
                <FormControl>
                  <CategorySelect
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="countryOfOrigin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>بلد المنشأ (اختياري)</FormLabel>
              <FormControl>
                <CountrySelect
                  value={field.value}
                  onChange={field.onChange}
                  brandId={brandValue}
                  disabled={isSubmitting || !brandValue}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU (اختياري)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="سيتم إنشاؤه تلقائياً إذا تُرك فارغاً"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                اتركه فارغاً للإنشاء التلقائي، أو أدخل SKU مخصص
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label className="text-base font-medium">منتج مميز</Label>
            <p className="text-sm text-muted-foreground">
              تفعيل هذا الخيار سيجعل المنتج يظهر في قسم المنتجات المميزة
            </p>
          </div>
          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      console.log('Switch changed to:', checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">الحقول المخصصة</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomField}
            >
              إضافة حقل
            </Button>
          </div>
          
          {customFields.map((field, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="flex-1">
                <Input
                  placeholder="عنوان الحقل (مثل: موديل الهاتف)"
                  value={field.label}
                  onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="القيمة"
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeCustomField(index)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </form>
    </Form>
  );
}
