'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface QuickEditInputProps {
  value: string | number | null | undefined;
  onSubmit: (value: string | number) => Promise<void> | void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function QuickEditInput({
  value,
  onSubmit,
  className,
  placeholder,
  disabled = false,
}: QuickEditInputProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<{ value: string }>(
    {
      resolver: zodResolver(z.object({ value: z.string() })),
      defaultValues: { value: value !== null && value !== undefined ? value.toString() : '' },
    }
  );

  const handleSubmit = async (values: { value: string }) => {
    if (values.value === value?.toString()) {
      setOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      await onSubmit(values.value);
      setOpen(false);
    } catch (error: any) {
      // Handle error by displaying it in the form
      form.setError('value', { message: error.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px- text-start font-normal border",
            "min-w-[5ch] max-w-[25ch] truncate", // يتحرك بين 4ch و 25ch
            isLoading && "opacity-50 cursor-not-allowed",
            className
          )}
          
          disabled={disabled || isLoading}
          style={{ width: 'auto' }}
        >
          <span className="truncate">{value || placeholder || 'غير محدد'}</span>
          {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[10ch] max-w-[40ch]">
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2">
            <Controller
              control={form.control}
              name="value"
              render={({ field, fieldState: { error } }) => (
                <Input
                  {...field}
                  type="text"
                  placeholder={placeholder}
                  disabled={isLoading}
                  className={cn(error && "border-destructive")}
                />
              )}
            />
            {form.formState.errors.value && (
              <p className="text-xs text-destructive">
                {form.formState.errors.value.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                حفظ
              </Button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}