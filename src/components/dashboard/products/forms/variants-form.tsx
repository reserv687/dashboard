'use client';

import { useEffect, useCallback } from 'react';
import { useFieldArray, useForm, useWatch, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus } from 'lucide-react';
import * as z from 'zod';

import { AttributeForm } from './variants/attribute-form';
import { VariantsTable } from './variants/variants-table';

// مخططات التحقق باستخدام zod
const attributeValueSchema = z.object({
  label: z.string().min(1, 'اسم القيمة مطلوب'),
  code: z.string().optional().default('')
});
const attributeSchema = z.object({
  name: z.string().min(1, 'اسم المتغير مطلوب'),
  type: z.enum(['color', 'custom']),
  values: z.array(attributeValueSchema).min(1, 'يجب إضافة قيمة واحدة على الأقل'),
  isRequired: z.boolean().default(false)
});
const variantSchema = z.object({
  combination: z.record(z.string()),
  price: z.coerce.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي 0'),
  stock: z.coerce.number().min(0, 'المخزون يجب أن يكون أكبر من أو يساوي 0'),
  sku: z.string().optional(),       // Make optional as it's generated server-side
  qrCode: z.string().optional(),    // Make optional as it's generated server-side
  image: z.object({ url: z.string(), alt: z.string() }).optional().nullable(),
  isActive: z.boolean().default(true)
});
const productOptionsFormSchema = z.object({
  attributes: z.array(attributeSchema),
  variants: z.array(variantSchema)
});
export type ProductOptionsFormValues = z.infer<typeof productOptionsFormSchema>;

interface ProductOptionsFormProps {
  data?: {
    attributes?: Array<{ name: string; type: 'color' | 'custom'; values: Array<{ label: string; code?: string }>; isRequired: boolean }>;
    variants?: Array<{ combination: Record<string, string>; price: number; stock: number; sku?: string; barcode?: string; image?: { url: string; alt: string }; isActive?: boolean }>;
  };
  onComplete: (data: ProductOptionsFormValues) => void;
  isSubmitting?: boolean;
}

export function ProductOptionsForm({ data, onComplete }: ProductOptionsFormProps) {
  const form: UseFormReturn<ProductOptionsFormValues> = useForm<ProductOptionsFormValues>({
    resolver: zodResolver(productOptionsFormSchema),
    defaultValues: { attributes: data?.attributes || [], variants: data?.variants || [] }
  });

  const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } = useFieldArray({ name: 'attributes', control: form.control });
  const { fields: variantFields, remove: removeVariant } = useFieldArray({ name: 'variants', control: form.control });

  useEffect(() => {
    if (data) form.reset({ attributes: data.attributes || [], variants: data.variants || [] });
  }, [data, form]);

  // استخدام useWatch لمراقبة تغييرات السمات وتحديث المتغيرات تلقائيًا
  const attributes = useWatch({ control: form.control, name: 'attributes' });
  const generateVariants = useCallback((attrs: any[]) => {
    const validAttrs = attrs.filter(a => a.name && a.values?.length);
    if (!validAttrs.length) return form.setValue('variants', []);
    const combinations = validAttrs.reduce(
      (acc, { name, values }) => acc.flatMap((comb: Record<string, string>) => values.map((v: any) => ({ ...comb, [name]: v.label }))),
      [{}]
    );
    const current = form.getValues('variants') || [];
    const newVariants = combinations.map((comb: Record<string, string>) =>
      current.find((v: any) => Object.keys(comb).every(key => v.combination[key] === comb[key])) || {
        combination: comb,
        price: 0,
        stock: 0,
        sku: '',
        barcode: '',
        image: null,
        isActive: true
      }
    );
    form.setValue('variants', newVariants);
  }, [form]);

  useEffect(() => {
    generateVariants(attributes || []);
  }, [attributes, generateVariants]);

  const onSubmit = (values: ProductOptionsFormValues) => onComplete(values);
  const addAttribute = (type: 'color' | 'custom') => {
    appendAttribute({
      name: '',
      type,
      values: [{ label: '', code: type === 'color' ? '#000000' : '' }],
      isRequired: false
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>خيارات المنتج</CardTitle>
              <CardDescription>أضف خيارات للمنتج مثل الألوان والمقاسات وغيرها</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addAttribute('custom')}>
                <Plus className="w-4 h-4 ml-2" /> إضافة خاصية
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addAttribute('color')}>
                <Plus className="w-4 h-4 ml-2" /> إضافة لون
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {attributeFields.map((field, index) => (
              <AttributeForm
                key={field.id}
                form={form}
                index={index}
                onRemove={() => removeAttribute(index)}
                onAddValue={() => {
                  const type = form.getValues(`attributes.${index}.type`);
                  const current = form.getValues(`attributes.${index}.values`) || [];
                  form.setValue(`attributes.${index}.values`, [...current, { label: '', code: type === 'color' ? '#000000' : '' }]);
                }}
                onRemoveValue={(valueIndex) => {
                  const current = form.getValues(`attributes.${index}.values`);
                  form.setValue(`attributes.${index}.values`, current.filter((_: any, i: number) => i !== valueIndex));
                }}
              />
            ))}
          </CardContent>
        </Card>
        {attributes?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>توليفات المنتج</CardTitle>
              <CardDescription>قم بتعيين السعر والمخزون لكل توليفة</CardDescription>
            </CardHeader>
            <CardContent>
              {form.getValues('variants')?.length ? (
                <VariantsTable 
                  form={form} 
                  variants={variantFields} 
                  onRemoveVariant={removeVariant} 
                />
              ) : (
                <Alert>
                  <AlertDescription>لم يتم إنشاء أي متغيرات بعد. أضف قيم للسمات وسيتم إنشاء المتغيرات تلقائياً.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}
