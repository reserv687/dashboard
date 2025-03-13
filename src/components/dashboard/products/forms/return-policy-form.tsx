'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { NumberInput } from '@/components/ui/number-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const returnPolicySchema = z.object({
  replacementPeriod: z.number()
    .min(0, 'يجب أن تكون المدة 0 أو أكثر')
    .max(365, 'الحد الأقصى 365 يوم'),
  refundPeriod: z.number()
    .min(0, 'يجب أن تكون المدة 0 أو أكثر')
    .max(365, 'الحد الأقصى 365 يوم'),
});

type ReturnPolicyValues = z.infer<typeof returnPolicySchema>;

interface ReturnPolicyFormProps {
  data?: ReturnPolicyValues;
  onComplete: (data: ReturnPolicyValues) => void;
}

export function ReturnPolicyForm({ data, onComplete }: ReturnPolicyFormProps) {
  const form = useForm<ReturnPolicyValues>({
    resolver: zodResolver(returnPolicySchema),
    defaultValues: {
      replacementPeriod: data?.replacementPeriod ?? 7,
      refundPeriod: data?.refundPeriod ?? 14,
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        replacementPeriod: data.replacementPeriod,
        refundPeriod: data.refundPeriod
      });
    }
  }, [data, form]);

  const handleSubmit = (values: ReturnPolicyValues) => {
    console.log('ReturnPolicyForm - Submitting values:', values);
    onComplete(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>سياسة الاسترجاع والاستبدال</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="replacementPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة الاستبدال (بالأيام)</FormLabel>
                  <FormControl>
                    <NumberInput
                      placeholder="مدة الاستبدال"
                      min={0}
                      max={365}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    حدد عدد الأيام المسموح خلالها باستبدال المنتج. اتركها 0 لعدم السماح بالاستبدال
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="refundPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة الاسترجاع (بالأيام)</FormLabel>
                  <FormControl>
                    <NumberInput
                      placeholder="مدة الاسترجاع"
                      min={0}
                      max={365}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    حدد عدد الأيام المسموح خلالها باسترجاع المنتج. اتركها 0 لعدم السماح بالاسترجاع
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
