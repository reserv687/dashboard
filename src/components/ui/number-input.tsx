'use client';

import { Plus, Minus } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: number) => void;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({
  className,
  onValueChange,
  value,
  min = 0,
  max,
  step = 1,
  ...props
}: NumberInputProps) {
  const handleChange = (newValue: number) => {
    if (max !== undefined && newValue > max) {
      newValue = max;
    }
    if (min !== undefined && newValue < min) {
      newValue = min;
    }
    onValueChange?.(newValue);
  };

  return (
    <div className="flex items-center space-x-1 rtl:space-x-reverse">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => {
          const currentValue = Number(value) || 0;
          handleChange(Math.max(min, currentValue - step));
        }}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        className={cn(
          "h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        min={min}
        max={max}
        step={step}
        {...props}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => {
          const currentValue = Number(value) || 0;
          handleChange(currentValue + step);
        }}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
