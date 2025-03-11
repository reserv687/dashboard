'use client';

import * as React from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'حدد خيارات...',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const removeValue = (valueToRemove: string) => {
    const newSelected = selected.filter((value) => value !== valueToRemove);
    onChange(newSelected);
  };

  const addValue = (valueToAdd: string) => {
    const newSelected = [...selected, valueToAdd];
    onChange(newSelected);
  };

  const toggleValue = (value: string) => {
    const isSelected = selected.includes(value);
    if (isSelected) {
      removeValue(value);
    } else {
      addValue(value);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selected.map((value) => {
              const option = options.find((opt) => opt.value === value);
              if (!option) return null;
              return (
                <Badge
                  key={value}
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(value);
                  }}
                >
                  {option.label}
                  <button
                    className="mr-1 rounded-full outline-none hover:bg-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(value);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" side="bottom" align="start">
        <Command>
          <CommandInput placeholder="ابحث..." />
          <CommandEmpty>لم يتم العثور على نتائج</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    toggleValue(option.value);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-sm border',
                        isSelected ? 'bg-primary border-primary' : 'border-input'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span>{option.label}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
