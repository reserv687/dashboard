'use client';

import { useState, useEffect } from 'react';
import { ChromePicker, ColorResult } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { findNearestColorName } from '@/lib/colors';

interface ColorPickerProps {
  value?: string;
  onChange: (value: string) => void;
  onNameChange?: (name: string) => void;
}

export function ColorPicker({ value = '#000000', onChange, onNameChange }: ColorPickerProps) {
  const [color, setColor] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  // تحديث اللون عندما يتغير value من الخارج
  useEffect(() => {
    setColor(value);
  }, [value]);

  const handleChange = (colorResult: ColorResult) => {
    const newColor = colorResult.hex;
    setColor(newColor);
    onChange(newColor);
    
    // إذا تم توفير onNameChange، نقوم بإرسال اسم اللون باللغة العربية
    if (onNameChange) {
      const arabicName = findNearestColorName(newColor);
      onNameChange(arabicName);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-[100px] p-1 h-10 relative",
            !color && "text-muted-foreground"
          )}
        >
          <div
            className="w-full h-full rounded"
            style={{ backgroundColor: color }}
          />
          {color && (
            <div className="absolute bottom-[-20px] left-0 right-0 text-xs text-muted-foreground">
              {color.toUpperCase()}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <ChromePicker
          color={color}
          onChange={handleChange}
          disableAlpha={true}
          styles={{
            default: {
              picker: {
                boxShadow: 'none',
                width: '225px'
              }
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
