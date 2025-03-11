'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = 'اضغط Enter لإضافة كلمة مفتاحية',
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleWrapperClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 p-2 border rounded-md min-h-[2.5rem] focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
      onClick={handleWrapperClick}
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="ml-1"
        >
          {tag}
          <button
            type="button"
            className="ml-1 hover:bg-muted rounded-full"
            onClick={() => removeTag(tag)}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
        placeholder={value.length === 0 ? placeholder : ''}
      />
    </div>
  );
}
