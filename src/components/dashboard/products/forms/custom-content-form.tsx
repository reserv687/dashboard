'use client';

import { useEffect } from 'react';

// Add TypeScript declaration for the window object extension
declare global {
  interface Window {
    customContentFormSubmit?: () => Array<{
      title: string;
      content: string;
    }>;
  }
}
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

const customContentItemSchema = z.object({
  title: z.string()
    .min(3, 'يجب أن يكون العنوان 3 أحرف على الأقل')
    .max(100, 'يجب أن لا يتجاوز العنوان 100 حرف'),
  content: z.string()
    .min(10, 'يجب أن يكون المحتوى 10 أحرف على الأقل')
    .max(1000, 'يجب أن لا يتجاوز المحتوى 1000 حرف'),
});

const customContentFormSchema = z.object({
  customContent: z.array(customContentItemSchema)
    .max(10, 'لا يمكن إضافة أكثر من 10 أقسام'),
});

type CustomContentFormData = z.infer<typeof customContentFormSchema>;

interface CustomContentFormProps {
  data?: {
    customContent?: Array<{
      title: string;
      content: string;
    }>;
  };
  onComplete: (data: CustomContentFormData) => void;
  isSubmitting?: boolean;
}

export function CustomContentForm({ data, onComplete, isSubmitting }: CustomContentFormProps) {
  // Create a ref to store the form instance for external access
  const form = useForm<z.infer<typeof customContentFormSchema>>({
    resolver: zodResolver(customContentFormSchema),
    defaultValues: {
      customContent: data?.customContent || []
    }
  });

  const { fields, append, remove } = useFieldArray({
    name: 'customContent',
    control: form.control,
  });

  // تحديث النموذج عندما تتغير البيانات
  useEffect(() => {
    if (data?.customContent) {
      console.log('CustomContentForm - Updating form with new data:', data.customContent);
      form.reset({
        customContent: data.customContent
      });
    }
  }, [data, form]);

  const onSubmit = (values: CustomContentFormData) => {
    console.log('Custom content form values:', values);
    
    // تنظيف البيانات قبل الإرسال
    const cleanedContent = values.customContent.map(item => ({
      title: item.title.trim(),
      content: item.content.trim()
    }));
    
    onComplete({
      customContent: cleanedContent
    });
  };

  // تحديث النموذج عند تلقي بيانات جديدة - تم إزالة هذا لأنه مكرر للتأثير الأول
  // useEffect(() => {
  //   if (data?.customContent) {
  //     console.log('Setting custom content:', data.customContent);
  //     form.reset({
  //       customContent: data.customContent
  //     });
  //   }
  // }, [data, form]);
  
  // إضافة تأثير لتقديم النموذج تلقائيًا عند النقر على زر النشر أو الحفظ كمسودة
  useEffect(() => {
    // إضافة طريقة للوصول إلى قيم النموذج الحالية من الخارج
    // هذا يسمح للمكون الأب بالحصول على البيانات دون الحاجة إلى تقديم النموذج
    const handleExternalSubmit = () => {
      const values = form.getValues();
      // تنظيف البيانات قبل الإرسال
      const cleanedContent = values.customContent.map(item => ({
        title: item.title?.trim() || '',
        content: item.content?.trim() || ''
      }));
      
      onComplete({
        customContent: cleanedContent
      });
      return cleanedContent;
    };
    
    // إضافة الطريقة إلى النافذة لتمكين الوصول إليها من المكون الأب
    window.customContentFormSubmit = handleExternalSubmit;
    
    // تنظيف عند إلغاء تحميل المكون
    return () => {
      delete window.customContentFormSubmit;
    };
  }, [form, onComplete]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">المحتوى المخصص</h3>
              <p className="text-sm text-muted-foreground">
                أضف محتوى مخصص للمنتج مثل المميزات والمواصفات الإضافية
              </p>
            </div>
            <FormDescription className="text-sm">
              {fields.length} / 10 أقسام
            </FormDescription>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name={`customContent.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>العنوان</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="أدخل عنوان القسم"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`customContent.${index}.content`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المحتوى</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="أدخل محتوى القسم"
                            className="h-32"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف القسم
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => append({ title: '', content: '' })}
              disabled={isSubmitting || fields.length >= 10}
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة قسم جديد
            </Button>
          </div>
        </div>
        {/* تم إخفاء زر الحفظ لأن الحفظ سيتم تلقائيًا عند النقر على زر النشر أو الحفظ كمسودة */}
        <Button type="submit" disabled={isSubmitting} style={{ display: 'none' }}>
          حفظ المحتوى
        </Button>
      </form>
    </Form>
  );
}

