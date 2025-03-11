'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
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
import { StatusToggle } from '@/components/ui/status-toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// مخطط قواعد الشحن
const shippingRuleSchema = z.object({
  type: z.enum(['weight', 'price', 'distance']),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  additionalCost: z.number().min(0, 'يجب أن تكون التكلفة الإضافية أكبر من أو تساوي 0'),
});

// مخطط طريقة الشحن
const shippingFormSchema = z.object({
  name: z.string().min(1, 'يجب إدخال اسم طريقة الشحن'),
  description: z.string().optional(),
  baseCost: z.number().min(0, 'يجب أن تكون التكلفة الأساسية أكبر من أو تساوي 0'),
  minCost: z.number().optional(),
  maxCost: z.number().optional(),
  estimatedDeliveryMin: z.number().min(1, 'يجب أن يكون الحد الأدنى لمدة التوصيل يوم واحد على الأقل'),
  estimatedDeliveryMax: z.number().min(1, 'يجب أن يكون الحد الأقصى لمدة التوصيل يوم واحد على الأقل'),
  rules: z.array(shippingRuleSchema),
  isActive: z.boolean(),
})
  .refine(
    (data) => (data.minCost && data.maxCost ? data.minCost <= data.maxCost : true),
    { message: 'يجب أن يكون الحد الأدنى للتكلفة أقل من أو يساوي الحد الأقصى', path: ['minCost'] }
  )
  .refine(
    (data) => data.estimatedDeliveryMin <= data.estimatedDeliveryMax,
    { message: 'يجب أن يكون الحد الأدنى لمدة التوصيل أقل من أو يساوي الحد الأقصى', path: ['estimatedDeliveryMin'] }
  )
  .refine(
    (data) =>
      data.rules.every((rule) => !(rule.minValue && rule.maxValue && rule.minValue > rule.maxValue)),
    { message: 'يجب أن يكون الحد الأدنى للقاعدة أقل من أو يساوي الحد الأقصى', path: ['rules'] }
  );

type ShippingFormValues = z.infer<typeof shippingFormSchema>;

interface ShippingFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>;
}

export function ShippingForm({ initialData, onSubmit }: ShippingFormProps) {
  const router = useRouter();
  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      baseCost: initialData?.baseCost || 0,
      minCost: initialData?.minCost,
      maxCost: initialData?.maxCost,
      estimatedDeliveryMin: initialData?.estimatedDeliveryMin || 1,
      estimatedDeliveryMax: initialData?.estimatedDeliveryMax || 3,
      rules: initialData?.rules || [],
      isActive: initialData?.isActive ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'rules' });

  const handleSubmit = async (data: ShippingFormValues) => {
    try {
      const result = await onSubmit(data);
      
      if (!result.success) {
        throw new Error(result.error || 'حدث خطأ أثناء حفظ طريقة الشحن');
      }
      
      toast.success(initialData ? 'تم تحديث طريقة الشحن بنجاح' : 'تم إضافة طريقة الشحن بنجاح');
      router.push('/dashboard/shipping');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ طريقة الشحن');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FieldInput control={form.control} name="name" label="اسم طريقة الشحن" />
        <FieldInput
          control={form.control}
          name="description"
          label="الوصف"
          description="وصف اختياري لتوضيح تفاصيل طريقة الشحن"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FieldInput
            control={form.control}
            name="baseCost"
            label="التكلفة الأساسية"
            type="number"
            parse={(v) => (v ? Number(v) : undefined)}
          />
          <FieldInput
            control={form.control}
            name="minCost"
            label="الحد الأدنى للتكلفة (اختياري)"
            type="number"
            parse={(v) => (v ? Number(v) : undefined)}
          />
          <FieldInput
            control={form.control}
            name="maxCost"
            label="الحد الأقصى للتكلفة (اختياري)"
            type="number"
            parse={(v) => (v ? Number(v) : undefined)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldInput
            control={form.control}
            name="estimatedDeliveryMin"
            label="الحد الأدنى لمدة التوصيل (بالأيام)"
            type="number"
            parse={(v) => (v ? Number(v) : undefined)}
          />
          <FieldInput
            control={form.control}
            name="estimatedDeliveryMax"
            label="الحد الأقصى لمدة التوصيل (بالأيام)"
            type="number"
            parse={(v) => (v ? Number(v) : undefined)}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">قواعد الشحن</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ type: 'weight', additionalCost: 0 })}
            >
              <Plus className="w-4 h-4 ml-2" /> إضافة قاعدة
            </Button>
          </div>
          {fields.map((field, index) => (
            <RuleCard key={field.id} index={index} control={form.control} remove={remove} />
          ))}
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 rounded-md border p-4">
              <div className="space-y-1">
                <FormLabel>تفعيل طريقة الشحن</FormLabel>
                <FormDescription>سيتم عرض طريقة الشحن للعملاء عند تفعيلها</FormDescription>
                <FormControl>
                  <StatusToggle
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="mr-auto">
          {initialData ? 'تحديث' : 'إضافة'} طريقة الشحن
        </Button>
      </form>
    </Form>
  );
}

interface FieldInputProps {
  control: any;
  name: string;
  label: string;
  type?: string;
  description?: string;
  parse?: (value: string) => any;
}

const FieldInput = ({
  control,
  name,
  label,
  type = 'text',
  description,
  parse = (v: string) => v,
}: FieldInputProps) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input
            type={type}
            {...field}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(parse(e.target.value))}
          />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    )}
  />
);

interface RuleCardProps {
  index: number;
  control: any;
  remove: (index: number) => void;
}

const RuleCard = ({ index, control, remove }: RuleCardProps) => (
  <Card>
    <CardContent className="pt-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name={`rules.${index}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع القاعدة</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع القاعدة" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="weight">الوزن</SelectItem>
                  <SelectItem value="price">السعر</SelectItem>
                  <SelectItem value="distance">المسافة</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FieldInput
          control={control}
          name={`rules.${index}.additionalCost`}
          label="التكلفة الإضافية"
          type="number"
          parse={(v) => (v ? Number(v) : undefined)}
        />
        <FieldInput
          control={control}
          name={`rules.${index}.minValue`}
          label="الحد الأدنى (اختياري)"
          type="number"
          parse={(v) => (v ? Number(v) : undefined)}
        />
        <FieldInput
          control={control}
          name={`rules.${index}.maxValue`}
          label="الحد الأقصى (اختياري)"
          type="number"
          parse={(v) => (v ? Number(v) : undefined)}
        />
      </div>
      <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={() => remove(index)}>
        <Trash2 className="w-4 h-4 ml-2" /> حذف القاعدة
      </Button>
    </CardContent>
  </Card>
);
