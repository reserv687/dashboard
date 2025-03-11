'use client';

import { useEffect } from 'react';

// Add TypeScript declaration for the window object extension
declare global {
  interface Window {
    technicalSpecsFormSubmit?: () => TechnicalSpecsFormData;
  }
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

// مخطط التحقق من صحة البيانات
const technicalSpecsSchema = z.object({
  dimensions: z.object({
    length: z.number().min(0).default(0),
    width: z.number().min(0).default(0),
    height: z.number().min(0).default(0),
    unit: z.enum(['cm', 'mm', 'inch', 'meter']).default('cm')
  }).optional(),
  weight: z.object({
    value: z.number().min(0).default(0),
    unit: z.enum(['kg', 'g', 'lb', 'oz']).default('kg')
  }).optional(),
  specifications: z.record(z.string(), z.string()).default({})
});

type TechnicalSpecsFormData = z.infer<typeof technicalSpecsSchema>;

interface TechnicalSpecsFormProps {
  data?: {
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      unit?: 'cm' | 'mm' | 'inch' | 'meter';
    };
    weight?: {
      value?: number;
      unit?: 'kg' | 'g' | 'lb' | 'oz';
    };
    specifications?: Record<string, string>;
  };
  onComplete: (data: TechnicalSpecsFormData) => void;
  isSubmitting?: boolean;
}

export function TechnicalSpecsForm({ data, onComplete, isSubmitting }: TechnicalSpecsFormProps) {
  const [customSpec, setCustomSpec] = useState('');
  const [customValue, setCustomValue] = useState('');

  const form = useForm<TechnicalSpecsFormData>({
    resolver: zodResolver(technicalSpecsSchema),
    defaultValues: {
      dimensions: data?.dimensions || {
        length: 0,
        width: 0,
        height: 0,
        unit: 'cm'
      },
      weight: data?.weight || {
        value: 0,
        unit: 'kg'
      },
      specifications: data?.specifications || {}
    }
  });

  const specifications = form.watch('specifications');

  const handleAddSpec = () => {
    if (customSpec.trim() && customValue.trim()) {
      const specs = { ...specifications };
      specs[customSpec.trim()] = customValue.trim();
      form.setValue('specifications', specs);
      setCustomSpec('');
      setCustomValue('');
    }
  };

  const handleRemoveSpec = (key: string) => {
    const specs = { ...specifications };
    delete specs[key];
    form.setValue('specifications', specs);
  };

  // تحديث قيم النموذج عند تغيير البيانات
  useEffect(() => {
    if (data) {
      form.reset({
        dimensions: {
          length: data.dimensions?.length ?? 0,
          width: data.dimensions?.width ?? 0,
          height: data.dimensions?.height ?? 0,
          unit: data.dimensions?.unit ?? 'cm'
        },
        weight: {
          value: data.weight?.value ?? 0,
          unit: data.weight?.unit ?? 'kg'
        },
        specifications: data.specifications ?? {}
      });
    }
  }, [data, form]);

  const onSubmit = (values: TechnicalSpecsFormData) => {
    console.log('Technical specs form values:', values);
    onComplete(values);
  };
  
  // إضافة تأثير لتقديم النموذج تلقائيًا عند النقر على زر التالي أو السابق
  useEffect(() => {
    // إضافة طريقة للوصول إلى قيم النموذج الحالية من الخارج
    // هذا يسمح للمكون الأب بالحصول على البيانات دون الحاجة إلى تقديم النموذج
    const handleExternalSubmit = () => {
      const values = form.getValues();
      console.log('Technical specs external submit values:', values);
      onComplete(values);
      return values;
    };
    
    // إضافة الطريقة إلى النافذة لتمكين الوصول إليها من المكون الأب
    window.technicalSpecsFormSubmit = handleExternalSubmit;
    
    // تنظيف عند إلغاء تحميل المكون
    return () => {
      delete window.technicalSpecsFormSubmit;
    };
  }, [form, onComplete]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* الأبعاد */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">الأبعاد</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="dimensions.length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الطول</FormLabel>
                  <FormControl>
                    <NumberInput
                      placeholder="الطول"
                      min={0}
                      step={0.01}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dimensions.width"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العرض</FormLabel>
                  <FormControl>
                    <NumberInput
                      placeholder="العرض"
                      min={0}
                      step={0.01}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dimensions.height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الارتفاع</FormLabel>
                  <FormControl>
                    <NumberInput
                      placeholder="الارتفاع"
                      min={0}
                      step={0.01}
                      value={field.value}
                      onValueChange={field.onChange}
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
            name="dimensions.unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>وحدة القياس</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر وحدة القياس" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cm">سنتيمتر</SelectItem>
                    <SelectItem value="mm">ملليمتر</SelectItem>
                    <SelectItem value="inch">إنش</SelectItem>
                    <SelectItem value="meter">متر</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* الوزن */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">الوزن</h3>
          <FormField
            control={form.control}
            name="weight.value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>القيمة</FormLabel>
                <FormControl>
                  <NumberInput
                    placeholder="الوزن"
                    min={0}
                    step={0.01}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weight.unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>وحدة القياس</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر وحدة القياس" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="kg">كيلوجرام</SelectItem>
                    <SelectItem value="g">جرام</SelectItem>
                    <SelectItem value="lb">باوند</SelectItem>
                    <SelectItem value="oz">أونصة</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* المواصفات الفنية */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">المواصفات الفنية</h3>
          
          {/* إضافة مواصفة جديدة */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="اسم المواصفة"
              value={customSpec}
              onChange={(e) => setCustomSpec(e.target.value)}
            />
            <Input
              placeholder="قيمة المواصفة"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
            />
            <Button
              type="button"
              onClick={handleAddSpec}
              className="shrink-0"
            >
              إضافة
            </Button>
          </div>

          {/* عرض المواصفات */}
          <div className="space-y-2">
            {Object.entries(specifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-2 p-2 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{key}</p>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSpec(key)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} style={{ display: 'none' }}>
          حفظ المواصفات
        </Button>
      
      </form>
    </Form>
  );
}
