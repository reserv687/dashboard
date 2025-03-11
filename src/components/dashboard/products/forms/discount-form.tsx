'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatCurrency } from '@/lib/utils/currency';
import { useEffect } from 'react';

import { NumberInput } from '@/components/ui/number-input';

// Removed unused interface MaxMessageArgs

interface DiscountFormRefineData {
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
}

const discountFormSchema = z.object({
  isActive: z.boolean().default(false),
  type: z.enum(['fixed', 'percentage']),
  value: z
    .number()
    .min(0, 'يجب أن تكون قيمة الخصم أكبر من أو تساوي 0')
    .max(100, 'يجب أن تكون نسبة الخصم أقل من أو تساوي 100%'),
  startDate: z
    .union([z.string(), z.date()])
    .transform((val: string | Date) => {
      if (typeof val === 'string') return new Date(val);
      return val;
    })
    .optional(),
  endDate: z
    .union([z.string(), z.date()])
    .transform((val: string | Date) => {
      if (typeof val === 'string') return new Date(val);
      return val;
    })
    .optional(),
}).refine(
  (data: DiscountFormRefineData) => {
    if (data.isActive) {
      if (!data.startDate || !data.endDate) {
        return false;
      }
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية',
    path: ['endDate'],
  }
);

type DiscountFormData = z.infer<typeof discountFormSchema>;

interface DiscountFormProps {
  data?: {
    discount?: {
      isActive: boolean;
      type: 'fixed' | 'percentage';
      value: number;
      startDate?: Date;
      endDate?: Date;
    };
  };
  onComplete: (data: DiscountFormData) => void;
  productPrice?: number;
}

export function DiscountForm({ data = {}, onComplete, productPrice = 0 }: DiscountFormProps) {
  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      isActive: data.discount?.isActive ?? false,
      type: data.discount?.type ?? 'percentage',
      value: data.discount?.value ?? 0,
      startDate: data.discount?.startDate,
      endDate: data.discount?.endDate,
    }
  });

  const isDiscountActive = form.watch('isActive');
  const discountType = form.watch('type');
  const discountValue = form.watch('value');

  // إضافة دالة للحصول على بيانات الخصم مباشرة
  useEffect(() => {
    // تعريف دالة عالمية للحصول على بيانات الخصم
    window.discountFormSubmit = () => {
      const values = form.getValues();
      return {
        discount: {
          isActive: values.isActive,
          type: values.type,
          value: Number(values.value),
          startDate: values.startDate,
          endDate: values.endDate
        }
      };
    };

    // تنظيف الدالة عند إزالة المكون
    return () => {
      delete window.discountFormSubmit;
    };
  }, [form]);

  // حساب السعر بعد الخصم
  const calculateFinalPrice = () => {
    if (!isDiscountActive || !discountValue || !productPrice) return productPrice;

    if (discountType === 'percentage') {
      const discountAmount = productPrice * (discountValue / 100);
      return Math.max(0, productPrice - discountAmount);
    }

    return Math.max(0, productPrice - discountValue);
  };

  const finalPrice = calculateFinalPrice();

  // عرض معاينة الخصم
  const renderDiscountPreview = () => {
    if (!isDiscountActive || !productPrice) return null;

    const discountAmount = discountType === 'percentage'
      ? productPrice * (discountValue / 100)
      : discountValue;

    return (
      <div className="mt-4 p-4 bg-muted rounded-lg">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>السعر الأصلي:</span>
            <span className="font-medium">{formatCurrency(productPrice)}</span>
          </div>
          <div className="flex justify-between text-destructive">
            <span>قيمة الخصم:</span>
            <span className="font-medium">- {formatCurrency(discountAmount)}</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>السعر النهائي:</span>
            <span>{formatCurrency(finalPrice)}</span>
          </div>
        </div>
      </div>
    );
  };

  const onSubmit = (values: DiscountFormData) => {
    // تنسيق البيانات قبل إرسالها
    onComplete({
      isActive: values.isActive,
      type: values.type,
      value: Number(values.value),
      startDate: values.startDate,
      endDate: values.endDate
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">تفعيل الخصم</FormLabel>
                      <FormDescription>
                        عند التفعيل، سيتم تطبيق الخصم على المنتج
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {isDiscountActive && (
              <div className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الخصم</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع الخصم" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">قيمة ثابتة</SelectItem>
                          <SelectItem value="percentage">نسبة مئوية</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {discountType === 'fixed'
                          ? 'قيمة ثابتة تخصم من سعر المنتج'
                          : 'نسبة مئوية تخصم من سعر المنتج'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>قيمة الخصم</FormLabel>
                      <FormControl>
                        <NumberInput
                          placeholder="قيمة الخصم"
                          min={0}
                          max={discountType === 'percentage' ? 100 : undefined}
                          step={0.01}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {renderDiscountPreview()}

                <div className="space-y-4">
                  <div className="font-medium">فترة الخصم</div>
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>تاريخ بداية ونهاية الخصم</FormLabel>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DateRangePicker
                            startValue={field.value}
                            endValue={form.watch('endDate')}
                            onStartChange={(date) => {
                              field.onChange(date);
                              form.trigger('endDate');
                            }}
                            onEndChange={(date) => {
                              form.setValue('endDate', new Date(date));
                              form.trigger('endDate');
                            }}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {(form.formState.errors.startDate || form.formState.errors.endDate) && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.startDate?.message || form.formState.errors.endDate?.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

// Add TypeScript interface for the global window object
declare global {
  interface Window {
    discountFormSubmit: () => { discount: { isActive: boolean; type: string; value: number; startDate?: Date; endDate?: Date } };
  }
}
