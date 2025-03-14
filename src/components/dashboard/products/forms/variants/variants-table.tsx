'use client';

import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberInput } from '@/components/ui/number-input';
import { ImageUpload } from '@/components/dashboard/image-upload';
import Image from 'next/image';

import type { ProductOptionsFormValues } from '../variants-form';

interface VariantsTableProps {
  form: UseFormReturn<ProductOptionsFormValues>;
  variants: any[];
  onRemoveVariant?: (index: number) => void;
}

const handleImageChange = async (file: File, index: number, form: UseFormReturn<ProductOptionsFormValues>) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'products/variants');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    form.setValue(`variants.${index}.image`, {
      url: data.url,
      alt: `صورة المتغير ${index + 1}`
    });
  } catch (error) {
    console.error('Error uploading variant image:', error);
  }
};

export function VariantsTable({ form, variants, onRemoveVariant }: VariantsTableProps) {
  return (
    <div className="relative w-full overflow-auto">
      <div style={{ minWidth: '1000px' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: '200px' }}>التوليفة</TableHead>
              <TableHead style={{ width: '120px' }}>السعر</TableHead>
              <TableHead style={{ width: '120px' }}>المخزون</TableHead>
              <TableHead style={{ width: '150px' }}>SKU</TableHead>
              <TableHead style={{ width: '150px' }}>QR Code</TableHead>
              <TableHead style={{ width: '150px' }}>الصورة</TableHead>
              <TableHead style={{ width: '100px' }}>الحالة</TableHead>
              <TableHead style={{ width: '70px' }}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant, index) => (
              <TableRow key={index}>
                <TableCell style={{ width: '200px' }}>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(form.getValues(`variants.${index}.combination`) || {}).map(([attr, value]) => (
                      <Badge key={attr} variant="secondary" className="text-xs">
                        {attr}: {value}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell style={{ width: '120px' }}>
                  <FormField
                    control={form.control}
                    name={`variants.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <NumberInput
                            placeholder="السعر"
                            min={0}
                            step={0.01}
                            value={field.value || 0}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell style={{ width: '120px' }}>
                  <FormField
                    control={form.control}
                    name={`variants.${index}.stock`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <NumberInput
                            placeholder="المخزون"
                            min={0}
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell style={{ width: '150px' }}>
                  <div className="text-sm font-mono">
                    {form.getValues(`variants.${index}.sku`) || 'يتم التوليد تلقائياً'}
                  </div>
                </TableCell>
                <TableCell style={{ width: '150px' }}>
                  {form.getValues(`variants.${index}.qrCode`) && (
                    <div className="relative w-20 h-20">
                      <Image 
                        src={form.getValues(`variants.${index}.qrCode`) || ''}
                        alt={`QR Code للمتغير ${index + 1}`}
                        className="object-contain"
                        fill
                        sizes="(max-width: 80px) 100vw, 80px"
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell style={{ width: '150px' }}>
                  <FormField
                    control={form.control}
                    name={`variants.${index}.image`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload
                            image={field.value?.url || null}
                            onImageChange={(file) => { if (!file) return; handleImageChange(file, index, form); }}
                            onImageRemove={() => {
                              form.setValue(`variants.${index}.image`, undefined);
                              return Promise.resolve();
                            }}
                            width="w-24"
                            height="h-24"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell style={{ width: '100px' }}>
                  <FormField
                    control={form.control}
                    name={`variants.${index}.isActive`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell style={{ width: '70px' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => onRemoveVariant?.(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}