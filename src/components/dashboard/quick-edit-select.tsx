'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

interface QuickEditSelectProps {
  value: string;
  options: Option[];
  onValueChange: (value: string) => Promise<void> | void;
  displayValue?: (value: string) => string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  width?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

export function QuickEditSelect({
  value,
  options,
  onValueChange,
  displayValue,
  className,
  placeholder = 'اختر...',
  disabled = false,
  error,
  required = false,
  side = 'bottom',
  align = 'start',
  width = '120px',
  onOpen,
  onClose,
}: QuickEditSelectProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleValueChange = async (newValue: string) => {
    if (newValue === value) return;

    try {
      setIsLoading(true);
      await onValueChange(newValue);
    } catch (error: any) {
      console.error('Error updating value:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOption = options.find(option => option.value === value);
  const displayText = typeof displayValue === 'function' 
    ? displayValue(value) 
    : selectedOption?.label || placeholder;

  return (
    <div className="relative">
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
        required={required}
        onOpenChange={(open) => {
          if (open && onOpen) onOpen();
          if (!open && onClose) onClose();
        }}
      >
        <SelectTrigger 
          className={cn(
            "relative min-w-[120px] border-none",
            error && "border-destructive",
            isLoading && "opacity-70",
            className
          )}
          style={{ width }}
        >
          <SelectValue placeholder={placeholder}>
            {displayText}
          </SelectValue>
          {isLoading && (
            <Loader2 className="absolute left-2 h-4 w-4 animate-spin" />
          )}
        </SelectTrigger>
        <SelectContent side={side} align={align}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
