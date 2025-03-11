'use client';

import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import { ProductOptionsFormValues } from '../variants-form';

interface AttributeFormProps {
  form: UseFormReturn<ProductOptionsFormValues>;
  index: number;
  onRemove: () => void;
  onAddValue: () => void;
  onRemoveValue: (valueIndex: number) => void;
}

export function AttributeForm({
  form,
  index,
  onRemove,
  onAddValue,
  onRemoveValue
}: AttributeFormProps) {
  return (
    <Card className="relative">
      <CardContent className="pt-6">
        <div className="absolute top-4 left-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 transition-colors duration-200 rounded-full"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name={`attributes.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الخاصية</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: اللون، المقاس" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`attributes.${index}.type`}
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>نوع الخاصية</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === 'color' ? 'default' : 'outline'}
                        className={`flex-1 ${field.value === 'color' ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => field.onChange('color')}
                      >
                        لون
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'custom' ? 'default' : 'outline'}
                        className={`flex-1 ${field.value === 'custom' ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => field.onChange('custom')}
                      >
                        نص
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`attributes.${index}.isRequired`}
              render={({ field }) => (
                <FormItem>
                  <Button
                    type="button"
                    variant={field.value ? 'default' : 'outline'}
                    className={`w-full ${field.value ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => field.onChange(!field.value)}
                  >
                    {field.value ? 'إجباري ✓' : 'اختياري'}
                  </Button>
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>القيم</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddValue}
                className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-colors duration-200 rounded-lg border-primary/20"
              >
                <Plus className="h-4 w-4" />
                إضافة قيمة
              </Button>
            </div>
            <div className="space-y-2">
              {form.watch(`attributes.${index}.values`)?.map((_, valueIndex) => (
                <div key={valueIndex} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`attributes.${index}.values.${valueIndex}.label`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="اسم القيمة" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch(`attributes.${index}.type`) === 'color' && (
                    <FormField
                      control={form.control}
                      name={`attributes.${index}.values.${valueIndex}.code`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ColorPicker
                              value={field.value || '#000000'}
                              onChange={field.onChange}
                              onNameChange={(arabicName) => {
                                form.setValue(
                                  `attributes.${index}.values.${valueIndex}.label`,
                                  arabicName
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 transition-colors duration-200 rounded-full"
                    onClick={() => onRemoveValue(valueIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
